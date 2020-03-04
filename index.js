const espree = require('espree');
const path = require('path');

const defaultOptions = {
	addExtension: 'js',
	customResolver: null,
	ecmaVersion: 6,
	aliases: {}
};

const isLocalPath = (filename) =>
	filename.startsWith('./') ||
	filename.startsWith('../') ||
	filename.startsWith('/');

const hasExtension = (filename, extension) => filename.endsWith('.' + extension);

// This is copypasted from karma middleware
const filePathToUrlPath = (filePath, basePath, urlRoot, proxyPath) => {
	if (filePath.startsWith(basePath)) {
		return proxyPath + urlRoot.substr(1) + 'base' + filePath.substr(basePath.length)
	}
	return proxyPath + urlRoot.substr(1) + 'absolute' + filePath
};

const createModuleResolverPreprocessor = (karmaConfig, args = {}, config = {}, logger, helper) => {
	const log = logger.create('preprocessor:module-resolver');
	const options = helper.merge({}, defaultOptions, args, config);

	// Process longer aliases first to avoid collision with shorter ones
	const sortedAliases = Object.keys(options.aliases).sort().reverse();

	// Normalize path to absolute
	for (const alias of sortedAliases) {
		options.aliases[alias] = path.resolve(karmaConfig.basePath, options.aliases[alias]);
	}

	const resolvePath = (modulePath) => {
		if (options.customResolver) {
			return options.customResolver(modulePath);
		}

		let result = modulePath;

		if (options.addExtension && !hasExtension(modulePath, options.addExtension)) {
			result += '.' + options.addExtension;
		}

		if (!isLocalPath(result)) {
			for (const alias of sortedAliases) {
				if (result.startsWith(alias)) {
					const pathUnderAlias = path.relative(alias, result);
					const absolutePath = path.resolve(options.aliases[alias], pathUnderAlias);
					result = filePathToUrlPath(
						absolutePath,
						karmaConfig.basePath,
						karmaConfig.urlRoot,
						karmaConfig.upstreamProxy ? karmaConfig.upstreamProxy.path : '/'
					)
				}
			}
		}
		return result;
	};

	return (content, file, done) => {
		log.debug('Processing "%s".', file.originalPath);

		let ast = null;
		try {
			ast = espree.parse(content, {
				ecmaVersion: options.ecmaVersion,
				sourceType: 'module'
			});
		} catch (e) {
			log.error('%s\n  at %s', e.message, file.originalPath);
			done(e, null);
			return;
		}

		let patchedContent = content;
		for (const node of ast.body.reverse()) {
			// Imports can only be at top level as per specification
			if (node.type === 'ImportDeclaration' && node.source.type === 'Literal') {
				const resolved = resolvePath(node.source.value)
					.replace(/\\/g, '\\\\'); // Great job, Windows
				if (resolved !== node.source.value) {
					const replacement = node.source.raw.replace(node.source.value, resolved);
					log.debug('Replacing import from "%s" with "%s"', node.source.value, resolved);
					patchedContent =
						patchedContent.slice(0, node.source.start) +
						replacement +
						patchedContent.slice(node.source.end);
				}
			}
		}

		done(patchedContent);
	}
};

createModuleResolverPreprocessor.$inject = ['config', 'args', 'config.moduleResolverPreprocessor', 'logger', 'helper'];

// PUBLISH DI MODULE
module.exports = {
	'preprocessor:module-resolver': ['factory', createModuleResolverPreprocessor]
};

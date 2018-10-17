const espree = require('espree');
const path = require('path');

const defaultOptions = {
	addExtension: 'js',
	customResolver: null,
	aliases: {}
};

const isLocalPath = (filename) =>
	filename.startsWith('./') ||
	filename.startsWith('../') ||
	filename.startsWith('/');

const hasExtension = (filename, extension) => filename.endsWith('.' + extension);

const createModuleResolverPreprocessor = (karmaConfig, args = {}, config = {}, logger, helper) => {
	const log = logger.create('preprocessor:module-resolver');
	const options = helper.merge({}, defaultOptions, args, config);

	// Process longer aliases first to avoid collision with shorter ones
	const sortedAliases = Object.keys(options.aliases).sort().reverse();

	// Normalize path to absolute
	for (const alias of sortedAliases) {
		options.aliases[alias] = path.resolve(karmaConfig.basePath, options.aliases[alias]);
	}

	const resolvePath = (modulePath, file) => {
		if (options.customResolver) {
			return options.customResolver(modulePath, file);
		}

		let result = modulePath;

		if (options.addExtension && !hasExtension(modulePath, options.addExtension)) {
			result += '.' + options.addExtension;
		}

		if (!isLocalPath(result)) {
			for (const alias of sortedAliases) {
				if (result.startsWith(alias)) {
					const pathUnderAlias = path.relative(alias, result);
					const fullImportPath = path.resolve(options.aliases[alias], pathUnderAlias);

					result = path.relative(path.dirname(file.path), fullImportPath);
					if (!isLocalPath(result)) {
						result = './' + result;
					}
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
				sourceType: 'module'
			});
		} catch (e) {
			log.error('%s\\n  at %s', e.message, file.originalPath);
			done(e, null);
			return;
		}

		let patchedContent = content;
		for (const node of ast.body.reverse()) {
			// Imports can only be at top level as per specification
			if (node.type === 'ImportDeclaration' && node.source.type === 'Literal') {
				const resolved = resolvePath(node.source.value, file);
				const replacement = node.source.raw.replace(node.source.value, resolved);
				log.debug('Replacing import from "%s" with "%s"', node.source.value, replacement);
				patchedContent =
					patchedContent.slice(0, node.source.start) +
					replacement +
					patchedContent.slice(node.source.end);
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

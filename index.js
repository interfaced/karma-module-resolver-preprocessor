const createModuleAliasPreprocessor = (args, config = {}, logger, helper) => {
	const log = logger.create('preprocessor:module-alias');
	log.debug('Module alias preprocessor created.');

	return (content, file, done) => {
		log.debug('Processing "%s".', file.originalPath);

		done(content);
	}
};

// PUBLISH DI MODULE
module.exports = {
	'preprocessor:module-alias': ['factory', createModuleAliasPreprocessor]
};

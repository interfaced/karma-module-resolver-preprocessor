const path = require("path");
const { init, parse } = require("es-module-lexer");

const defaultOptions = {
  addExtension: "js",
  customResolver: null,
  resolveNodeModules: false,
  aliases: {},
};

const isLocalPath = (filename) =>
  filename.startsWith("./") ||
  filename.startsWith("../") ||
  filename.startsWith("/");

const hasExtension = (filename, extension) =>
  filename.endsWith("." + extension);

// This is copypasted from karma middleware
const filePathToUrlPath = (filePath, basePath, urlRoot, proxyPath) => {
  if (filePath.startsWith(basePath)) {
    return (
      proxyPath + urlRoot.substr(1) + "base" + filePath.substr(basePath.length)
    );
  }
  return proxyPath + urlRoot.substr(1) + "absolute" + filePath;
};

const createModuleResolverPreprocessor = (
  karmaConfig,
  args = {},
  config = {},
  logger,
  helper
) => {
  const log = logger.create("preprocessor:module-resolver");
  const options = helper.merge({}, defaultOptions, args, config);

  // Process longer aliases first to avoid collision with shorter ones
  const sortedAliases = Object.keys(options.aliases).sort().reverse();

  // Normalize path to absolute
  for (const alias of sortedAliases) {
    options.aliases[alias] = path.resolve(
      karmaConfig.basePath,
      options.aliases[alias]
    );
  }

  const resolvePath = (modulePath) => {
    if (options.customResolver) {
      return options.customResolver(modulePath);
    }

    let result = modulePath;

    if (!isLocalPath(result)) {
      if (options.resolveNodeModules) {
        const absolutePath = require.resolve(result);

        result = filePathToUrlPath(
          absolutePath,
          karmaConfig.basePath,
          karmaConfig.urlRoot,
          karmaConfig.upstreamProxy ? karmaConfig.upstreamProxy.path : "/"
        );
      } else {
        for (const alias of sortedAliases) {
          if (result.startsWith(alias)) {
            const pathUnderAlias = path.relative(alias, result);
            const absolutePath = path.resolve(
              options.aliases[alias],
              pathUnderAlias
            );
            result = filePathToUrlPath(
              absolutePath,
              karmaConfig.basePath,
              karmaConfig.urlRoot,
              karmaConfig.upstreamProxy ? karmaConfig.upstreamProxy.path : "/"
            );
          }
        }
      }
    }

    if (
      options.addExtension &&
      !hasExtension(modulePath, options.addExtension)
    ) {
      result += "." + options.addExtension;
    }
    return result;
  };

  return async (content, file, done) => {
    await init;
    log.debug('Processing "%s".', file.originalPath);
    try {
      const [imports, exports] = parse(content);
      let pointer = 0;
      const patchedContent = imports.map(({ s, e }) => {
        const name = content.substring(s, e);
        const resolved = resolvePath(name).replace(/\\/g, "\\\\"); // Great job, Windows
        const text = content.slice(pointer, s) + resolved;
        pointer = e;
        return text;
      });
      patchedContent.push(content.slice(pointer, content.length));
      done(patchedContent.join(""));
    } catch (e) {
      log.error("%s\n  at %s", e.message, file.originalPath);
      done(e, null);
      return;
    }
  };
};

createModuleResolverPreprocessor.$inject = [
  "config",
  "args",
  "config.moduleResolverPreprocessor",
  "logger",
  "helper",
];

// PUBLISH DI MODULE
module.exports = {
  "preprocessor:module-resolver": ["factory", createModuleResolverPreprocessor],
};

const path = require("path");
const { parse } = require("@babel/parser");
const { default: traverse } = require("@babel/traverse");
const {
  isImportDeclaration,
  isStringLiteral,
  isImport,
  isExportNamedDeclaration,
  isExportAllDeclaration,
} = require("@babel/types");

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

  return (content, file, done) => {
    log.debug('Processing "%s".', file.originalPath);

    try {
      const ast = parse(content, {
        sourceType: "module",
        plugins: ["dynamicImport", "exportNamespaceFrom"],
      });

      let patchedContent = [];
      let pointer = 0;
      traverse(ast, {
        enter(path) {
          const node = path.node;
          if (
            isStringLiteral(node) &&
            (isImport(path.parent.callee) ||
              isImportDeclaration(path.parent) ||
              isExportNamedDeclaration(path.parent) ||
              isExportAllDeclaration(path.parent))
          ) {
            const resolved = resolvePath(node.value).replace(/\\/g, "\\\\"); // Great job, Windows
            if (resolved !== node.value) {
              log.debug(
                'Replacing import from "%s" with "%s"',
                node.value,
                resolved
              );
              patchedContent.push(
                content.slice(pointer, node.start + 1) + resolved
              );
              pointer = node.end - 1;
            }
          }
        },
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

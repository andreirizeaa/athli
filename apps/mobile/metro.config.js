const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true;

// 4. Fix resolution for packages with nested node_modules that
//    disableHierarchicalLookup prevents Metro from finding.
//    markdown-it requires entities@~2.0 (nested) but entities@4.x is hoisted.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.startsWith('entities') &&
    context.originModulePath.includes('markdown-it')
  ) {
    const nestedEntities = path.resolve(
      workspaceRoot,
      'node_modules/markdown-it/node_modules',
    );
    return context.resolveRequest(
      {
        ...context,
        resolveRequest: undefined,
        nodeModulesPaths: [nestedEntities, ...context.nodeModulesPaths],
      },
      moduleName,
      platform,
    );
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

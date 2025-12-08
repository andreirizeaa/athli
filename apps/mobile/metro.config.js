const path = require('path');

// Force require to use mobile's node_modules for expo packages
const projectRoot = __dirname;
const mobileNodeModules = path.resolve(projectRoot, 'node_modules');
const monorepoRoot = path.resolve(projectRoot, '../..');

// Explicitly require from mobile's node_modules to avoid hoisting issues
const { getDefaultConfig } = require(path.join(mobileNodeModules, 'expo/metro-config'));

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo (include Expo's defaults)
config.watchFolders = [
  ...config.watchFolders || [],
  monorepoRoot,
];

// 2. Let Metro know where to resolve packages and in what order
// Mobile's node_modules takes priority
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Ensure the correct project root is used for resolution
config.projectRoot = projectRoot;

// 4. Force certain packages to resolve from mobile's node_modules
// This prevents issues with hoisted packages in the monorepo
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'expo': path.resolve(projectRoot, 'node_modules/expo'),
  '@react-native/js-polyfills': path.resolve(projectRoot, 'node_modules/@react-native/js-polyfills'),
};

// 5. Disable hierarchical lookup for React Native packages
// This ensures packages are resolved from the specified paths
config.resolver.disableHierarchicalLookup = true;

module.exports = config;

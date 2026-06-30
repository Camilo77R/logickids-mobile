const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const threeModulePath = path.resolve(
  __dirname,
  'node_modules',
  'three',
  'build',
  'three.module.js',
);
const previousResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return {
      filePath: threeModulePath,
      type: 'sourceFile',
    };
  }

  if (typeof previousResolveRequest === 'function') {
    return previousResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'obj',
  'mtl',
  'gltf',
  'glb',
];

module.exports = config;

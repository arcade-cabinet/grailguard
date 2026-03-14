const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Support 3D assets and textures
const newAssetExts = ['glsl', 'glb', 'gltf'];
for (const ext of newAssetExts) {
  if (!config.resolver.assetExts.includes(ext)) {
    config.resolver.assetExts.push(ext);
  }
}
config.resolver.sourceExts.push('glsl');

// expo-sqlite: treat .wasm as asset (not source)
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}
config.resolver.sourceExts = (config.resolver.sourceExts || []).filter((ext) => ext !== 'wasm');

// Apply NativeWind v4.1
const finalConfig = withNativeWind(config, { input: './global.css', inlineRem: 16 });

// Tone.js ESM: redirect tslib to CJS build (Metro can't handle ESM wrapper)
const tslibCJS = path.resolve(__dirname, 'node_modules/tslib/tslib.js');
const _nativeWindResolveRequest = finalConfig.resolver.resolveRequest;
finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return { filePath: tslibCJS, type: 'sourceFile' };
  }
  if (_nativeWindResolveRequest) {
    return _nativeWindResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = finalConfig;

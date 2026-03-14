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

// expo-sqlite native: treat .wasm as asset (still needed for sqlite WASM worker)
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}
config.resolver.sourceExts = (config.resolver.sourceExts || []).filter((ext) => ext !== 'wasm');

// Apply NativeWind first
const finalConfig = withNativeWind(config, { input: './global.css' });

// Custom resolver chain: three → three/webgpu, tslib → CJS build
const tslibCJS = path.resolve(__dirname, 'node_modules/tslib/tslib.js');
const _nativeWindResolveRequest = finalConfig.resolver.resolveRequest;
finalConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  // Three.js WebGPU: resolve 'three' to the WebGPU build (Metal on iOS, Vulkan on Android)
  if (moduleName === 'three') {
    return context.resolveRequest(context, 'three/webgpu', platform);
  }
  // Tone.js ESM: redirect tslib to CJS build (Metro can't handle ESM wrapper)
  if (moduleName === 'tslib') {
    return { filePath: tslibCJS, type: 'sourceFile' };
  }
  if (_nativeWindResolveRequest) {
    return _nativeWindResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = finalConfig;

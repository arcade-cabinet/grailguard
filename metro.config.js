const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Support 3D assets and textures
const newAssetExts = ['glsl', 'glb', 'gltf'];
newAssetExts.forEach(ext => {
  if (!config.resolver.assetExts.includes(ext)) {
    config.resolver.assetExts.push(ext);
  }
});
config.resolver.sourceExts.push('glsl');

// expo-sqlite web support: treat .wasm as an asset (not source)
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}
config.resolver.sourceExts = (config.resolver.sourceExts || []).filter(ext => ext !== 'wasm');

// COEP/COOP headers for dev server — enables SharedArrayBuffer for expo-sqlite web
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

// Apply NativeWind, then fix tslib resolution for Tone.js ESM compatibility
const finalConfig = withNativeWind(config, { input: './global.css' });

// Tone.js ESM build imports tslib which Metro resolves to the ESM wrapper.
// Metro's CJS runner can't destructure from that wrapper. Redirect to CJS build.
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

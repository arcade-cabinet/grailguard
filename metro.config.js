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

module.exports = withNativeWind(config, { input: './global.css' });
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Support 3D assets and textures
config.resolver.assetExts.push('glsl', 'glb', 'gltf', 'png', 'jpg');
config.resolver.sourceExts.push('glsl');

module.exports = withNativeWind(config, { input: './global.css' });

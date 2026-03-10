const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Support .glsl shader files
config.resolver.assetExts.push('glsl');
config.resolver.sourceExts.push('glsl');

module.exports = withNativeWind(config, { input: './global.css' });

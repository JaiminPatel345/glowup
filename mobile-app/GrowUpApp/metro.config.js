const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectConfig = getDefaultConfig(__dirname);

module.exports = withNativeWind(projectConfig, {
  input: './global.css',
});
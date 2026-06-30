// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// withNativeWind compiles `global.css` through Tailwind so that className
// utilities resolve to real styles on every platform (web especially).
module.exports = withNativeWind(config, { input: './global.css' });

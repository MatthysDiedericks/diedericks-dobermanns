const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Shared application field-tier list lives in the website repo — one list, never a copy.
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.resolve(__dirname, '../diedericksdobermann-web/src/lib/applications'),
];

// withNativeWind compiles `global.css` through Tailwind so that className
// utilities resolve to real styles on every platform (web especially).
module.exports = withNativeWind(config, { input: './global.css' });

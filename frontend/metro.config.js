const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// 1. Get the base Expo config
const config = getDefaultConfig(__dirname);

// 2. Setup the SVG Transformer logic
const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer/expo'),
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
};

// 3. Wrap with NativeWind
const mergedConfig = withNativeWind(config, { input: './global.css' });

// 4. Add your custom tslib resolution fix
const TSLIB_CJS = path.resolve(__dirname, 'node_modules/tslib/tslib.js');
const priorResolve = mergedConfig.resolver.resolveRequest;

mergedConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return { type: 'sourceFile', filePath: TSLIB_CJS };
  }
  if (priorResolve) {
    return priorResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = mergedConfig;
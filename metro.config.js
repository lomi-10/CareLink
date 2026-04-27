const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// Metro can resolve tslib to an ESM build where `import tslib from "tslib"` has no
// default export, causing: Cannot destructure property '__extends' of 'tslib.default' as it is undefined.
// Force the classic CommonJS entry so `__importDefault` / interop works.
const TSLIB_CJS = path.resolve(__dirname, 'node_modules/tslib/tslib.js');

const config = getDefaultConfig(__dirname);

const merged = withNativeWind(config, { input: './global.css' });
merged.resolver = merged.resolver || {};

const priorResolve = merged.resolver.resolveRequest;
merged.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return { type: 'sourceFile', filePath: TSLIB_CJS };
  }
  if (priorResolve) {
    return priorResolve(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = merged;

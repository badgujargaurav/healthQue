const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  config.resolve = config.resolve || {};
  config.resolve.alias = {
    ...(config.resolve.alias || {}),
    // shim the assets-registry import used by some react-native packages
    '@react-native/assets-registry/registry': path.resolve(__dirname, 'src', 'web-shims', 'assets-registry.js'),
  };
  return config;
};

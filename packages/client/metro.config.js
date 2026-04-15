const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// ✅ חדש: mock ל-WebRTC כדי שיעבוד ב-Expo Go
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-webrtc') {
    return {
      filePath: path.resolve(projectRoot, 'src/mocks/webrtc.mock.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

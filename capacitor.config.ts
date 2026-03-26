import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chessmaster.app',
  appName: 'ChessMaster',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
  android: {
    buildOptions: {
      releaseType: 'APK',
    },
  },
};

export default config;

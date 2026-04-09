import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chessmaster.app',
  appName: 'ChessMaster',
  webDir: 'dist',
  server: {
    hostname: 'chessmaster.live',
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    buildOptions: {
      releaseType: 'APK',
    },
  },
};

export default config;

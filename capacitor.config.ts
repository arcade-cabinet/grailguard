import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arcadecabinet.grailguard',
  appName: 'Grailguard',
  webDir: 'dist',
  ios: {
    minVersion: '16.0',
  },
  server: {
    // Allow loading local assets
    allowNavigation: ['*'],
  },
};

export default config;

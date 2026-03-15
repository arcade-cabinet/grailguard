import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arcadecabinet.grailguard',
  appName: 'Grailguard',
  webDir: 'dist',
  ios: {
    minVersion: '16.0',
  },
  server: {
    // Restrict navigation to local assets only
    allowNavigation: [],
  },
};

export default config;

import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Redirect expo/react-native imports to empty stubs for web builds
      'expo-gl': path.resolve(__dirname, 'src/stubs/empty.ts'),
      'expo-asset': path.resolve(__dirname, 'src/stubs/empty.ts'),
      'expo-file-system': path.resolve(__dirname, 'src/stubs/empty.ts'),
      'react-native': path.resolve(__dirname, 'src/stubs/react-native.ts'),
    },
  },
  server: { port: 5173 },
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
  optimizeDeps: {
    exclude: ['expo-gl', 'expo-asset', 'expo-file-system'],
  },
});

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode, command }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  if (command === 'build') {
    const required = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID', 'VITE_APP_ID'];
    const missing = required.filter(key => !env[key]?.trim());
    if (missing.length) throw new Error('Configurer votre Firebase avant de construire : ' + missing.join(', '));
  }
  return {
    base: '/intranuit/',
    plugins: [react()],
    define: {
      'import.meta.env.VITE_ORIGINAL_INSTANCE': 'false',
      'import.meta.env.VITE_USE_EMULATORS': 'false',
    },
  };
});

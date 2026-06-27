import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jetnote.pos',
  appName: 'JetNote Pos',
  webDir: 'public', // Diperlukan, meskipun tidak akan digunakan karena server.url
  server: {
    url: 'https://megan-pos.vercel.app',
    cleartext: false // Karena Vercel menggunakan HTTPS, ini aman
  }
};

export default config;
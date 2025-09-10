import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f77142dc9c8d4a05bf7085bc2f54d413',
  appName: 'domcast-inventory',
  webDir: 'dist',
  server: {
    url: 'https://f77142dc-9c8d-4a05-bf70-85bc2f54d413.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1e1b4b',
      showSpinner: false
    }
  }
};

export default config;
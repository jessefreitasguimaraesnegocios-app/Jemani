import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.jemani.executivemobility',
  appName: 'Jemani',
  webDir: 'dist',
  android: {
    backgroundColor: '#f5f3ed',
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
    },
  },
  ios: {
    backgroundColor: '#f5f3ed',
    contentInset: 'automatic',
  },
}

export default config

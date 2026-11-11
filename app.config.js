module.exports = {
  expo: {
    name: 'SpeseProfit', slug: 'speseprofit', version: '0.1.0',
    icon: './assets/branding/icon.png',
    splash: { image: './assets/branding/icon.png', resizeMode: 'contain', backgroundColor: '#101C27' },
    scheme: 'speseprofit', orientation: 'portrait', userInterfaceStyle: 'dark',
    android: {
      package: 'it.speseprofit.personal', versionCode: 7, allowBackup: false, permissions: [],
      adaptiveIcon: {
        foregroundImage: './assets/branding/adaptive-foreground.png',
        monochromeImage: './assets/branding/adaptive-monochrome.png',
        backgroundColor: '#182735',
      },
      blockedPermissions: [
        'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.READ_MEDIA_IMAGES', 'android.permission.READ_MEDIA_VIDEO',
        'android.permission.READ_MEDIA_AUDIO',
      ],
    },
    plugins: ['expo-router', './plugins/withPrivacy', './plugins/withAndroidStudio', './plugins/withDesign'],
    updates: { enabled: false },
    extra: { appMode: 'manual' },
  },
};



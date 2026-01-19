export default ({ config }) => {
  const env = process.env.APP_ENV ?? 'development';

  const isProd = env === 'production';
  const isPreview = env === 'preview';

  return {
    ...config,

    name: isProd
      ? 'Alexperto Checklist'
      : isPreview
        ? 'Alexperto Checklist (Preview)'
        : 'Alexperto Checklist (Dev)',

    slug: 'alexpertochecklistapp',

    version: '1.0.10',
    orientation: 'portrait',

    icon: './assets/images/icon.png',
    scheme: 'alexpertochecklistapp',

    userInterfaceStyle: 'automatic',
    newArchEnabled: true,

    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,

      package: isProd
        ? 'pe.rems.alexpertochecklistapp'
        : isPreview
          ? 'pe.rems.alexpertochecklistapp.preview'
          : 'pe.rems.alexpertochecklistapp.dev',
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: isProd
        ? 'pe.rems.alexpertochecklistapp'
        : isPreview
          ? 'pe.rems.alexpertochecklistapp.preview'
          : 'pe.rems.alexpertochecklistapp.dev',
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
      },
    },

    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },

    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      'expo-secure-store',
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            minSdkVersion: 24,
            usesCleartextTraffic: true,
          },
        },
      ],
      'expo-web-browser',
      'expo-sqlite',
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      router: {},
      eas: {
        projectId: 'c940c4bd-e767-4ae5-8d78-9fb4443602a1',
      },
    },

    owner: 'remsperu',
  };
};

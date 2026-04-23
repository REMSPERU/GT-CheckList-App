export default ({ config }) => {
  const env = process.env.APP_ENV ?? 'development';

  const isProd = env === 'production';
  const isPreview = env === 'preview';

  return {
    ...config,

    name: isProd ? 'GEMA' : isPreview ? 'GEMA (Preview)' : 'GEMA (Dev)',

    slug: 'gema',

    version: '1.0.58',
    orientation: 'portrait',

    icon: './assets/images/icon.png',
    scheme: 'gema',

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
        ? 'pe.rems.gema'
        : isPreview
          ? 'pe.rems.gema.preview'
          : 'pe.rems.gema.dev',
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
      // Sentry: uploads source maps on EAS build and configures the native SDK
      // [
      //   '@sentry/react-native/expo',
      //   {
      //     organization: process.env.SENTRY_ORG,
      //     project: process.env.SENTRY_PROJECT,
      //   },
      // ],
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      router: {},
      eas: {
        projectId: 'b24cca70-6ef8-452b-b7ef-fe01ba8a46bb',
      },
    },

    owner: 'remsperu',
  };
};

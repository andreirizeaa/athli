import { ConfigContext, ExpoConfig } from "expo/config";
import packageJson from "./package.json";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local file
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

// EAS project configuration
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID || "";
const PROJECT_SLUG = "athli-mobile";
const OWNER = "athli";

// App production config
const APP_NAME = "Athli";
const BUNDLE_IDENTIFIER = "com.athli.mobile";
const PACKAGE_NAME = "com.athli.mobile";
const ICON = "./assets/images/icon.png";
const ADAPTIVE_ICON = "./assets/images/adaptive-icon.png";
const SCHEME = "athlimobile";

// Get Google URL scheme from environment variables
const GOOGLE_IOS_URL_SCHEME = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS_SCHEME || "";

// Dynamically configure the app based on the environment.
function getDynamicAppConfig(environment: string) {
  if (environment === "production") {
    return {
      name: APP_NAME,
      bundleIdentifier: BUNDLE_IDENTIFIER,
      packageName: PACKAGE_NAME,
      icon: ICON,
      adaptiveIcon: ADAPTIVE_ICON,
      scheme: SCHEME,
    };
  }

  if (environment === "preview") {
    return {
      name: `${APP_NAME} Preview`,
      bundleIdentifier: `${BUNDLE_IDENTIFIER}.preview`,
      packageName: `${PACKAGE_NAME}.preview`,
      icon: ICON,
      adaptiveIcon: ADAPTIVE_ICON,
      scheme: `${SCHEME}-preview`,
    };
  }

  // Development
  return {
    name: `${APP_NAME} Dev`,
    bundleIdentifier: `${BUNDLE_IDENTIFIER}.dev`,
    packageName: `${PACKAGE_NAME}.dev`,
    icon: ICON,
    adaptiveIcon: ADAPTIVE_ICON,
    scheme: `${SCHEME}-dev`,
  };
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const env = (process.env.APP_ENV as "development" | "preview" | "production") || "development";
  const { name, bundleIdentifier, icon, adaptiveIcon, packageName, scheme } = getDynamicAppConfig(env);

  return {
    ...config,
    name: name,
    version: packageJson.version,
    slug: PROJECT_SLUG,
    platforms: ["ios", "android"],
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    scheme: scheme,
    ios: {
      supportsTablet: true,
      bundleIdentifier: bundleIdentifier,
      infoPlist: {
        NSCameraUsageDescription: "Allow $(PRODUCT_NAME) to access your camera",
        ITSAppUsesNonExemptEncryption: false,
        CFBundleURLTypes: [
          {
            CFBundleURLName: scheme,
            CFBundleURLSchemes: [scheme]
          },
          ...(GOOGLE_IOS_URL_SCHEME ? [{
            CFBundleURLName: "Google Sign-In",
            CFBundleURLSchemes: [GOOGLE_IOS_URL_SCHEME]
          }] : [])
        ]
      },
      usesAppleSignIn: true,
      icon: "./assets/app-icons/ios.png"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/app-icons/adaptive-icon.png",
        monochromeImage: "./assets/app-icons/adaptive-icon.png",
        backgroundImage: "./assets/app-icons/adaptive-icon.png",
        backgroundColor: "#000000"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: packageName,
      softwareKeyboardLayoutMode: "resize",
      permissions: [
        "android.permission.CAMERA",
        "com.google.android.gms.permission.AD_ID",
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS"
      ],
      googleServicesFile: "./google-services.json"
    },
    androidStatusBar: {
      translucent: true,
      backgroundColor: "#00000000",
      barStyle: "dark-content"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "react-native-vision-camera",
      "expo-notifications",
      "expo-secure-store",
      "expo-tracking-transparency",
      "expo-localization",
      "expo-background-task",
      "expo-mail-composer",
      "expo-updates",
      "expo-apple-authentication",
      ...(GOOGLE_IOS_URL_SCHEME ? [
        [
          "@react-native-google-signin/google-signin",
          {
            iosUrlScheme: GOOGLE_IOS_URL_SCHEME
          }
        ] as [string, any]
      ] : []),
      [
        "expo-build-properties",
        {
          android: {
            softwareKeyboardLayoutMode: "resize"
          },
          ios: {
            deploymentTarget: "15.1"
          }
        }
      ],
      "expo-dynamic-app-icon",
      // Temporarily disabled due to ajv dependency conflict
      // [
      //   "expo-quick-actions",
      //   {
      //     iosActions: [
      //       {
      //         id: "deletion_feedback",
      //         title: "🫨 Deleting Athli?",
      //         subtitle: "Send us feedback before you delete.",
      //         icon: "eyes"
      //       }
      //     ]
      //   }
      // ],
      [
        "expo-audio",
        {
          microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone."
        }
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/app-icons/splash-icon-light.png",
          resizeMode: "contain",
          backgroundColor: "#000000",
          imageWidth: 150,
          dark: {
            image: "./assets/app-icons/splash-icon-dark.png",
            backgroundColor: "#000000"
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    updates: {
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    extra: {
      router: {},
      eas: {
        projectId: EAS_PROJECT_ID
      },
      EXPO_PUBLIC_API_ROUTE: process.env.EXPO_PUBLIC_API_ROUTE,
      EXPO_PUBLIC_WEB_APP_URL: process.env.EXPO_PUBLIC_WEB_APP_URL,
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_KEY: process.env.EXPO_PUBLIC_SUPABASE_KEY,
      EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS,
      EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID,
    },
    owner: OWNER
  };
};


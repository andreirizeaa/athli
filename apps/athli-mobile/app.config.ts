import { ConfigContext, ExpoConfig } from "expo/config";
import { version } from "./package.json";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local file
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

// EAS project configuration
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID || "";
const PROJECT_SLUG = "athli-mobile";
const OWNER = "andreirizea";

// App production config
const APP_NAME = "Athli";
const BUNDLE_IDENTIFIER = "com.athli.mobile";
const PACKAGE_NAME = "com.athli.mobile";
const ICON = "./assets/images/icon.png";
const ADAPTIVE_ICON = "./assets/images/adaptive-icon.png";
const SCHEME = "athlimobile";

// Get Google URL scheme from environment variables
const GOOGLE_IOS_URL_SCHEME = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS_SCHEME || "";

export default ({ config }: ConfigContext): ExpoConfig => {
  const { name, bundleIdentifier, icon, adaptiveIcon, packageName, scheme } =
    getDynamicAppConfig(
      (process.env.APP_ENV as "development" | "preview" | "production") ||
        "development"
    );

  return {
    ...config,
    name: name,
    version,
    slug: PROJECT_SLUG,
    platforms: ["ios", "android"],
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    icon: icon,
    scheme: scheme,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
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
      usesAppleSignIn: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: adaptiveIcon,
        backgroundColor: "#ffffff"
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
      ...(GOOGLE_IOS_URL_SCHEME ? [[
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: GOOGLE_IOS_URL_SCHEME
        }
      ]] : []),
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
      "expo-quick-actions",
      [
        "expo-audio",
        {
          microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone."
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
      }
    },
    owner: OWNER
  };
};

// Dynamically configure the app based on the environment.
export const getDynamicAppConfig = (
  environment: "development" | "preview" | "production"
) => {
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
};

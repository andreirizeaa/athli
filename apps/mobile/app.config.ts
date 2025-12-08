import { ConfigContext, ExpoConfig } from "expo/config";
import { version } from "./package.json";
import 'dotenv/config';

// Replace these with your EAS project ID and project slug.
// You can find them at https://expo.dev/accounts/[account]/projects/[project].
const EAS_PROJECT_ID = "1aa7c6eb-3cf8-4795-95a6-9bc41714904c";
const PROJECT_SLUG = "athli";
const OWNER = "andreirizea";

// App production config
const APP_NAME = "Athli";
const BUNDLE_IDENTIFIER = "com.athli.app";
const PACKAGE_NAME = "com.athli.app";
const ICON = "./assets/appIcons/athli-ios-icon.png";
const ADAPTIVE_ICON = "./assets/appIcons/athli-ios-icon.png";
const SCHEME = "athli";

export default ({ config }: ConfigContext): ExpoConfig => {
  const { name, bundleIdentifier, icon, adaptiveIcon, packageName, scheme } =
    getDynamicAppConfig(
      (process.env.APP_ENV as "development" | "preview" | "production") ||
        "development"
    );

  return {
    ...config,
    name: name,
    version, // Automatically bump your project version with `npm version patch`, `npm version minor` or `npm version major`.
    slug: PROJECT_SLUG, // Must be consistent across all environments.
    platforms: ["ios", "android"], // iPhone-only
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    icon: icon,
    scheme: scheme,
    backgroundColor: "#ffffff",
    splash: {
      image: "./assets/athli-splash.png",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: false, // iPhone-only, no iPad support
      bundleIdentifier: bundleIdentifier,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Athli may request your location to personalize experiences and support features that depend on your current region and also for usage analytics.",
        UIBackgroundModes: [
          "remote-notification",
          "fetch",
          "processing"
        ],
        CFBundleURLTypes: [
          {
            CFBundleURLName: "Google Sign-In",
            CFBundleURLSchemes: [
              process.env.GOOGLE_URL_SCHEME!
            ]
          }
        ],
        NSCameraUsageDescription: "Athli uses the camera to let you record workout videos so you can submit them for lift analysis to receive form feedback.",
        NSPhotoLibraryUsageDescription: "Athli accesses your photo library so you can upload videos for analysis, save videos recorded in the app to your photo library, download videos and for searching features.",
        NSPhotoLibraryAddUsageDescription: "Athli accesses your photo library so you can upload videos for analysis, save videos recorded in the app to your photo library, download videos and for searching features.",
        NSUserTrackingUsageDescription: "We use this to ensure the app works for you and others that download it by reviewing usage logs.",
        ITSAppUsesNonExemptEncryption: false,
        SKIncludeConsumableInAppPurchaseHistory: true
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: adaptiveIcon,
        backgroundColor: "#ffffff",
      },
      package: packageName,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.ACCESS_MEDIA_LOCATION"
      ]
    },
    updates: {
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },
    runtimeVersion: version,
    extra: {
      eas: {
        projectId: EAS_PROJECT_ID,
      },
    },
    web: {
      proxy: "https://formai-service.onrender.com"
    },
    plugins: [
      "expo-mail-composer",
      "expo-video",
      "expo-apple-authentication",
      "expo-notifications",
      "expo-task-manager",
      "react-native-vision-camera",
      [
        "expo-dynamic-app-icon",
        {
          default_icon: {
            image: "./assets/appIcons/athli-ios-icon.png",
            prerendered: true
          },
          black: {
            image: "./assets/appIcons/athli-icon-black.png",
            prerendered: true
          },
          blue: {
            image: "./assets/appIcons/athli-icon-blue.png",
            prerendered: true
          },
          green: {
            image: "./assets/appIcons/athli-icon-green.png",
            prerendered: true
          },
          orange: {
            image: "./assets/appIcons/athli-icon-orange.png",
            prerendered: true
          },
          pink: {
            image: "./assets/appIcons/athli-icon-pink.png",
            prerendered: true
          },
          purple: {
            image: "./assets/appIcons/athli-icon-purple.png",
            prerendered: true
          },
          red: {
            image: "./assets/appIcons/athli-icon-red.png",
            prerendered: true
          },
          yellow: {
            image: "./assets/appIcons/athli-icon-yellow.png",
            prerendered: true
          },
          gradient_1: {
            image: "./assets/appIcons/athli-icon-gradient-1.png",
            prerendered: true
          },
          gradient_2: {
            image: "./assets/appIcons/athli-icon-gradient-2.png",
            prerendered: true
          },
          gradient_3: {
            image: "./assets/appIcons/athli-icon-gradient-3.png",
            prerendered: true
          },
          gradient_4: {
            image: "./assets/appIcons/athli-icon-gradient-4.png",
            prerendered: true
          },
          gradient_5: {
            image: "./assets/appIcons/athli-icon-gradient-5.png",
            prerendered: true
          },
          gradient_6: {
            image: "./assets/appIcons/athli-icon-gradient-6.png",
            prerendered: true
          },
          gradient_7: {
            image: "./assets/appIcons/athli-icon-gradient-7.png",
            prerendered: true
          },
          gradient_8: {
            image: "./assets/appIcons/athli-icon-gradient-8.png",
            prerendered: true
          },
          gradient_9: {
            image: "./assets/appIcons/athli-icon-gradient-9.png",
            prerendered: true
          },
          gradient_10: {
            image: "./assets/appIcons/athli-icon-gradient-10.png",
            prerendered: true
          }
        }
      ],
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 26
          },
          "ios": {
              "deploymentTarget": "16.0"
          }
        }
      ],
      [
        "expo-splash-screen",
        {
          backgroundColor: "#ffffff",
          image: "./assets/athli-splash.png",
          imageWidth: 200
        }
      ],
      [
        "expo-media-library",
        {
          photosPermission: "Athli accesses your photo library so you can upload videos for analysis, save videos recorded in the app to your photo library, download videos and for searching features.",
          savePhotosPermission: "Athli accesses your photo library so you can upload videos for analysis, save videos recorded in the app to your photo library, download videos and for searching features.",
          isAccessMediaLocationEnabled: false,
          granularPermissions: ["video"]
        }
      ],
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: process.env.GOOGLE_URL_SCHEME!
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Athli accesses your photo library so you can upload videos for analysis, save videos recorded in the app to your photo library, download videos and for searching features."
        }
      ],
      "react-native-compressor",
      "expo-background-task",
      [
        "expo-quick-actions",
        {
          iosActions: [
            {
              id: "deletion_feedback",
              title: "Deleting? Tell us why.",
              subtitle: "Send us feedback before you delete.",
              icon: "compose"
            }
          ]
        }
      ]
    ],
    owner: OWNER,
  };
};

// Dynamically configure the app based on the environment.
// Update these placeholders with your actual values.
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
      name: `${APP_NAME}`,
      bundleIdentifier: BUNDLE_IDENTIFIER, // Keep same bundle ID for RevenueCat compatibility
      packageName: PACKAGE_NAME, // Keep same package name for RevenueCat compatibility
      icon: "./assets/appIcons/athli-ios-icon.png", // You can create separate preview icons
      adaptiveIcon: "./assets/appIcons/athli-ios-icon.png", // You can create separate preview icons
      scheme: `${SCHEME}`,
    };
  }

  return {
    name: `${APP_NAME}`,
    bundleIdentifier: BUNDLE_IDENTIFIER, // Keep same bundle ID for RevenueCat compatibility
    packageName: PACKAGE_NAME, // Keep same package name for RevenueCat compatibility
    icon: "./assets/appIcons/athli-ios-icon.png", // You can create separate dev icons
    adaptiveIcon: "./assets/appIcons/athli-ios-icon.png", // You can create separate dev icons
    scheme: `${SCHEME}`,
  };
};

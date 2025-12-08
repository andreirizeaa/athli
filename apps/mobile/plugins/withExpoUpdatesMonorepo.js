const { withDangerousMod, withPodfile } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * Config plugin to fix expo-updates script phase in monorepo setups.
 * 
 * The expo-updates create-updates-resources-ios.sh script uses PROJECT_ROOT
 * which defaults to PROJECT_DIR/../.. but this can fail in monorepos.
 * 
 * This plugin:
 * 1. Sets the PROJECT_ROOT environment variable to the correct path
 * 2. Adds the PROJECT_ROOT to the Podfile post_install hook
 */
const withExpoUpdatesMonorepo = (config) => {
  // First, modify the Podfile to set PROJECT_ROOT correctly
  config = withPodfile(config, (config) => {
    const podfile = config.modResults.contents;
    
    // Check if already patched
    if (podfile.includes("# EXPO_UPDATES_MONOREPO_PATCH")) {
      console.log("[ExpoUpdates Monorepo] Podfile already patched, skipping");
      return config;
    }

    // Add PROJECT_ROOT environment variable at the top of the Podfile
    // This ensures expo-updates scripts can find the correct project root
    const projectRootPatch = `# EXPO_UPDATES_MONOREPO_PATCH
# Set PROJECT_ROOT for expo-updates scripts in monorepo setups
# __dir__ points to ios/, so .. gives us the app root (apps/mobile)
ENV['PROJECT_ROOT'] = File.expand_path('..', __dir__)

`;

    config.modResults.contents = projectRootPatch + podfile;
    console.log("[ExpoUpdates Monorepo] Added PROJECT_ROOT to Podfile");
    
    return config;
  });

  // Also patch the expo-updates script directly to handle monorepo paths better
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      
      // Find the expo-updates package
      const possiblePaths = [
        path.join(projectRoot, "node_modules", "expo-updates"),
        path.join(projectRoot, "..", "..", "node_modules", "expo-updates"),
      ];

      let expoUpdatesPath = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          expoUpdatesPath = p;
          console.log(`[ExpoUpdates Monorepo] Found expo-updates at: ${p}`);
          break;
        }
      }

      if (!expoUpdatesPath) {
        console.log("[ExpoUpdates Monorepo] expo-updates not found, skipping script patch");
        return config;
      }

      const scriptPath = path.join(expoUpdatesPath, "scripts", "create-updates-resources-ios.sh");
      
      if (!fs.existsSync(scriptPath)) {
        console.log("[ExpoUpdates Monorepo] create-updates-resources-ios.sh not found, skipping");
        return config;
      }

      let script = fs.readFileSync(scriptPath, "utf-8");

      // Check if already patched
      if (script.includes("# MONOREPO_PATCH")) {
        console.log("[ExpoUpdates Monorepo] Script already patched, skipping");
        return config;
      }

      // Patch the script to better handle monorepo paths
      // The issue is that PROJECT_DIR/../.. doesn't always resolve correctly
      const originalProjectRoot = 'PROJECT_ROOT=${PROJECT_ROOT:-"$PROJECT_DIR/../.."}';
      const patchedProjectRoot = `# MONOREPO_PATCH: Enhanced path resolution for monorepos
if [ -z "$PROJECT_ROOT" ]; then
  # Try PROJECT_DIR/../.. first (standard path from ios/Pods to app root)
  PROJECT_ROOT="$PROJECT_DIR/../.."
  
  # If that doesn't contain package.json, try finding it
  if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    # Look for app.json or package.json going up the tree
    SEARCH_DIR="$PROJECT_DIR"
    while [ "$SEARCH_DIR" != "/" ]; do
      if [ -f "$SEARCH_DIR/package.json" ] && [ -f "$SEARCH_DIR/app.json" ]; then
        PROJECT_ROOT="$SEARCH_DIR"
        break
      fi
      SEARCH_DIR="$(dirname "$SEARCH_DIR")"
    done
  fi
fi
# Original fallback
PROJECT_ROOT=\${PROJECT_ROOT:-"$PROJECT_DIR/../.."}`;

      if (script.includes(originalProjectRoot)) {
        script = script.replace(originalProjectRoot, patchedProjectRoot);
        fs.writeFileSync(scriptPath, script);
        console.log("[ExpoUpdates Monorepo] Successfully patched create-updates-resources-ios.sh");
      } else {
        console.log("[ExpoUpdates Monorepo] Could not find expected pattern in script");
      }

      return config;
    },
  ]);

  return config;
};

module.exports = withExpoUpdatesMonorepo;

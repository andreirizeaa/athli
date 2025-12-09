const { withDangerousMod } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * Config plugin to fix react-native-vision-camera path resolution in monorepos.
 * 
 * Vision Camera v4 walks up the directory tree looking for node_modules/react-native.
 * In monorepos, vision camera is often in root node_modules while react-native is in
 * the app's local node_modules, causing the resolution to fail.
 * 
 * This plugin patches the vision camera's build.gradle to also check the app's
 * node_modules path.
 */
const withVisionCameraMonorepo = (config) => {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      
      // Find the vision camera package in either local or root node_modules
      const possibleVisionCameraPaths = [
        path.join(projectRoot, "node_modules", "react-native-vision-camera"),
        path.join(projectRoot, "..", "..", "node_modules", "react-native-vision-camera"),
      ];

      let visionCameraPath = null;
      for (const p of possibleVisionCameraPaths) {
        if (fs.existsSync(p)) {
          visionCameraPath = p;
          console.log(`[VisionCamera Monorepo] Found vision camera at: ${p}`);
          break;
        }
      }

      if (!visionCameraPath) {
        console.log("[VisionCamera Monorepo] Vision camera not found, skipping patch");
        return config;
      }

      const buildGradlePath = path.join(visionCameraPath, "android", "build.gradle");
      
      if (!fs.existsSync(buildGradlePath)) {
        console.log("[VisionCamera Monorepo] build.gradle not found, skipping patch");
        return config;
      }

      let buildGradle = fs.readFileSync(buildGradlePath, "utf-8");

      // Check if already patched
      if (buildGradle.includes("PATCHED_BY_EXPO_MONOREPO_PLUGIN")) {
        console.log("[VisionCamera Monorepo] Already patched, skipping");
        return config;
      }

      // Find where react-native actually is
      const localNodeModules = path.join(projectRoot, "node_modules");
      const rootNodeModules = path.join(projectRoot, "..", "..", "node_modules");
      
      let nodeModulesWithReactNative = null;
      if (fs.existsSync(path.join(localNodeModules, "react-native"))) {
        nodeModulesWithReactNative = localNodeModules;
        console.log(`[VisionCamera Monorepo] Found react-native in local node_modules`);
      } else if (fs.existsSync(path.join(rootNodeModules, "react-native"))) {
        nodeModulesWithReactNative = rootNodeModules;
        console.log(`[VisionCamera Monorepo] Found react-native in root node_modules`);
      }

      if (!nodeModulesWithReactNative) {
        console.log("[VisionCamera Monorepo] react-native not found, skipping patch");
        return config;
      }

      // Calculate the path from vision camera's android directory to the node_modules with react-native
      const visionCameraAndroidDir = path.join(visionCameraPath, "android");
      const relativePath = path.relative(visionCameraAndroidDir, nodeModulesWithReactNative);
      
      // Normalize the path for cross-platform compatibility (use forward slashes in Gradle)
      const normalizedRelativePath = relativePath.split(path.sep).join('/');
      
      console.log(`[VisionCamera Monorepo] Relative path from vision camera to node_modules: ${normalizedRelativePath}`);

      // Patch approach: Replace the findNodeModules call with a version that tries our path first
      const originalCall = "def nodeModules = findNodeModules(projectDir)";
      
      // Create a patched version that tries the monorepo path first
      const patchedCall = `// PATCHED_BY_EXPO_MONOREPO_PLUGIN - Monorepo path override
def monorepoNodeModulesPath = new File(projectDir, "${normalizedRelativePath}").getCanonicalPath()
def nodeModules = (new File(monorepoNodeModulesPath).exists() && new File(monorepoNodeModulesPath, "react-native").exists()) ? monorepoNodeModulesPath : findNodeModules(projectDir)`;

      if (buildGradle.includes(originalCall)) {
        buildGradle = buildGradle.replace(originalCall, patchedCall);
        fs.writeFileSync(buildGradlePath, buildGradle);
        console.log("[VisionCamera Monorepo] Successfully patched build.gradle");
      } else {
        console.log("[VisionCamera Monorepo] Could not find expected code pattern to patch");
        console.log("[VisionCamera Monorepo] Looking for alternative patterns...");
        
        // Try to find the pattern with different whitespace
        const altPattern = /def nodeModules\s*=\s*findNodeModules\s*\(\s*projectDir\s*\)/;
        if (altPattern.test(buildGradle)) {
          buildGradle = buildGradle.replace(altPattern, patchedCall);
          fs.writeFileSync(buildGradlePath, buildGradle);
          console.log("[VisionCamera Monorepo] Applied patch with regex match");
        } else {
          console.log("[VisionCamera Monorepo] WARNING: Could not apply patch - build may fail");
        }
      }

      return config;
    },
  ]);
};

module.exports = withVisionCameraMonorepo;

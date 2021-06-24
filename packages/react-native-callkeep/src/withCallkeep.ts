import { ConfigPlugin } from "@expo/config-plugins";

import {
  withInfoPlist,
  AndroidConfig,
  IOSConfig,
  withAndroidManifest,
  withXcodeProject,
} from "@expo/config-plugins";

const withCallkeep: ConfigPlugin = (config) => {
  config = withInfoPlist(config, (config) => {
    if (!Array.isArray(config.modResults.UIBackgroundModes)) {
      config.modResults.UIBackgroundModes = [];
    }

    if (!config.modResults.UIBackgroundModes.includes("voip")) {
      config.modResults.UIBackgroundModes.push("voip");
    }
    return config;
  });

  const path = `"$(SRCROOT)/../node_modules/react-native-callkeep/ios/RNCallKeep"`;
  config = withXcodeProject(config, (config) => {
    // config.modResults.removeFromHeaderSearchPaths(path);
    config.modResults.addToHeaderSearchPaths(path);
    return config;
  });

  config = withXcodeLinkBinaryWithLibraries(config, {
    library: "Intents.framework",
    status: "optional",
  });

  config = withXcodeLinkBinaryWithLibraries(config, {
    library: "CallKit.framework",
  });

  config = AndroidConfig.Permissions.withPermissions(config, [
    "android.permission.BIND_TELECOM_CONNECTION_SERVICE",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.READ_PHONE_STATE",
    "android.permission.CALL_PHONE",
  ]);

  config = withAndroidManifest(config, (config) => {
    // <service
    //   android:name="io.wazo.callkeep.VoiceConnectionService"
    //   android:label="Wazo"
    //   android:permission="android.permission.BIND_TELECOM_CONNECTION_SERVICE"
    //   // Use this to target android >= 11
    //   android:foregroundServiceType="camera|microphone"
    //   // For android < 11
    //   android:foregroundServiceType="phoneCall"
    // >
    //   <intent-filter>
    //     <action android:name="android.telecom.ConnectionService" />
    //   </intent-filter>
    // </service>;

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults
    );

    if (!Array.isArray(app.service)) app.service = [];

    if (
      !app.service.find(
        (item) =>
          item.$["android:name"] ===
          "io.wazo.callkeep.RNCallKeepBackgroundMessagingService"
      )
    ) {
      app.service.push({
        $: {
          "android:name":
            "io.wazo.callkeep.RNCallKeepBackgroundMessagingService",
        },
      });
    }
    // TODO: Update item
    if (
      !app.service.find(
        (item) =>
          item.$["android:name"] === "io.wazo.callkeep.VoiceConnectionService"
      )
    ) {
      app.service.push({
        $: {
          "android:name": "io.wazo.callkeep.VoiceConnectionService",
          // @ts-ignore
          "android:label": "Wazo",
          "android:permission":
            "android.permission.BIND_TELECOM_CONNECTION_SERVICE",
          // Use this to target android >= 11
          // "android:foregroundServiceType": "camera|microphone",
          // For android < 11
          "android:foregroundServiceType": "phoneCall",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "android.telecom.ConnectionService",
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });

  return config;
};

export const withXcodeLinkBinaryWithLibraries: ConfigPlugin<{
  library: string;
  status?: string;
}> = (config, { library, status }) => {
  return withXcodeProject(config, (config) => {
    const options =
      status === "optional" ? { settings: { ATTRIBUTES: ["Weak"] } } : {};

    const target = IOSConfig.XcodeUtils.getApplicationNativeTarget({
      project: config.modResults,
      projectName: config.modRequest.projectName!,
    });
    config.modResults.addFramework(library, {
      target: target.uuid,
      ...options,
    });

    return config;
  });
};

export default withCallkeep;

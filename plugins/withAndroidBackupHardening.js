const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidBackupHardening(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const application = configWithManifest.modResults.manifest.application?.[0];

    if (application?.$) {
      application.$['android:allowBackup'] = 'false';
    }

    return configWithManifest;
  });
};

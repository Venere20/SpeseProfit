const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
module.exports = function withPrivacy(config) {
  config = withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application[0];
    application.$['android:allowBackup'] = 'false';
    application.$['android:fullBackupContent'] = '@xml/speseprofit_backup_rules';
    application.$['android:dataExtractionRules'] = '@xml/speseprofit_data_extraction_rules';
    application.$['android:usesCleartextTraffic'] = 'false';
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    const xmlDir = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    fs.mkdirSync(xmlDir, { recursive: true });
    const releaseDir = path.join(mod.modRequest.platformProjectRoot, 'app/src/release');
    fs.mkdirSync(releaseDir, { recursive: true });
    fs.writeFileSync(path.join(releaseDir, 'AndroidManifest.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">\n  <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove" />\n  <uses-permission android:name="android.permission.VIBRATE" tools:node="remove" />\n</manifest>\n`);
    const exclude = ['root', 'file', 'database', 'sharedpref', 'external', 'device_root', 'device_file', 'device_database', 'device_sharedpref']
      .map(domain => `    <exclude domain="${domain}" path="." />`).join('\n');
    fs.writeFileSync(path.join(xmlDir, 'speseprofit_backup_rules.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<full-backup-content>\n${exclude}\n</full-backup-content>\n`);
    fs.writeFileSync(path.join(xmlDir, 'speseprofit_data_extraction_rules.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n  <cloud-backup>\n${exclude}\n  </cloud-backup>\n  <device-transfer>\n${exclude}\n  </device-transfer>\n</data-extraction-rules>\n`);
    return mod;
  }]);
};

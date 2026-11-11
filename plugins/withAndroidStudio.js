const { withProjectBuildGradle, withAppBuildGradle, withGradleProperties, withMainApplication } = require('expo/config-plugins');

const settings = {
  'org.gradle.jvmargs': '-Xmx1536m -XX:MaxMetaspaceSize=768m',
  'org.gradle.parallel': 'false',
  'org.gradle.workers.max': '1',
  'kotlin.compiler.execution.strategy': 'in-process',
  reactNativeArchitectures: 'arm64-v8a',
};

function append(contents, line) {
  return contents.includes(line) ? contents : `${contents.trimEnd()}\n\n${line}\n`;
}
module.exports = function withAndroidStudio(config) {
  config = withProjectBuildGradle(config, mod => {
    const line = "apply from: '../scripts/android-project.gradle'";
    const contents = mod.modResults.contents.split('\n').filter(row => row.trim() !== line).join('\n');
    // Expo's root plugin can evaluate :app eagerly. Register the profile first.
    const index = contents.indexOf('apply plugin:');
    mod.modResults.contents = index < 0 ? `${line}\n${contents}` : `${contents.slice(0, index)}${line}\n\n${contents.slice(index)}`;
    return mod;
  });
  config = withAppBuildGradle(config, mod => {
    mod.modResults.contents = append(mod.modResults.contents, "apply from: '../../scripts/android-app.gradle'");
    return mod;
  });
  config = withMainApplication(config, mod => {
    const content = mod.modResults.contents;
    if (!content.includes('useDevSupport = BuildConfig.DEBUG')) {
      const anchor = 'context = applicationContext,';
      if (!content.includes(anchor)) throw new Error('React host template changed: configure useDevSupport explicitly.');
      mod.modResults.contents = content.replace(anchor, `${anchor}\n      useDevSupport = BuildConfig.DEBUG,`);
    }
    return mod;
  });
  return withGradleProperties(config, mod => {
    mod.modResults = mod.modResults.filter(entry => entry.type !== 'property' || !Object.hasOwn(settings, entry.key));
    for (const [key, value] of Object.entries(settings)) mod.modResults.push({ type: 'property', key, value });
    return mod;
  });
};


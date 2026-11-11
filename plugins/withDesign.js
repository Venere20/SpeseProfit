const { withAndroidStyles, withAndroidColors } = require('expo/config-plugins');
module.exports = function withDesign(config) {
  config = withAndroidStyles(config, mod => {
    const app = mod.modResults.resources.style?.find(style => style.$.name === 'AppTheme');
    if (app) {
      app.$.parent = 'Theme.AppCompat.NoActionBar';
      app.item = app.item || [];
      const set = (name, value) => { const existing = app.item.find(item => item.$.name === name); if (existing) existing._ = value; else app.item.push({ $: { name }, _: value }); };
      set('colorAccent', '#CDBB98');
      set('android:colorAccent', '#CDBB98');
      set('android:windowBackground', '#101C27');
      set('android:windowLightStatusBar', 'false');
      set('android:windowLightNavigationBar', 'false');
      set('android:navigationBarColor', '#101C27');
    }
    return mod;
  });
  return withAndroidColors(config, mod => {
    for (const [name, value] of [['colorPrimary', '#182735'], ['splashscreen_background', '#101C27']]) {
      const existing = mod.modResults.resources.color?.find(color => color.$.name === name);
      if (existing) existing._ = value;
    }
    return mod;
  });
};

const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const existing = config.resolver.blockList;
const excluded = ['work', 'android', 'ios', 'modules/speseprofit-native/android'];
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Gradle caches and generated APKs are not app sources. Do not crawl/watch them.
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  ...excluded.map(folder => new RegExp(`^${escape(path.resolve(__dirname, folder))}(?:[/\\\\].*)?$`)),
  /[/\\](?:android|ReactAndroid)[/\\](?:build|\.cxx|\.gradle)(?:[/\\].*)?$/,
];
config.maxWorkers = 1;
module.exports = config;

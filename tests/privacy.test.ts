import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
test('plugin applica esclusioni backup e transfer alle risorse generate', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'speseprofit-privacy-'));
  try {
    const plugin = require('../plugins/withPrivacy.js');
    const result = plugin({ name: 'demo', slug: 'demo' });
    const mod = { modRequest: { platformProjectRoot: root }, modResults: {}, mods: {} };
    // Config plugin wraps the action with interception; invoke its public mod handler.
    await result.mods.android.dangerous(mod);
    const base = path.join(root, 'app/src/main/res/xml');
    const rules = fs.readFileSync(path.join(base, 'speseprofit_data_extraction_rules.xml'), 'utf8');
    assert.match(rules, /<cloud-backup>/); assert.match(rules, /<device-transfer>/);
    for (const domain of ['database', 'sharedpref', 'file', 'root']) assert.match(rules, new RegExp(`exclude domain="${domain}"`));
    const release = fs.readFileSync(path.join(root, 'app/src/release/AndroidManifest.xml'), 'utf8');
    assert.match(release, /android.permission.SYSTEM_ALERT_WINDOW" tools:node="remove"/);
    assert.match(release, /android.permission.VIBRATE" tools:node="remove"/);
  } finally {
    const resolved = path.resolve(root);
    if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(resolved).startsWith('speseprofit-privacy-')) throw new Error('Unsafe cleanup target');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
});

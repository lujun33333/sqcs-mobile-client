import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { makeIcon } from './icon.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const target = process.argv[2] || 'all';
if (!['android', 'ios', 'all'].includes(target)) throw new Error('Usage: npm run native -- android|ios|all');
const platforms = target === 'all' ? ['android', 'ios'] : [target];
function cap(...args) {
  const result = spawnSync(process.execPath, [resolve(root, 'node_modules/@capacitor/cli/bin/capacitor'), ...args], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Capacitor ${args.join(' ')} failed`);
}
async function patch(file, edit) {
  const path = resolve(root, file);
  const source = await readFile(path, 'utf8');
  const changed = edit(source);
  if (source !== changed) await writeFile(path, changed);
}
for (const platform of platforms) {
  try { await access(resolve(root, platform)); }
  catch { cap('add', platform); }
  if (platform === 'android') {
    await patch('android/variables.gradle', s => s.replace(/minSdkVersion\s*=\s*\d+/, 'minSdkVersion = 26'));
    await patch('android/app/src/main/AndroidManifest.xml', s => {
      let next = s.includes('android:usesCleartextTraffic=') ? s : s.replace('<application', '<application android:usesCleartextTraffic="true"');
      if (!next.includes('xmlns:tools=')) next = next.replace('<manifest ', '<manifest xmlns:tools="http://schemas.android.com/tools" ');
      for (const permission of ['CAMERA', 'RECORD_AUDIO', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION']) {
        if (!next.includes(`android.permission.${permission}`)) next = next.replace('</manifest>', `    <uses-permission android:name="android.permission.${permission}" tools:node="remove" />\n</manifest>`);
      }
      return next;
    });
    const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
    for (const [density, size] of Object.entries(sizes)) {
      const folder = resolve(root, `android/app/src/main/res/mipmap-${density}`);
      await mkdir(folder, { recursive: true });
      for (const name of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) await writeFile(resolve(folder, name), makeIcon(size));
    }
    for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
      await writeFile(resolve(root, 'android/app/src/main/res/mipmap-anydpi-v26', name), '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/></adaptive-icon>\n');
    }
  } else {
    await patch('ios/App/App/Info.plist', s => s.includes('<key>NSAppTransportSecurity</key>') ? s : s.replace('</dict>\n</plist>', '\t<key>NSAppTransportSecurity</key>\n\t<dict>\n\t\t<key>NSAllowsArbitraryLoadsInWebContent</key>\n\t\t<true/>\n\t\t<key>NSAllowsLocalNetworking</key>\n\t\t<true/>\n\t</dict>\n</dict>\n</plist>'));
    const folder = resolve(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset');
    await writeFile(resolve(folder, 'AppIcon-512@2x.png'), makeIcon(1024));
  }
  cap('sync', platform);
}

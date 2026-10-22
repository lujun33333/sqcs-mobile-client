import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
const skip = new Set(['node_modules', '.git', 'dist', 'artifacts', 'build', '.gradle', '.idea', 'Pods', 'xcuserdata', 'DerivedData', 'public']);
const deny = /(?:\.(?:apk|ipa|p12|p8|mobileprovision|jks|keystore|db|sqlite|pcap|pcapng)$|(?:^|\/)\.env(?:\.|$)|local\.properties$)/i;
const textExtensions = new Set(['.json', '.js', '.mjs', '.java', '.swift', '.html', '.css', '.md', '.yml', '.gradle', '.xml', '.plist', '.sh', '.properties', '.pbxproj']);
const patterns = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /gh[pousr]_[A-Za-z0-9]{25,}/, /github_pat_[A-Za-z0-9_]{30,}/, /https?:\/\/[^\s/"']+:[^\s/"']+@/];
const failures = []; let count = 0;
async function scan(folder, prefix = '') {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isSymbolicLink()) { failures.push(`${name}: symbolic links are not published`); continue; }
    if (entry.isDirectory()) { if (!skip.has(entry.name)) await scan(resolve(folder, entry.name), name + '/'); continue; }
    if (deny.test(name)) { failures.push(`${name}: private or binary input`); continue; }
    const path = resolve(folder, entry.name); const info = await stat(path);
    if (info.size > 3 * 1024 * 1024) { failures.push(`${name}: unexpected large file`); continue; }
    count++;
    if (textExtensions.has(extname(name))) {
      const text = await readFile(path, 'utf8');
      if (patterns.some(pattern => pattern.test(text))) failures.push(`${name}: possible credential`);
    }
  }
}
await scan(root);
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Public source scan passed (${count} files; original game packages, backend and saves are outside this repository).`);

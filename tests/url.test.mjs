import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEntry, readEntry, saveEntry, isLoopback } from '../src/url.mjs';

test('normalizes a persistent HTTP/S login entry without dropping its path', () => {
  assert.equal(normalizeEntry(' https://game.example.com '), 'https://game.example.com/');
  assert.equal(normalizeEntry('http://192.168.1.20:7080/login/'), 'http://192.168.1.20:7080/login/');
  assert.equal(normalizeEntry('https://例子.测试/登录'), 'https://xn--fsqu00a.xn--0zwm56d/%E7%99%BB%E5%BD%95');
});
test('rejects executable schemes, credentials and transient ticket URLs', () => {
  const credentialUrl = new URL('https://game.example.com/');
  credentialUrl.username = 'synthetic-user';
  credentialUrl.password = 'synthetic-password';
  for (const value of ['', 'game.example.com', 'javascript:alert(1)', 'file:///tmp/a', credentialUrl.href, 'https://game.example.com/?token=example', 'https://game.example.com/#token', 'https://game.example.com./']) assert.throws(() => normalizeEntry(value));
});
test('a corrupt saved entry cannot override a valid build default', () => {
  assert.equal(readEntry({ getItem: () => 'javascript:alert(1)' }, 'https://game.example.com/'), 'https://game.example.com/');
});
test('a user selected entry takes precedence over the build default', () => {
  assert.equal(readEntry({ getItem: () => 'https://second.example.com/' }, 'https://game.example.com/'), 'https://second.example.com/');
});
test('storage failures do not prevent entering a validated URL', () => {
  const broken = { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } };
  assert.equal(readEntry(broken), '');
  assert.deepEqual(saveEntry(broken, 'https://game.example.com'), { entry: 'https://game.example.com/', saved: false });
});
test('invalid input is never persisted', () => {
  let writes = 0;
  assert.throws(() => saveEntry({ setItem() { writes++; } }, 'file:///tmp/game'));
  assert.equal(writes, 0);
});
test('recognizes IPv4 and IPv6 loopback without flagging a LAN address', () => {
  for (const value of ['http://localhost:7080/', 'http://127.0.0.2/', 'http://[::1]:7080/']) assert.equal(isLoopback(value), true);
  assert.equal(isLoopback('http://192.168.1.20:7080/'), false);
});

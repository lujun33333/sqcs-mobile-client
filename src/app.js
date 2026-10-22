import { Capacitor } from '@capacitor/core';
import { InAppBrowser, DefaultWebViewOptions } from '@capacitor/inappbrowser';
import { normalizeEntry, readEntry, saveEntry, isLoopback } from './url.mjs';

const input = document.querySelector('#entry-url');
const form = document.querySelector('#entry-form');
const button = document.querySelector('#open-game');
const status = document.querySelector('#status');
const note = document.querySelector('#local-note');
let opening = false;
let edited = false;
let config = { defaultUrl: '', version: '0.1.0' };
let storage;
try { storage = window.localStorage; } catch { /* Private storage is optional. */ }

function report(message, error = false) {
  status.textContent = message;
  status.classList.toggle('error', error);
}

function showLocalNote() {
  try { note.hidden = !isLoopback(normalizeEntry(input.value)); }
  catch { note.hidden = true; }
}

async function enter(event) {
  event.preventDefault();
  if (opening) return;
  let entry;
  try { entry = normalizeEntry(input.value); }
  catch (error) { report(error.message, true); input.focus(); return; }
  opening = true;
  button.disabled = true;
  input.value = entry;
  document.querySelector('.tag').textContent = '已配置';
  showLocalNote();
  const { saved } = saveEntry(storage, entry);
  report(saved ? '正在打开游戏登录页…' : '本机无法保存地址，本次仍可进入游戏。');
  try {
    if (Capacitor.isNativePlatform()) {
      await InAppBrowser.openInWebView({
        url: entry,
        options: {
          ...DefaultWebViewOptions,
          showURL: false,
          closeButtonText: '返回设置',
          clearCache: false,
          clearSessionCache: false,
          mediaPlaybackRequiresUserAction: false,
          android: { ...DefaultWebViewOptions.android, isIsolated: true },
          iOS: { ...DefaultWebViewOptions.iOS, allowOverScroll: false, allowInLineMediaPlayback: true },
        },
      });
      report('游戏窗口已打开。关闭窗口后可在此更换入口。');
    } else {
      window.location.assign(entry);
    }
  } catch {
    report('游戏窗口未能打开，请检查网址后重试。', true);
  } finally {
    opening = false;
    button.disabled = false;
  }
}

form.addEventListener('submit', enter);
input.addEventListener('input', () => { edited = true; showLocalNote(); });
document.querySelector('#forget-entry').addEventListener('click', () => {
  try { storage?.removeItem('sqcs.entry'); } catch { /* Reset the visible field regardless. */ }
  input.value = '';
  edited = true;
  document.querySelector('.tag').textContent = '首次设置';
  showLocalNote();
  report('已清除保存的入口。游戏账号的登录状态由游戏页面管理。');
  input.focus();
});

async function init() {
  try {
    const response = await fetch('./app-config.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('config');
    config = await response.json();
  } catch { report('启动配置未加载，可直接填写网址进入。'); }
  if (!edited) input.value = readEntry(storage, config.defaultUrl);
  document.querySelector('#version').textContent = `v${config.version}`;
  if (input.value) document.querySelector('.tag').textContent = '已配置';
  showLocalNote();
  if (Capacitor.isNativePlatform()) {
    await InAppBrowser.addListener('browserClosed', () => {
      report('已返回。你可以继续进入游戏或更换入口。');
    });
    await InAppBrowser.addListener('browserPageNavigationCompleted', () => {
      report('游戏页面已加载。');
    });
  }
}
init().catch(() => report('填写网址后即可进入游戏。'));

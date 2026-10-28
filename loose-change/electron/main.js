// Loose Change: desktop wrapper for Steam.
// Runs the game in a window and connects to Steam (achievements, cloud saves, screenshots) when Steam is running.
const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

// Steam app id: steam_appid.txt next to the app (480 is Valve's test app until the real one exists)
function appId() {
  for (const p of [path.join(process.resourcesPath || '', 'steam_appid.txt'), path.join(__dirname, '..', 'steam_appid.txt')]) {
    try { return parseInt(fs.readFileSync(p, 'utf8').trim(), 10); } catch (e) { /* try next */ }
  }
  return 480;
}

let steam = null;
try {
  const steamworks = require('steamworks.js');
  steam = steamworks.init(appId());
  steamworks.electronEnableSteamOverlay();
} catch (e) {
  console.log('Steam not available, playing offline:', e.message);
}

const CLOUD_FILE = 'loose-change-save.json';
ipcMain.on('steam:unlock', (e, id) => { try { steam?.achievement.activate(id); } catch (err) { /* unknown achievement */ } });
ipcMain.on('steam:cloudSave', (e, json) => { try { steam?.cloud.writeFile(CLOUD_FILE, json); } catch (err) { /* cloud off */ } });
ipcMain.on('steam:cloudLoad', (e) => { try { e.returnValue = steam?.cloud.isEnabledForApp() && steam.cloud.fileExists(CLOUD_FILE) ? steam.cloud.readFile(CLOUD_FILE) : null; } catch (err) { e.returnValue = null; } });
ipcMain.on('steam:screenshot', () => { try { steam?.screenshots?.triggerScreenshot(); } catch (err) { /* older steamworks.js */ } });
ipcMain.on('steam:available', (e) => { e.returnValue = !!steam; });

function createWindow() {
  const win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 1024, minHeight: 600,
    backgroundColor: '#1d1611',
    title: 'Loose Change',
    icon: path.join(__dirname, 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false, backgroundThrottling: false },
  });
  win.setMenu(null);
  win.loadFile(path.join(__dirname, '..', 'src', 'index.html'));
  // F11 or Alt+Enter toggles fullscreen
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && (input.key === 'F11' || (input.alt && input.key === 'Enter'))) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => globalShortcut.unregisterAll());

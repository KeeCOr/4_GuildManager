const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')

// TODO: Replace 480 with actual Steam App ID before release
const STEAM_APP_ID = 480;
let steam = null;
try {
  steam = require('steamworks.js');
  steam.init(STEAM_APP_ID);
  console.log('[Steam] Initialized, user:', steam.localplayer.getName());
} catch (e) {
  console.warn('[Steam] Not available — game runs without Steam features:', e.message);
}

// ── Steam IPC ──────────────────────────────────────────────────────────────
ipcMain.on('steam:available',   e => { e.returnValue = steam !== null; });
ipcMain.on('steam:getUserName', e => { e.returnValue = steam ? steam.localplayer.getName() : null; });

ipcMain.handle('achievement:unlock', async (_, id) => {
  if (!steam) return false;
  try { steam.achievement.activate(id); return true; }
  catch (e) { console.error('[Achievement] unlock:', e); return false; }
});
ipcMain.on('achievement:isUnlocked', (e, id) => {
  e.returnValue = steam ? steam.achievement.isActivated(id) : false;
});

ipcMain.handle('steamCloud:save', async (_, key, data) => {
  if (!steam) return false;
  try { steam.cloud.writeFile(key, Buffer.from(JSON.stringify(data), 'utf-8')); return true; }
  catch { return false; }
});
ipcMain.handle('steamCloud:load', async (_, key) => {
  if (!steam) return null;
  try { return JSON.parse(steam.cloud.readFile(key).toString('utf-8')); }
  catch { return null; }
});
// ──────────────────────────────────────────────────────────────────────────

let staticServer = null

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

function createStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const rawUrl = decodeURIComponent((req.url || '/').split('?')[0])
      const relative = rawUrl === '/' ? 'index.html' : rawUrl.replace(/^\/+/, '')
      const resolved = path.resolve(rootDir, relative)

      if (!resolved.startsWith(rootDir)) {
        res.writeHead(403)
        res.end('Forbidden')
        return
      }

      fs.readFile(resolved, (error, data) => {
        if (error) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        res.writeHead(200, { 'Content-Type': mimeTypes[path.extname(resolved).toLowerCase()] || 'application/octet-stream' })
        res.end(data)
      })
    })

    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      staticServer = server
      resolve(server.address().port)
    })
  })
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'GuildManager',
    backgroundColor: '#03030a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  const distDir = path.join(__dirname, 'dist')
  const port = await createStaticServer(distDir)
  await win.loadURL(`http://127.0.0.1:${port}/index.html`)
  win.setMenuBarVisibility(false)

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
app.on('before-quit', () => {
  if (staticServer) staticServer.close()
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

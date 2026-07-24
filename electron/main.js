const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')

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
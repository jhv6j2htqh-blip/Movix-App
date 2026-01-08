const { app, BrowserWindow, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const VPNManager = require('./vpn-manager');

let mainWindow;
let vpnManager;

function initVPN() {
  const ovpnFilePath = path.join(__dirname, 'CH-FREE#8.ovpn');
  if (!fs.existsSync(ovpnFilePath)) {
    console.error('❌ Fichier .ovpn non trouvé');
    return;
  }

  vpnManager = new VPNManager(ovpnFilePath);
  vpnManager.connect()
    .then(() => {
      console.log('✅ VPN connecté (macOS)');
    })
    .catch((error) => {
      console.error('❌ Erreur VPN:', error);
    });
}

function getAppIcon() {
  const possiblePaths = [
    path.join(__dirname, 'icon.icns'),
    path.join(__dirname, '..', 'icon.icns'),
    path.join(__dirname, 'build', 'icon.icns'),
    path.join(process.resourcesPath, 'icon.icns'),
    path.join(app.getAppPath(), 'icon.icns')
  ];

  for (const iconPath of possiblePaths) {
    if (fs.existsSync(iconPath)) {
      console.log('✅ Icône trouvée:', iconPath);
      return nativeImage.createFromPath(iconPath);
    }
  }

  console.warn('⚠️ Icône non trouvée, utilisation de l\'icône par défaut');
  return null;
}

function createWindow() {
  const appIcon = getAppIcon();
  
  const windowConfig = {
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#000000',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  };

  if (appIcon) {
    windowConfig.icon = appIcon;
  }

  mainWindow = new BrowserWindow(windowConfig);

  if (appIcon && process.platform === 'darwin') {
    app.dock.setIcon(appIcon);
  }

  mainWindow.loadURL('https://movix.blog');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('✅ Movix démarré sur macOS');
  });

  mainWindow.webContents.on('did-fail-load', () => {
    if (vpnManager) {
      vpnManager.disconnect().then(() => vpnManager.connect())
        .then(() => setTimeout(() => mainWindow.loadURL('https://movix.blog'), 2000));
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  console.log('🚀 Démarrage Movix macOS...');
  initVPN();
  await new Promise(resolve => setTimeout(resolve, 3000));
  createWindow();
});

app.on('window-all-closed', () => {
  if (vpnManager) {
    vpnManager.disconnect();
  }
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', async (event) => {
  if (vpnManager) {
    event.preventDefault();
    await vpnManager.disconnect();
    vpnManager = null;
    app.quit();
  }
});

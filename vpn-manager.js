const { exec, spawn } = require('child_process');
const path = require('path');

class VPNManager {
  constructor(ovpnFilePath) {
    this.ovpnFilePath = ovpnFilePath;
    this.vpnProcess = null;
    this.isConnected = false;
    this.platform = process.platform;
    this.openvpnPath = this.getOpenVPNPath();
    
    console.log('🔍 Chemin OpenVPN:', this.openvpnPath);
  }

  getOpenVPNPath() {
    switch (this.platform) {
      case 'darwin':
        // Mac Intel - chemin détecté
        return '/usr/local/opt/openvpn/sbin/openvpn';
      case 'win32':
        return 'C:\\Program Files\\OpenVPN\\bin\\openvpn.exe';
      case 'linux':
        return '/usr/sbin/openvpn';
      default:
        return 'openvpn';
    }
  }

  async connect() {
    if (this.isConnected) {
      console.log('✓ VPN déjà connecté');
      return;
    }

    console.log('🔄 Connexion au VPN...');

    return new Promise((resolve, reject) => {
      let command, args;

      if (this.platform === 'win32') {
        command = this.openvpnPath;
        args = ['--config', this.ovpnFilePath];
        this.vpnProcess = spawn(command, args, { stdio: 'pipe' });
      } else {
        // Pour Mac et Linux
        command = 'sudo';
        args = [this.openvpnPath, '--config', this.ovpnFilePath, '--daemon'];
        this.vpnProcess = spawn(command, args, { stdio: 'pipe' });
      }

      this.vpnProcess.stdout?.on('data', (data) => {
        console.log('VPN:', data.toString().trim());
      });

      this.vpnProcess.stderr?.on('data', (data) => {
        console.error('VPN erreur:', data.toString().trim());
      });

      this.vpnProcess.on('error', (error) => {
        console.error('❌ Erreur VPN:', error.message);
        reject(error);
      });

      setTimeout(() => {
        this.checkStatus().then((status) => {
          if (status) {
            this.isConnected = true;
            console.log('✅ VPN connecté avec succès');
            resolve();
          } else {
            console.error('❌ Échec connexion VPN');
            reject(new Error('Échec connexion VPN'));
          }
        });
      }, 2000);
    });
  }

  disconnect() {
    return new Promise((resolve) => {
      if (!this.isConnected) {
        console.log('VPN non connecté');
        resolve();
        return;
      }

      console.log('🔌 Déconnexion du VPN...');

      const command = this.platform === 'win32' 
        ? 'taskkill /F /IM openvpn.exe'
        : 'sudo killall openvpn';

      exec(command, (error) => {
        if (error) {
          console.error('Erreur déconnexion:', error.message);
        }
        this.isConnected = false;
        this.vpnProcess = null;
        console.log('✅ VPN déconnecté');
        resolve();
      });
    });
  }

  checkStatus() {
    return new Promise((resolve) => {
      const command = this.platform === 'win32'
        ? 'tasklist /FI "IMAGENAME eq openvpn.exe"'
        : 'pgrep openvpn';

      exec(command, (error, stdout) => {
        const isRunning = !error && stdout.trim().length > 0;
        this.isConnected = isRunning;
        resolve(isRunning);
      });
    });
  }
}

module.exports = VPNManager;

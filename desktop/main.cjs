const {app,BrowserWindow,shell,protocol,net,ipcMain}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {autoUpdater}=require('electron-updater');
for(const name of ['Threadline','threadline-creator-studio']){const legacy=path.join(app.getPath('appData'),name);if(fs.existsSync(legacy)){app.setPath('userData',legacy);break;}}
const {pathToFileURL}=require('node:url');
protocol.registerSchemesAsPrivileged([{scheme:'threadline',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
let updaterWindow=null;
let updaterConfigured=false;
autoUpdater.autoDownload=false;
autoUpdater.autoInstallOnAppQuit=false;
autoUpdater.allowPrerelease=true;
autoUpdater.on('checking-for-update',()=>sendUpdate('checking'));
autoUpdater.on('update-available',info=>sendUpdate('available',{version:info.version,releaseDate:info.releaseDate}));
autoUpdater.on('update-not-available',info=>sendUpdate('current',{version:info.version}));
autoUpdater.on('download-progress',progress=>sendUpdate('progress',{percent:progress.percent,transferred:progress.transferred,total:progress.total,bytesPerSecond:progress.bytesPerSecond}));
autoUpdater.on('update-downloaded',info=>sendUpdate('downloaded',{version:info.version}));
autoUpdater.on('error',error=>sendUpdate('error',{message:String(error?.message||'Update check failed').slice(0,300)}));
function sendUpdate(type,payload={}){if(updaterWindow&&!updaterWindow.isDestroyed())updaterWindow.webContents.send('updater:event',{type,...payload})}
function configureUpdater(){
 autoUpdater.setFeedURL({provider:'github',owner:'SpeakingRobot',repo:'sams-canvas'});
 updaterConfigured=true;
}
ipcMain.handle('updater:check',async()=>{try{configureUpdater();await autoUpdater.checkForUpdates();return {ok:true}}catch(error){sendUpdate('error',{message:String(error?.message||error).slice(0,300)});throw error}});
ipcMain.handle('updater:version',()=>app.getVersion());
ipcMain.handle('updater:download',async()=>{if(!updaterConfigured)configureUpdater();return autoUpdater.downloadUpdate()});
ipcMain.handle('updater:install',()=>{if(!updaterConfigured)throw new Error('No downloaded update is ready.');autoUpdater.quitAndInstall(false,true);return true});
ipcMain.handle('updater:release-notes',async()=>{const response=await fetch('https://api.github.com/repos/SpeakingRobot/sams-canvas/releases?per_page=30',{headers:{Accept:'application/vnd.github+json','User-Agent':'Sams-Canvas-Updater'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`Release notes unavailable (${response.status}).`);const releases=await response.json();const release=releases.find(item=>!item.draft&&item.assets?.some(asset=>asset.name==='latest.yml'));if(!release)throw new Error('No desktop release notes are available yet.');return {version:String(release.tag_name||'').replace(/^v/,''),name:release.name||release.tag_name,body:release.body||'',published_at:release.published_at,html_url:release.html_url}});
app.whenReady().then(()=>{
 const root=path.resolve(__dirname,'../dist');
 protocol.handle('threadline',request=>{const u=new URL(request.url);let pathname;try{pathname=decodeURIComponent(u.pathname)}catch{return new Response('Bad request',{status:400})}const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!target.startsWith(root+path.sep))return new Response('Forbidden',{status:403});return net.fetch(pathToFileURL(target).href)});
 function open(){const win=new BrowserWindow({width:1440,height:960,minWidth:980,minHeight:650,backgroundColor:'#1e1e22',autoHideMenuBar:true,title:'Sam’s Canvas — Creator Studio',icon:path.join(root,'icon-512.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});updaterWindow=win;win.on('closed',()=>{if(updaterWindow===win)updaterWindow=null});win.webContents.setWindowOpenHandler(({url})=>{if(/^https?:\/\//.test(url))shell.openExternal(url);return {action:'deny'}});win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('threadline://studio/')){e.preventDefault();if(/^https?:\/\//.test(url))shell.openExternal(url)}});win.loadURL('threadline://studio/');}
 open();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)open()});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});

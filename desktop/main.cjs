const {app,BrowserWindow,shell,protocol,net,ipcMain}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {autoUpdater}=require('electron-updater');
const primaryInstance=app.requestSingleInstanceLock();
if(!primaryInstance)app.quit();
let pendingInvite=process.argv.find(arg=>/^samscanvas:\/\/join\?token=[a-f0-9]{64}$/.test(arg))||null;
app.on('second-instance',(_event,argv)=>{const invite=argv.find(arg=>/^samscanvas:\/\/join\?token=[a-f0-9]{64}$/.test(arg));if(invite)pendingInvite=invite;const win=updaterWindow;if(win&&!win.isDestroyed()){if(win.isMinimized())win.restore();win.focus();if(pendingInvite){win.webContents.send('canvas:invite',pendingInvite);pendingInvite=null}}});
for(const name of ['Threadline','threadline-creator-studio']){const legacy=path.join(app.getPath('appData'),name);if(fs.existsSync(legacy)){app.setPath('userData',legacy);break;}}
const {pathToFileURL}=require('node:url');
protocol.registerSchemesAsPrivileged([{scheme:'threadline',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
let updaterWindow=null;
let updaterConfigured=false;
let downloadPromise=null,checkPromise=null,updateReady=false,installingUpdate=false;
autoUpdater.autoDownload=false;
autoUpdater.autoInstallOnAppQuit=false;
autoUpdater.allowPrerelease=false;
autoUpdater.on('checking-for-update',()=>sendUpdate('checking'));
autoUpdater.on('update-available',info=>sendUpdate('available',{version:info.version,releaseDate:info.releaseDate,packageSize:info.packages?.[process.arch]?.size||0,installerSize:info.files?.find(file=>/\.exe$/i.test(file.url))?.size||0}));
autoUpdater.on('update-not-available',info=>sendUpdate('current',{version:info.version}));
autoUpdater.on('download-progress',progress=>sendUpdate('progress',{percent:progress.percent,transferred:progress.transferred,total:progress.total,bytesPerSecond:progress.bytesPerSecond}));
autoUpdater.on('update-downloaded',info=>{updateReady=true;sendUpdate('downloaded',{version:info.version})});
autoUpdater.on('error',error=>sendUpdate('error',{message:String(error?.message||'Update check failed').slice(0,300)}));
function sendUpdate(type,payload={}){if(updaterWindow&&!updaterWindow.isDestroyed())updaterWindow.webContents.send('updater:event',{type,...payload})}
function configureUpdater(){
 autoUpdater.setFeedURL({provider:'github',owner:'SpeakingRobot',repo:'sams-canvas'});
 updaterConfigured=true;
}
ipcMain.handle('updater:check',async()=>{if(!checkPromise){configureUpdater();checkPromise=autoUpdater.checkForUpdates().then(()=>({ok:true})).finally(()=>{checkPromise=null})}return checkPromise});
ipcMain.handle('updater:version',()=>app.getVersion());
ipcMain.handle('updater:download',async()=>{if(!updaterConfigured)configureUpdater();if(!downloadPromise)downloadPromise=autoUpdater.downloadUpdate().finally(()=>{downloadPromise=null});return downloadPromise});
ipcMain.handle('updater:install',()=>{if(installingUpdate)return true;if(!updateReady)throw new Error('No verified update is ready.');installingUpdate=true;setImmediate(()=>autoUpdater.quitAndInstall(true,true));return true});
ipcMain.handle('updater:release-notes',async()=>{const response=await fetch('https://api.github.com/repos/SpeakingRobot/sams-canvas/releases?per_page=30',{headers:{Accept:'application/vnd.github+json','User-Agent':'Sams-Canvas-Updater'},signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`Release notes unavailable (${response.status}).`);const releases=await response.json();const release=releases.find(item=>!item.draft&&item.assets?.some(asset=>asset.name==='latest.yml'));if(!release)throw new Error('No desktop release notes are available yet.');return {version:String(release.tag_name||'').replace(/^v/,''),name:release.name||release.tag_name,body:release.body||'',published_at:release.published_at,html_url:release.html_url}});
app.whenReady().then(()=>{
 if(!primaryInstance)return;
 if(app.isPackaged)app.setAsDefaultProtocolClient('samscanvas');
 const root=path.resolve(__dirname,'../dist');
 protocol.handle('threadline',request=>{const u=new URL(request.url);let pathname;try{pathname=decodeURIComponent(u.pathname)}catch{return new Response('Bad request',{status:400})}const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!target.startsWith(root+path.sep))return new Response('Forbidden',{status:403});return net.fetch(pathToFileURL(target).href)});
 function open(){const win=new BrowserWindow({width:1440,height:960,minWidth:980,minHeight:650,backgroundColor:'#1e1e22',autoHideMenuBar:true,title:'Sam’s Canvas — Creator Studio',icon:path.join(root,'icon-512.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});updaterWindow=win;win.webContents.session.webRequest.onBeforeSendHeaders({urls:['https://www.youtube.com/embed/*','https://www.youtube-nocookie.com/embed/*']},(details,callback)=>callback({requestHeaders:require('./embed-headers.cjs')(details)}));win.on('closed',()=>{if(updaterWindow===win)updaterWindow=null});win.webContents.setWindowOpenHandler(({url})=>{if(/^https?:\/\//.test(url))shell.openExternal(url);return {action:'deny'}});win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('threadline://studio/')){e.preventDefault();if(/^https?:\/\//.test(url))shell.openExternal(url)}});win.loadURL('threadline://studio/');}
 open();updaterWindow.webContents.once('did-finish-load',()=>{if(pendingInvite){updaterWindow.webContents.send('canvas:invite',pendingInvite);pendingInvite=null}});app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)open()});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});

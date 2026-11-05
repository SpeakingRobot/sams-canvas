const {app,BrowserWindow,shell,protocol,net}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
for(const name of ['Threadline','threadline-creator-studio']){const legacy=path.join(app.getPath('appData'),name);if(fs.existsSync(legacy)){app.setPath('userData',legacy);break;}}
const {pathToFileURL}=require('node:url');
protocol.registerSchemesAsPrivileged([{scheme:'threadline',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,stream:true}}]);
app.whenReady().then(()=>{
 const root=path.resolve(__dirname,'../dist');
 protocol.handle('threadline',request=>{const u=new URL(request.url);let pathname;try{pathname=decodeURIComponent(u.pathname)}catch{return new Response('Bad request',{status:400})}const target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!target.startsWith(root+path.sep))return new Response('Forbidden',{status:403});return net.fetch(pathToFileURL(target).href)});
 function open(){const win=new BrowserWindow({width:1440,height:960,minWidth:980,minHeight:650,backgroundColor:'#1e1e22',autoHideMenuBar:true,title:'Sam’s Canvas — Creator Studio',icon:path.join(root,'icon-512.png'),webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});win.webContents.setWindowOpenHandler(({url})=>{if(/^https?:\/\//.test(url))shell.openExternal(url);return {action:'deny'}});win.webContents.on('will-navigate',(e,url)=>{if(!url.startsWith('threadline://studio/')){e.preventDefault();if(/^https?:\/\//.test(url))shell.openExternal(url)}});win.loadURL('threadline://studio/');}
 open();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)open()});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});

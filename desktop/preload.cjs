const {contextBridge,ipcRenderer}=require('electron');

contextBridge.exposeInMainWorld('desktopUpdater',Object.freeze({
 version:()=>ipcRenderer.invoke('updater:version'),
 setToken:token=>ipcRenderer.invoke('updater:auth',token),
 clearSession:()=>ipcRenderer.invoke('updater:clear-auth'),
 check:token=>ipcRenderer.invoke('updater:check',token),
 download:()=>ipcRenderer.invoke('updater:download'),
 install:()=>ipcRenderer.invoke('updater:install'),
 releaseNotes:token=>ipcRenderer.invoke('updater:release-notes',token),
 onEvent:callback=>{
  if(typeof callback!=='function')return()=>{};
  const listener=(_event,payload)=>callback(payload);
  ipcRenderer.on('updater:event',listener);
  return()=>ipcRenderer.removeListener('updater:event',listener);
 }
}));

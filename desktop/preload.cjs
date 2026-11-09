const {contextBridge,ipcRenderer}=require('electron');

contextBridge.exposeInMainWorld('desktopUpdater',Object.freeze({
 version:()=>ipcRenderer.invoke('updater:version'),
 check:()=>ipcRenderer.invoke('updater:check'),
 download:()=>ipcRenderer.invoke('updater:download'),
 install:()=>ipcRenderer.invoke('updater:install'),
 releaseNotes:()=>ipcRenderer.invoke('updater:release-notes'),
 onEvent:callback=>{
  if(typeof callback!=='function')return()=>{};
  const listener=(_event,payload)=>callback(payload);
  ipcRenderer.on('updater:event',listener);
  return()=>ipcRenderer.removeListener('updater:event',listener);
 }
}));

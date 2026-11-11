/* Temporary activity is rendered separately from durable board state. */
var LiveCanvas={
 peers:new Map(),hidden:new Map(),confirmed:new Map(),ghosts:new Map(),lastInk:null,lastErase:null,draft:null,frame:0,
 init(){
  const scene=$('#boardScene');scene.insertAdjacentHTML('beforeend','<svg id="collabLiveInk" class="collab-live-ink" aria-hidden="true"></svg><div id="collabNodePreviews" aria-hidden="true"></div>');
  const observer=new MutationObserver(()=>{this.dirty=true});observer.observe($('#nodes'),{childList:true});observer.observe($('#inkLayer'),{childList:true});
  document.addEventListener('input',e=>this.typing(e));
  document.addEventListener('pointerdown',()=>requestAnimationFrame(()=>this.broadcast()));
  document.addEventListener('pointerup',()=>{this.broadcast(true);setTimeout(()=>Collaboration.project(),200)},true);
  document.addEventListener('pointercancel',()=>this.broadcast());
  setInterval(()=>this.paint(),80);
 },
 typing(e){const el=e.target,node=el.closest?.('.node'),shotId=el.dataset?.embeddedNote||el.dataset?.shotNote;if(!node&&!shotId)return;
  if(!el.matches('textarea,[contenteditable="true"],[contenteditable="plaintext-only"],td'))return;
  const seq=shotId?sequences().find(s=>s.boardId===board().id&&s.shots.some(shot=>shot.id===shotId)):null;
  this.draft={boardId:board().id,nodeId:node?.dataset.node,notes:seq?{sequenceId:seq.id,shotId,notes:el.value}:null,until:Date.now()+1800};this.broadcast();
 },
 isTyping(){return this.draft?.boardId===board().id&&this.draft.until>Date.now()&&document.activeElement?.matches('textarea,[contenteditable="true"],[contenteditable="plaintext-only"],td')},
 broadcast(force=false){if(!Collaboration.channel)return;clearTimeout(this.sendTimer);const elapsed=performance.now()-(this.sentAt||0);if(!force&&elapsed<40){this.sendTimer=setTimeout(()=>this.broadcast(),40-elapsed);return}this.sentAt=performance.now();Collaboration.sendPointer(Collaboration.lastPoint||null)},
 points(points,max=2500){if(points.length<=max)return points;const step=(points.length-1)/(max-1);return Array.from({length:max},(_,i)=>points[Math.round(i*step)])},
 nodePatch(node,typing=false){const keys=['id','type','x','y','w','h','minHeight','scaleX','scaleY','displayHeight','stretchedImage','format','inline','autoWidth','shape','noteColor','rotation','tilt','sequenceId','stampId'];if(typing)keys.push('title','text','plainText','bullets','rows','label','tag');else if(node.type==='shape')keys.push('title');return Object.fromEntries(keys.filter(k=>node[k]!==undefined).map(k=>[k,node[k]]))},
 sample(){
  const now=Date.now(),nodes=[],ink=[];let erase=null,notes=null;const wire=boardConnect&&Collaboration.lastPoint?{id:boardConnect.id,side:boardConnect.side,point:Collaboration.lastPoint}:null;
  if(drag?.type==='ink'){if(!drag.stroke.id)drag.stroke.id=uid();this.lastInk={stroke:drag.stroke,boardId:board().id,until:now+600}}
  if(this.lastInk?.boardId===board().id&&this.lastInk.until>now){const s=this.lastInk.stroke;ink.push({id:s.id,points:this.points(s.points),color:s.color,size:s.size})}
  if(drag?.type==='erase')this.lastErase={boardId:board().id,trace:drag.trace,radius:drag.radius,until:now+600};
  if(this.lastErase?.boardId===board().id&&this.lastErase.until>now)erase={points:this.points(this.lastErase.trace),radius:this.lastErase.radius};
  if(['node','transform','shapeDraw'].includes(drag?.type))for(const item of [{node:drag.node},...(drag.group||[])]){
   const n=item.node;if(!n)continue;if(n.type==='ink'){const s=n.stroke;ink.push({id:s.id,points:this.points(s.points),color:s.color,size:s.size});continue}const patch=this.nodePatch(n);
   if(drag.type==='node'&&Number.isFinite(drag.targetX)){const dx=drag.targetX-drag.x,dy=drag.targetY-drag.y;patch.x=n.id===drag.node.id?drag.targetX:item.x+dx;patch.y=n.id===drag.node.id?drag.targetY:item.y+dy}nodes.push(patch);
  }
  if(this.isTyping()){const n=board().nodes.find(n=>n.id===this.draft.nodeId);if(n&&!nodes.some(p=>p.id===n.id))nodes.push({...this.nodePatch(n,true),typing:true});notes=this.draft.notes}
  let pointBudget=3000;for(const stroke of ink){stroke.points=this.points(stroke.points,Math.min(2500,Math.max(2,pointBudget)));pointBudget-=stroke.points.length;if(pointBudget<=0){ink.splice(ink.indexOf(stroke)+1);break}}
  if(!nodes.length&&!ink.length&&!erase&&!notes&&!wire){this.lastLiveKey=null;return null}const live={nodes:nodes.slice(0,30),ink:ink.slice(0,30),erase,notes,wire,typing:this.isTyping()},key=JSON.stringify(live);
  if(key===this.lastLiveKey&&now-(this.lastLiveSent||0)<800)return undefined;if(key!==this.lastLiveKey)this.revision=(this.revision||0)+1;this.lastLiveKey=key;this.lastLiveSent=now;return {...live,revision:this.revision,frame:++this.frame};
 },
 receive(payload){const live=payload.live,previous=this.peers.get(payload.peer);if(live===undefined){if(previous)previous.seen=Date.now();return}if(live===null){if(previous&&!previous.ended){previous.wire=null;previous.typing=false;previous.ended=true;for(const node of previous.nodes||[])node.typing=false;previous.revision++;this.paint()}return}if(previous&&Number.isFinite(live.frame)&&live.frame<previous.frame)return;const ack=this.confirmed.get(payload.peer),keep=previous&&!(ack&&previous.frame<=ack.frame&&Collaboration.appliedRevision>=ack.revision);const merge=key=>[...new Map([...(keep?previous[key]||[]:[]),...(live[key]||[])].map(item=>[item.id,item])).values()].slice(-60);this.peers.set(payload.peer,{...live,nodes:merge('nodes'),ink:merge('ink'),name:String(payload.name||'Creator').slice(0,40),boardId:payload.boardId,seen:Date.now()});this.paint()},
 confirm(peer,frame,revision){if(typeof peer==='string'&&Number.isFinite(frame)&&frame>=(this.confirmed.get(peer)?.frame||0))this.confirmed.set(peer,{frame,revision});this.paint()},
 localOwns(id){return document.activeElement?.closest('.node')?.dataset.node===id||drag?.node?.id===id||drag?.group?.some(item=>item.node.id===id)},
 restore(){for(const [id,old] of this.hidden){const el=$('#nodes')?.querySelector('[data-node="'+CSS.escape(id)+'"]');if(el===old.el){if(this.localOwns(id))el.style.opacity='';else el.style.cssText=old.style}}this.hidden.clear()},
 clear(){this.restore();this.peers.clear();this.confirmed.clear();this.ghosts.clear();$('#collabLiveInk')?.replaceChildren();$('#collabNodePreviews')?.replaceChildren();if($('#inkLayer')){$('#inkLayer').style.mask='';$$('#inkLayer .live-ink-hidden').forEach(el=>el.classList.remove('live-ink-hidden'))}$$('.collab-typing-badge').forEach(el=>el.remove())},
 path(points){return points.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' ')},
 validPoints(points){return Array.isArray(points)&&points.length<=2500&&points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))},
 paint(){
  const layer=$('#collabNodePreviews'),svg=$('#collabLiveInk');if(!layer||!svg)return;
  if(!drag&&!isEditing())for(const [peer,ack] of this.confirmed){const live=this.peers.get(peer);if(!live){this.confirmed.delete(peer);continue}if(live.frame<=ack.frame&&Collaboration.appliedRevision>=ack.revision){this.peers.delete(peer);this.confirmed.delete(peer);this.dirty=true}}
  const liveKey=[...this.peers.entries()].filter(([,p])=>Date.now()-p.seen<=30000&&p.boardId===board().id).map(([id,p])=>id+':'+p.revision).join('|')+':'+Collaboration.status+':'+board().id+':'+tab+':'+pan.x+':'+pan.y+':'+zoom+':'+Collaboration.revision+':'+(document.activeElement?.closest('.node')?.dataset.node||'')+':'+(drag?.node?.id||'');
  if(!this.dirty&&liveKey===this.lastPaintKey)return;this.lastPaintKey=liveKey;this.dirty=false;
  const visibleGhosts=new Set();this.restore();$$('#inkLayer .live-ink-hidden').forEach(el=>el.classList.remove('live-ink-hidden'));$$('.collab-typing-badge').forEach(el=>el.remove());
  if(!Collaboration.channel){this.clear();return}
  const ink=[],masks=[],now=Date.now();for(const [peer,activity] of this.peers){
   if(now-activity.seen>30000||activity.boardId!==board().id){this.peers.delete(peer);continue}
   for(const patch of activity.nodes||[]){if(typeof patch.id!=='string'||this.localOwns(patch.id))continue;const original=board().nodes.find(n=>n.id===patch.id),node={...original,...patch};delete node.typing;
    if(!['note','text','sticky','shape','image','video','link','table','stamp','sequencer'].includes(node.type)||![node.x,node.y,node.w].every(Number.isFinite))continue;
    if(original&&Object.keys(patch).filter(k=>k!=='typing').every(k=>JSON.stringify(original[k])===JSON.stringify(patch[k]))&&!patch.typing)continue;
    const cacheId=peer+':'+patch.id,key=JSON.stringify(Object.fromEntries(Object.entries(patch).filter(([k])=>!['x','y'].includes(k))));let cached=this.ghosts.get(cacheId),ghost=cached?.el;if(!ghost||cached.original!==original||cached.key!==key){const wrapper=document.createElement('div');wrapper.innerHTML=nodeHTML(node);ghost=wrapper.firstElementChild;if(!ghost)continue;ghost.removeAttribute('data-node');ghost.dataset.liveNode=patch.id;ghost.classList.remove('selected');ghost.querySelectorAll('button,input,textarea,[tabindex]').forEach(el=>el.tabIndex=-1);cached?.el.remove();this.ghosts.set(cacheId,{el:ghost,original,key});layer.append(ghost);if(node.inline)CanvasEditor.apply(node,ghost)}visibleGhosts.add(cacheId);ghost.style.left=node.x+'px';ghost.style.top=node.y+'px';
    if(patch.typing){let badge=ghost.querySelector('.collab-typing-badge');if(!badge){badge=document.createElement('span');badge.className='collab-typing-badge';ghost.append(badge)}badge.textContent=activity.name+' is typing…'}
    const el=$('#nodes')?.querySelector('[data-node="'+CSS.escape(patch.id)+'"]');if(el){this.hidden.set(patch.id,{el,style:el.style.cssText});el.style.left=node.x+'px';el.style.top=node.y+'px';el.style.width=node.w+'px';el.style.opacity='0'}
   }
   for(const stroke of activity.ink||[]){if(!this.validPoints(stroke.points)||typeof stroke.id!=='string')continue;const saved=board().strokes.find(s=>s.id===stroke.id);if(saved&&saved.points.length>=stroke.points.length&&JSON.stringify(saved.points.at(-1))===JSON.stringify(stroke.points.at(-1)))continue;ink.push(`<path data-live-stroke="${escapeHTML(stroke.id)}" d="${this.path(stroke.points)}" stroke="${validColor(stroke.color)}" stroke-width="${Math.max(.5,Math.min(1000,Number(stroke.size)||3))}"/>`);if(saved){const hit=$('#inkLayer').querySelector('[data-stroke="'+CSS.escape(stroke.id)+'"]');if(hit?.previousElementSibling)hit.previousElementSibling.classList.add('live-ink-hidden')}}
   if(activity.erase&&this.validPoints(activity.erase.points)&&Number.isFinite(activity.erase.radius))masks.push(`<path d="${this.path(activity.erase.points)}" fill="none" stroke="black" stroke-width="${Math.max(1,Math.min(1000,activity.erase.radius*2))}" stroke-linecap="round" stroke-linejoin="round"/>`);
   if(activity.wire&&Number.isFinite(activity.wire.point?.x)&&Number.isFinite(activity.wire.point?.y)){const a=nodeAnchor(activity.wire.id,activity.wire.side);if(a)ink.push(`<path data-live-wire="true" d="${curve(a,activity.wire.point,activity.wire.side)}" stroke="#0d99ff" stroke-width="3.4"/>`)}
   const note=activity.notes;if(note&&typeof note.shotId==='string'&&typeof note.notes==='string')for(const el of $$('[data-shot-note],[data-embedded-note]'))if((el.dataset.shotNote||el.dataset.embeddedNote)===note.shotId&&el!==document.activeElement){el.value=note.notes;const badge=document.createElement('span');badge.className='collab-typing-badge shot-typing';badge.textContent=activity.name+' is typing…';el.parentElement.append(badge)}
  }
  for(const [id,cached] of this.ghosts)if(!visibleGhosts.has(id)){cached.el.remove();this.ghosts.delete(id)}
  const viewport=$('#canvas'),x=-pan.x/zoom-100,y=-pan.y/zoom-100,w=viewport.clientWidth/zoom+200,h=viewport.clientHeight/zoom+200;
  const mask=masks.length?`<defs><mask id="collabEraserMask" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white"/>`+masks.join('')+'</mask></defs>':'';
  svg.innerHTML=mask+'<g fill="none" stroke-linecap="round" stroke-linejoin="round"'+(masks.length?' mask="url(#collabEraserMask)"':'')+'>'+ink.join('')+'</g>';$('#inkLayer').style.mask=masks.length?'url(#collabEraserMask)':'';if(this.hidden.size&&tab==='whiteboard')renderBoardWires();
 }
};

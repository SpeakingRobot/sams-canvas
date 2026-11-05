/* Small offline interaction sounds, designed in Web Audio and controlled by Settings. */
var StudioSFX={audio:null,
 async unlock(){if(!state.sound)return;try{if(!this.audio||this.audio.state==='closed')this.audio=new(window.AudioContext||window.webkitAudioContext)();await this.audio.resume()}catch{}},
 async play(kind){if(!state.sound)return;try{if(this.audio?.state==='closed')this.audio=null;const a=this.audio||(this.audio=new(window.AudioContext||window.webkitAudioContext)());await a.resume();const t=a.currentTime+(kind==='stamp'?.1:0),out=a.createGain();out.gain.value=.5;out.connect(a.destination);let end=.3;
 const tone=(type,from,to,duration,volume,delay=0)=>{const o=a.createOscillator(),g=a.createGain(),start=t+delay;o.type=type;o.frequency.setValueAtTime(from,start);o.frequency.exponentialRampToValueAtTime(Math.max(20,to),start+duration);g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(volume,start+.006);g.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(g).connect(out);o.start(start);o.stop(start+duration+.01);o.onended=()=>{o.disconnect();g.disconnect()};end=Math.max(end,delay+duration+.03)};
 const noise=(duration,volume,freq,filterType='bandpass',delay=0)=>{const length=Math.ceil(a.sampleRate*duration),buffer=a.createBuffer(1,length,a.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);const src=a.createBufferSource(),filter=a.createBiquadFilter(),g=a.createGain(),start=t+delay;src.buffer=buffer;filter.type=filterType;filter.frequency.value=freq;filter.Q.value=.8;g.gain.setValueAtTime(volume,start);g.gain.exponentialRampToValueAtTime(.0001,start+duration);src.connect(filter).connect(g).connect(out);src.start(start);src.onended=()=>{src.disconnect();filter.disconnect();g.disconnect()};end=Math.max(end,delay+duration+.03)};
 if(kind==='grab'){tone('sine',340,520,.055,.11);noise(.025,.13,1700);}
 else if(kind==='stamp'){tone('sine',130,55,.12,.34);noise(.085,.37,850,'lowpass');noise(.045,.1,2800,'highpass',.008);}
 else if(kind==='cut'){noise(.06,.34,4300,'highpass');tone('triangle',340,95,.14,.14,.015);}
 else if(kind==='disconnect'){noise(.035,.2,1600);tone('sine',360,140,.12,.14);}
 else if(kind==='spark'){noise(.045,.15,5300,'highpass');noise(.018,.11,3400,'bandpass',.05);tone('sine',1800,900,.06,.035);}
 else{tone('sine',170,90,.075,.19);noise(.025,.18,2200);tone('sine',760,1260,.07,.085,.025);tone('sine',1260,940,.065,.06,.08);}
 setTimeout(()=>{out.disconnect()},(end+.2)*1000);
 }catch{}}
};
var StudioFX={
 burst(x,y,kind='spark'){if(reduceMotion())return;const el=document.createElement('div');el.className='wire-impact wire-impact-'+kind;el.style.left=x+'px';el.style.top=y+'px';el.setAttribute('aria-hidden','true');el.innerHTML='<b></b>'+Array.from({length:kind==='spark'?10:6},(_,i)=>'<i style="--ray:'+i+';--angle:'+i*(kind==='spark'?36:60)+'deg"></i>').join('');if(kind==='spark')el.innerHTML='<b></b><svg viewBox="-38 -38 76 76">'+Array.from({length:7},(_,i)=>'<path style="--ray:'+i+'" transform="rotate('+(i*51+Math.random()*13)+')" d="M3 0 8 -3 11 2 17 -3 20 1 '+(26+i%3*3)+' -2"/>').join('')+'</svg>'+Array.from({length:7},(_,i)=>'<i style="--ray:'+i+';--angle:'+(i*51+20)+'deg"></i>').join('');document.body.append(el);setTimeout(()=>el.remove(),560)},
 snap(path,start,end){if(reduceMotion())return;try{const length=path.getTotalLength(),matrix=path.getScreenCTM();if(!matrix)return;const count=70,points=Array.from({length:count+1},(_,i)=>{const point=path.getPointAtLength(length*i/count),p=new DOMPoint(point.x,point.y).matrixTransform(matrix);return{x:p.x,y:p.y}}),a={x:start[0],y:start[1]},b={x:end[0],y:end[1]};let cut=1,best=Infinity;for(let i=1;i<count;i++){const d=segmentDistance(a,b,points[i],points[i]);if(d<best){best=d;cut=i}}cut=Math.max(3,Math.min(count-3,cut));const halves=[points.slice(0,cut+1),points.slice(cut)],el=document.createElementNS('http://www.w3.org/2000/svg','svg');el.setAttribute('class','snapping-wire');el.setAttribute('aria-hidden','true');const stroke=getComputedStyle(path).stroke;el.innerHTML='<path/><path/>';document.body.append(el);const roots=[...el.children],origin=performance.now(),cutPoint=points[cut];const draw=now=>{const t=Math.min(1,(now-origin)/570),pull=1-Math.exp(-t*6),swing=Math.sin(t*19)*Math.exp(-t*4);halves.forEach((half,index)=>{const anchor=index?half.at(-1):half[0],dx=anchor.x-cutPoint.x,dy=anchor.y-cutPoint.y,dist=Math.hypot(dx,dy)||1,travel=Math.min(110,dist*.45);roots[index].setAttribute('d',half.map((p,i)=>{const weight=Math.pow(index?1-i/(half.length-1):i/(half.length-1),2),x=p.x+(dx/dist*travel*pull-dy/dist*23*swing)*weight,y=p.y+(dy/dist*travel*pull+dx/dist*23*swing)*weight;return(i?'L':'M')+x+' '+y}).join(' '));roots[index].setAttribute('stroke',stroke)});el.style.opacity=String(t<.55?1:Math.max(0,(1-t)/.45));if(t<1)requestAnimationFrame(draw);else el.remove()};requestAnimationFrame(draw);}catch{}},
 connected(date){const socket=$('[data-date="'+date+'"] .date-port');if(!socket)return;const r=socket.getBoundingClientRect();this.burst(r.left+r.width/2,r.top+r.height/2);StudioSFX.play('spark')}
};
/* Creative tools: stamps, a floating focus clock, ambient audio, and magnetic sockets. */
var StudioIcons = {
  play: '<path d="m8 4 13 8-13 8Z"/>',
  stamp: '<path d="M8 15h8l-1-5V7a3 3 0 0 0-6 0v3zM5 15h14v4H5zM4 22h16"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  music: '<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>',
  heart: '<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  star: '<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
  spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3ZM20 2v4M18 4h4"/>',
  flag: '<path d="M5 22V3c5-4 9 4 15 0v11c-6 4-10-4-15 0"/>',
  bulb: '<path d="M8 16a7 7 0 1 1 8 0v3H8zM9 22h6M9 8l3-2"/>',
  fire: '<path d="M12 2c2 7 9 8 9 14a9 9 0 0 1-18 0c0-4 3-7 5-9-1 6 3 6 4 2z"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14c1 4 7 4 8 0M8 8v2M16 8v2"/>',
  pin: '<path d="m8 3 8 0-1 6 4 4v2H5v-2l4-4zM12 15v7"/>',
  wind: '<path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 17h5a3 3 0 1 1-3 3"/>',
  bird: '<path d="M3 14c4-1 5-4 5-8 4 0 6 2 8 5l5 1-4 3c-1 6-9 7-14-1ZM14 8l2-5M14 14h.01"/>',
  water: '<path d="M12 2C8 8 4 11 4 15a8 8 0 0 0 16 0c0-4-4-7-8-13ZM8 15c0 3 2 4 4 4"/>',
  rain: '<path d="M6 14a5 5 0 1 1 1-10 6 6 0 0 1 11 3 4 4 0 0 1 0 8M8 17l-2 4M14 17l-2 4M20 17l-2 4"/>',
  stopwatch: '<circle cx="12" cy="14" r="8"/><path d="M9 2h6M12 2v4M18 6l2-2M12 10v5"/>',
  alarm: '<circle cx="12" cy="13" r="8"/><path d="M12 8v5l3 2M2 5l4-3M18 2l4 3M6 20l-2 3M18 20l2 3"/>',
  screen: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4M7 21h10"/>'
};
function studioIcon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${StudioIcons[name] || StudioIcons.spark}</svg>`; }
function noteAngle(n) { return Number.isFinite(n.rotation) ? Math.max(-12, Math.min(12, n.rotation)) : n.type === 'sticky' && !n.inline ? -2 : 0; }
function noteTransform(n) { const s = nodeScale(n); return `scale(${s.x},${s.y}) rotate(${noteAngle(n)}deg)`; }

var StampKit = {
  active: 'important', query: '', category: 'All', pickerOpen: true,
  library: [
    ['important','IMPORTANT','flag','#d94b50','Workflow'],['done','DONE','check','#168864','Workflow'],['idea','BIG IDEA','bulb','#d89225','Workflow'],['record','TO FILM','play','#2588d9','Workflow'],
    ['research','RESEARCH','search','#2588d9','Workflow'],['edit','EDIT THIS','pen','#d97832','Workflow'],['approved','APPROVED','check','#168864','Workflow'],['review','NEEDS REVIEW','flag','#d94b50','Workflow'],
    ['draft','DRAFT','text','#686873','Workflow'],['publish','READY TO POST','play','#2588d9','Workflow'],['priority','PRIORITY','star','#d94b50','Workflow'],['deadline','DEADLINE','clock','#d94b50','Workflow'],
    ['keep','KEEP THIS','pin','#2588d9','Feedback'],['revisit','REVISIT','clock','#d97832','Feedback'],['love','LOVE THIS','heart','#db5874','Feedback'],['yes','YES!','check','#168864','Feedback'],
    ['maybe','MAYBE…','bulb','#d89225','Feedback'],['nope','NOT THIS','close','#d94b50','Feedback'],['great','LOOKS GREAT','spark','#2588d9','Feedback'],['focus','STAY FOCUSED','flag','#d97832','Feedback'],
    ['hook','THE HOOK','flag','#2588d9','Feedback'],['story','TELL A STORY','bulb','#d89225','Feedback'],['breathe','TAKE A BREATH','wind','#2588d9','Feedback'],['take','ONE MORE TAKE','play','#d97832','Feedback'],
    ['heart','Heart','heart','#db5874','Symbols'],['star','Star','star','#d89225','Symbols'],['spark','Sparkle','spark','#2588d9','Symbols'],['fire','On fire','fire','#df7135','Symbols'],
    ['smile','Smile','smile','#d89225','Symbols'],['flag','Flag','flag','#d94b50','Symbols'],['light','Light bulb','bulb','#d89225','Symbols'],['check','Check mark','check','#168864','Symbols'],
    ['music','Music','music','#2588d9','Symbols'],['camera','Rolling','play','#d94b50','Symbols'],['water','Fresh start','water','#2588d9','Symbols'],['bird','Let it fly','bird','#168864','Symbols']
  ],
  item(id) { return this.library.find(s => s[0] === id) || this.library[0]; },
  glyph(name) { return StudioIcons[name] ? studioIcon(name) : icon(name); },
  art(item) { const symbol = item[4] === 'Symbols'; return `<div class="stamp-art ${symbol ? 'stamp-symbol' : 'stamp-phrase'}" style="--stamp-color:${item[3]}">${this.glyph(item[2])}${symbol ? '' : `<span>${item[1]}</span>`}</div>`; },
  options() {
    if(!this.pickerOpen){$('#toolOptions').innerHTML='<div class="stamp-placement-bar">'+this.art(this.item(this.active))+'<button class="secondary-btn" id="changeStamp">Change stamp</button><span>Right-click or Esc to finish</span></div>';$('#changeStamp').onclick=()=>{this.pickerOpen=true;this.options()};this.cursor();return;}
    $('#toolOptions').innerHTML = `<div class="stamp-library"><div class="stamp-library-head"><strong>${studioIcon('stamp')}Make your mark</strong><input id="stampSearch" placeholder="Find a stamp…" aria-label="Find a stamp"></div><div class="stamp-categories">${['All','Workflow','Feedback','Symbols'].map(c=>`<button data-stamp-category="${c}" class="${this.category===c?'active':''}">${c}</button>`).join('')}</div><div class="stamp-grid" id="stampGrid"></div><p>Right-click or Esc to finish</p></div>`;
    const draw = () => { $('#stampGrid').innerHTML = this.library.filter(s => (this.category === 'All' || s[4] === this.category) && s[1].toLowerCase().includes(this.query.toLowerCase())).map(s=>`<button data-stamp="${s[0]}" class="stamp-choice ${this.active===s[0]?'active':''}" aria-label="${s[1]} stamp" aria-pressed="${this.active===s[0]}">${this.art(s)}</button>`).join('') || '<span class="muted">No stamps found.</span>'; $$('[data-stamp]').forEach(b=>b.onclick=()=>{this.active=b.dataset.stamp;this.pickerOpen=false;this.options();}); };
    $('#stampSearch').value=this.query; $('#stampSearch').oninput=e=>{this.query=e.target.value;draw()};
    $$('[data-stamp-category]').forEach(b=>b.onclick=()=>{this.category=b.dataset.stampCategory;this.options()}); draw(); this.cursor();
    $('#canvasHint').textContent='Right-click, Escape, or the stamp tool to finish';
  },
  cursor() { $('#stampCursor')?.remove();document.body.insertAdjacentHTML('beforeend',`<div id="stampCursor" aria-hidden="true" style="--stamp-color:${this.item(this.active)[3]}">${this.stamper()}</div>`);if(this.point){const c=$('#stampCursor');c.style.left=this.point.x+'px';c.style.top=this.point.y+'px';c.classList.toggle('visible',this.point.visible);} },
  stamper() { return `<svg class="rubber-stamper" viewBox="0 0 70 84" aria-hidden="true"><defs><radialGradient id="stamp-top" cx=".3" cy=".22"><stop stop-color="#d5ad7e"/><stop offset=".36" stop-color="#b07b4b"/><stop offset=".8" stop-color="#6f452d"/><stop offset="1" stop-color="#3a271f"/></radialGradient><linearGradient id="stamp-metal" x2=".6" y2="1"><stop stop-color="#f6f8fb"/><stop offset=".5" stop-color="#b8c2d1"/><stop offset="1" stop-color="#778498"/></linearGradient></defs><ellipse class="stamper-shadow" cx="35" cy="73" rx="29" ry="5"/><g class="stamper-body"><path d="m7 39 47-8 10 28-47 9Z" fill="var(--stamp-color,#d94b50)" stroke="#252832" stroke-width="1"/><path d="m17 61 47-9v7l-47 9Z" fill="#29303c" opacity=".7"/><path d="m7 35 47-8 10 28-47 9Z" fill="url(#stamp-metal)" stroke="#343b49" stroke-width="1.2"/><path d="m17 64 47-9v5l-47 9Z" fill="#566174" stroke="#343b49" stroke-width=".7"/><path d="m7 35 10 29v5L7 41Z" fill="#909baa" stroke="#343b49" stroke-width=".7"/><path d="m11 37 41-7 8 22-40 8Z" fill="none" stroke="#f9fbff" stroke-width="1.2"/><ellipse cx="35" cy="44" rx="15" ry="11" fill="#4d5666" opacity=".35"/><path d="M28 31v13c4 6 13 5 16-1l-2-13Z" fill="#6c442d" stroke="#3d2b22"/><path d="M17 26c-2 13 5 22 18 22s21-11 19-22Z" fill="#4a3024" stroke="#36231d" stroke-width="1"/><ellipse cx="35" cy="26" rx="19" ry="17" fill="url(#stamp-top)" stroke="#3b281f" stroke-width="1.4"/><ellipse cx="35" cy="25" rx="15.5" ry="13.5" fill="none" stroke="#d7ae76" stroke-width=".6" opacity=".55"/><path d="M23 17c5-5 13-6 19-2" fill="none" stroke="#f4d2a1" stroke-width="2" stroke-linecap="round" opacity=".65"/><path d="M27 24c3-2 9-2 13 0M26 29c5-2 12-2 17 0" fill="none" stroke="#4b2c1e" stroke-width=".55" opacity=".3"/></g></svg>`; },
  place(point,event) {
    this.pickerOpen=false;StudioSFX.play('stamp');
    const item=this.item(this.active),symbol=item[4]==='Symbols',w=symbol?85:190,parentEl=event?.target?.closest('.node:not(.stamp)'),parent=parentEl&&board().nodes.find(n=>n.id===parentEl.dataset.node);let el;
    if(parent){
      checkpoint();const style=getComputedStyle(parentEl),origin=style.transformOrigin.split(' ').map(parseFloat),matrix=new DOMMatrix(style.transform==='none'?undefined:style.transform).inverse(),local=matrix.transformPoint(new DOMPoint(point.x-parent.x-origin[0],point.y-parent.y-origin[1]));
      const mark={id:uid(),stampId:item[0],x:local.x+origin[0]-w/2,y:local.y+origin[1]-(symbol?44:35),w,rotation:(Math.random()-.5)*10};if(!Array.isArray(parent.stamps))parent.stamps=[];parent.stamps.push(mark);renderNodes();renderToolOptions();save();el=$('[data-parent="'+parent.id+'"][data-attached-stamp="'+mark.id+'"]');
    }else{const n=addNode('stamp',{x:point.x-w/2,y:point.y-(symbol?44:35)},{title:item[1],stampId:item[0],w,rotation:(Math.random()-.5)*10});el=$('[data-node="'+n.id+'"]');}
    el?.classList.add('stamp-imprint');setTimeout(()=>el?.classList.remove('stamp-imprint'),550);const cursor=$('#stampCursor');if(cursor){cursor.classList.remove('stamp-striking');cursor.getBoundingClientRect();cursor.classList.add('stamp-striking');setTimeout(()=>cursor.classList.remove('stamp-striking'),500)}
  },
  attachments(node) { return (Array.isArray(node.stamps)?node.stamps:[]).filter(m=>m&&typeof m.id==='string'&&Number.isFinite(m.x)&&Number.isFinite(m.y)).map(m=>'<div class="stuck-stamp" data-parent="'+escapeHTML(node.id)+'" data-attached-stamp="'+escapeHTML(m.id)+'" role="button" tabindex="0" aria-label="'+escapeHTML(this.item(m.stampId)[1]+' stamp attached to card')+'" style="left:'+m.x+'px;top:'+m.y+'px;width:'+Math.max(50,Math.min(400,Number(m.w)||190))+'px;transform:rotate('+Math.max(-12,Math.min(12,Number(m.rotation)||0))+'deg)">'+this.art(this.item(m.stampId))+'</div>').join(''); },
  selectAttachment(parentId,id) {
    selectNode(null);this.clearAttachment();this.selectedAttachment={parentId,id};$('[data-parent="'+parentId+'"][data-attached-stamp="'+id+'"]')?.classList.add('selected-attachment');$('#canvas').insertAdjacentHTML('beforeend','<div id="attachedStampActions"><span>Stamp attached to this card</span><button id="deleteAttachedStamp">'+icon('trash')+'Delete stamp</button></div>');$('#deleteAttachedStamp').onclick=()=>this.removeAttachment();
  },
  clearAttachment() { this.selectedAttachment=null;$$('.selected-attachment').forEach(el=>el.classList.remove('selected-attachment'));$('#attachedStampActions')?.remove(); },
  removeAttachment() { const mark=this.selectedAttachment;if(!mark)return;const parent=board().nodes.find(n=>n.id===mark.parentId);if(!parent)return;checkpoint();parent.stamps=(parent.stamps||[]).filter(m=>m.id!==mark.id);this.clearAttachment();renderNodes();save(); },
  bindAttachments() {
    $$('[data-attached-stamp]').forEach(el=>{el.onpointerdown=e=>{if(tool==='stamp')return;e.preventDefault();e.stopPropagation();this.selectAttachment(el.dataset.parent,el.dataset.attachedStamp)};el.onclick=e=>e.stopPropagation();el.ondblclick=e=>e.stopPropagation();el.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();this.selectAttachment(el.dataset.parent,el.dataset.attachedStamp);context(e,[['trash','Delete stamp',()=>this.removeAttachment(),true]])};el.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();this.selectAttachment(el.dataset.parent,el.dataset.attachedStamp)}};});
  },
  move(e) {
    const visible=tool==='stamp'&&e.target.closest('#canvas')&&!e.target.closest('.canvas-bottom,.tool-options');this.point={x:e.clientX,y:e.clientY,visible:!!visible};const c=$('#stampCursor');if(!c)return;c.classList.toggle('visible',!!visible);c.style.left=e.clientX+'px';c.style.top=e.clientY+'px';
  }

};

var WireMagnet = {
  target: null,
  clear() { this.target=null; $$('.socket-ready').forEach(p=>p.classList.remove('socket-ready')); $$('.socket-card-ready').forEach(p=>p.classList.remove('socket-card-ready')); },
  sense(e) {
    if(!boardConnect){this.clear();return null;}
    let best=null;const radius=36;
    for(const p of $$('.node .port')) {
      if(p.closest('.node').dataset.node===boardConnect.id)continue;
      const r=p.getBoundingClientRect(),distance=Math.hypot(e.clientX-r.x-r.width/2,e.clientY-r.y-r.height/2);
      if(distance<=radius&&(!best||distance<best.distance))best={id:p.closest('.node').dataset.node,side:p.dataset.side,port:p,distance};
    }
    if(best) { if(this.target?.id!==best.id||this.target?.side!==best.side){this.clear();this.target=best;best.port.classList.add('socket-ready');best.port.closest('.node').classList.add('socket-card-ready');}return nodeAnchor(best.id,best.side); }
    this.clear();
    return null;
  }
};

var FocusClock = {
  drag: null, audio: null,
  config() {
    if(!state.focusClock||typeof state.focusClock!=='object'||Array.isArray(state.focusClock))state.focusClock={};
    const c=state.focusClock,defaults={visible:false,pin:'screen',x:null,y:98,mode:'clock',minutes:25,alarm:'17:00',running:false,elapsed:0,deadline:null,startedAt:null,ringing:false,backlight:false};
    for(const key of Object.keys(defaults))if(c[key]===undefined)c[key]=defaults[key];
    c.pin=c.pin==='canvas'?'canvas':'screen';c.mode=['clock','countdown','stopwatch','alarm'].includes(c.mode)?c.mode:'clock';c.minutes=Math.max(1,Math.min(1000000,Number(c.minutes)||25));c.alarm=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(c.alarm)?c.alarm:'17:00';
    c.elapsed=Number.isFinite(c.elapsed)?Math.max(0,c.elapsed):0;c.x=Number.isFinite(c.x)?c.x:null;c.y=Number.isFinite(c.y)?c.y:98;
    c.visible=c.visible===true;c.ringing=c.ringing===true;c.running=c.running===true;
    if(c.running&&!(c.mode==='stopwatch'?Number.isFinite(c.startedAt):Number.isFinite(c.deadline)))c.running=false;
    return c;
  },
  nodes() { return state.boards.flatMap(b=>b.nodes.filter(n=>n.type==='clock').map(n=>({node:n,board:b}))); },
  show() { const c=this.config();c.visible=true;if(c.pin==='canvas'){const entry=this.nodes()[0];if(entry){openBoard(entry.board.id);selectNode(entry.node.id);fitBoard()}else this.toCanvas()}this.render();save(); },
  template() {
    const c=this.config(),labels={clock:'Clock',countdown:'Countdown',stopwatch:'Count up',alarm:'Alarm'},short={clock:'CLOCK',countdown:'TIMER',stopwatch:'COUNT UP',alarm:'ALARM'};
    return `<div class="focus-clock digital-device ${c.ringing?'ringing':''} ${c.backlight?'backlit':''}" data-mode="${c.mode}"><div class="clock-drag-handle"><span><i class="clock-power-led"></i>FOCUS <b>•</b> DIGITAL</span><div><button class="icon-btn clock-pin" aria-label="${c.pin==='screen'?'Pin clock to canvas':'Pin clock to screen'}" title="${c.pin==='screen'?'Pin to canvas':'Pin to screen'}">${studioIcon(c.pin==='screen'?'pin':'screen')}</button><button class="icon-btn clock-close" aria-label="Hide clock">${icon('close')}</button></div></div><div class="clock-face-frame"><div class="clock-lcd"><div class="lcd-status"><span>${short[c.mode]}</span><span class="clock-run-status">${c.ringing?'BELL':c.running?'RUN':'STANDBY'}</span></div><div class="clock-digits" role="img" aria-label="Current time"></div><div class="clock-lcd-bottom"><div class="clock-caption"></div><div class="clock-config">${c.mode==='countdown'?`<label><input type="number" min="1" max="1000000" value="${c.minutes}" class="clock-minutes" aria-label="Countdown minutes"><span>MIN</span></label>`:c.mode==='alarm'?`<label><input type="time" class="clock-alarm" value="${c.alarm}" aria-label="Alarm time"></label>`:'<span class="lcd-frequency">QUARTZ</span>'}</div></div></div></div><div class="clock-modes" role="group" aria-label="Clock mode">${Object.entries(labels).map(([m,label])=>`<button data-clock-mode="${m}" class="${c.mode===m?'active':''}" aria-label="${label}" aria-pressed="${c.mode===m}"><span>${m==='countdown'?'TIMER':m==='stopwatch'?'UP':label.toUpperCase()}</span><i></i></button>`).join('')}</div><div class="clock-controls"><button class="clock-hardware-key clock-mode-cycle" aria-label="Next clock mode">MODE</button><button class="clock-hardware-key clock-reset" aria-label="Reset clock">RESET</button>${c.mode==='clock'?'<button class="clock-hardware-key clock-light" aria-label="Toggle clock backlight">LIGHT</button>':`<button class="clock-hardware-key clock-toggle" aria-label="${c.running?'Pause':c.mode==='alarm'?'Set alarm':'Start'}">${c.running?'PAUSE':c.mode==='alarm'?'SET':'START'}</button>`}<button class="clock-hardware-key clock-dismiss ${c.ringing?'':'hidden'}" aria-label="Dismiss alarm">STOP ALARM</button></div><div class="clock-case-footer"><span class="clock-speaker" aria-hidden="true">${'<i></i>'.repeat(9)}</span><span class="clock-pin-hint">${c.pin==='screen'?'SCREEN':'CANVAS'}<b> • </b>RIGHT-CLICK TO PIN</span><span class="clock-case-screw" aria-hidden="true"></span></div><span class="clock-live-status" role="status" aria-live="polite"></span></div>`;
},
  segments(value) {
    const segments={a:'5,1 23,1 27,5 23,9 5,9 1,5',b:'24,10 28,6 28,26 24,30 20,26 20,14',c:'24,32 28,36 28,56 24,60 20,56 20,36',d:'5,57 23,57 27,61 23,65 5,65 1,61',e:'4,32 8,36 8,56 4,60 0,56 0,36',f:'4,6 8,10 8,26 4,30 0,26 0,10',g:'5,29 23,29 27,33 23,37 5,37 1,33'},numbers=['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];let x=0,html='';
    for(const char of String(value)){if(char===':'){html+=`<g transform="translate(${x} 0)"><circle cx="4" cy="23" r="3"/><circle cx="4" cy="46" r="3"/></g>`;x+=12;}else if(/\d/.test(char)){const on=numbers[+char];html+=`<g transform="translate(${x} 0)">${Object.entries(segments).map(([key,points])=>`<polygon points="${points}" class="${on.includes(key)?'segment-on':'segment-off'}"/>`).join('')}</g>`;x+=34;}}
    return `<svg viewBox="0 0 ${Math.max(1,x-6)} 66" aria-hidden="true" class="lcd-segments">${html}</svg>`;
},
  roots() { return $$('.focus-clock'); },
  render() {
    const c=this.config();let el=$('#screenClock');
    if(c.visible&&c.pin==='screen'){if(!el){document.body.insertAdjacentHTML('beforeend','<aside id="screenClock" aria-label="Focus clock widget"></aside>');el=$('#screenClock')}el.innerHTML=this.template();this.clamp();}else el?.remove();
    for(const entry of this.nodes()){const node=$(`[data-node="${entry.node.id}"] .clock-node-body`);if(node)node.innerHTML=this.template();}
    this.bind();this.tick();
  },
  bind() {
    for(const el of this.roots()){
      el.oncontextmenu=e=>{if(e.target.closest('input'))return;e.preventDefault();e.stopPropagation();context(e,[['connect',this.config().pin==='screen'?'Pin to canvas':'Pin to screen',()=>this.togglePin()],['close','Hide clock',()=>this.hide()]]);};
      $$('[data-clock-mode]',el).forEach(b=>b.onclick=()=>{this.silence();const c=this.config();c.mode=b.dataset.clockMode;c.running=false;c.elapsed=0;c.ringing=false;save();this.render()});
      $('.clock-pin',el).onclick=()=>this.togglePin();$('.clock-close',el).onclick=()=>this.hide();
      $('.clock-mode-cycle',el).onclick=()=>{const modes=['clock','countdown','stopwatch','alarm'],next=modes[(modes.indexOf(this.config().mode)+1)%modes.length];$('[data-clock-mode="'+next+'"]',el).click()};
      const light=$('.clock-light',el);if(light)light.onclick=()=>{this.config().backlight=!this.config().backlight;save();this.render()};
      const minutes=$('.clock-minutes',el);if(minutes){minutes.oninput=()=>{const c=this.config();c.minutes=Math.min(1000000,Math.max(1,+minutes.value||1));c.elapsed=0;if(c.running)c.deadline=Date.now()+c.minutes*60000;c.ringing=false;save();this.tick()};minutes.onblur=()=>{minutes.value=this.config().minutes};}
      const alarm=$('.clock-alarm',el);if(alarm)alarm.oninput=()=>{const c=this.config();c.alarm=alarm.value||'17:00';if(c.running){const[h,m]=c.alarm.split(':').map(Number),d=new Date();d.setHours(h,m,0,0);if(d.getTime()<=Date.now())d.setDate(d.getDate()+1);c.deadline=d.getTime();}c.ringing=false;save();this.tick()};
      const toggle=$('.clock-toggle',el);if(toggle)toggle.onclick=()=>this.toggle();
      const reset=$('.clock-reset',el);if(reset)reset.onclick=()=>{this.silence();Object.assign(this.config(),{running:false,elapsed:0,ringing:false,deadline:null,startedAt:null});save();this.render()};
      $('.clock-dismiss',el).onclick=()=>{this.silence();this.config().ringing=false;save();this.render()};
      if(el.closest('#screenClock'))el.onpointerdown=e=>{if(e.button!==0||e.target.closest('button,input,label,a'))return;e.preventDefault();const c=this.config();this.drag={x:e.clientX,y:e.clientY,left:c.x,top:c.y};el.classList.add('clock-dragging');el.setPointerCapture(e.pointerId)};
    }
  },
  clamp() { const el=$('#screenClock'),c=this.config();if(!el)return;const w=el.offsetWidth,h=el.offsetHeight;c.x=Math.max(12,Math.min(window.innerWidth-w-12,c.x??window.innerWidth-w-24));c.y=Math.max(12,Math.min(window.innerHeight-h-12,c.y));el.style.left=c.x+'px';el.style.top=c.y+'px'; },
  hide() { checkpoint();const c=this.config();c.visible=false;c.running=false;c.ringing=false;this.silence();for(const b of state.boards)b.nodes=b.nodes.filter(n=>n.type!=='clock');save();renderNodes();this.render(); },
  togglePin() { this.config().pin==='screen'?this.toCanvas():this.toScreen(); },
  toCanvas() {
    if(tab!=='whiteboard')switchTab('whiteboard');const c=this.config(),r=$('#screenClock')?.getBoundingClientRect();checkpoint();for(const b of state.boards)b.nodes=b.nodes.filter(n=>n.type!=='clock');c.pin='canvas';c.visible=true;
    const p=r?scenePoint({clientX:r.left,clientY:r.top}):{x:(window.innerWidth/2-pan.x)/zoom,y:(120-pan.y)/zoom};
    addNode('clock',p,{title:'Focus clock',w:326,scaleX:1/zoom,scaleY:1/zoom});this.render();save();toast('Clock pinned to the canvas · Right-click to pin to your screen');
  },
  toScreen() {
    const c=this.config(),entry=this.nodes()[0],rect=entry?$(`[data-node="${entry.node.id}"]`)?.getBoundingClientRect():null;checkpoint();if(rect){c.x=rect.left;c.y=rect.top}for(const b of state.boards)b.nodes=b.nodes.filter(n=>n.type!=='clock');c.pin='screen';c.visible=true;renderNodes();this.render();save();
  },
  async unlock() { try{if(!this.audio)this.audio=new(window.AudioContext||window.webkitAudioContext)();await this.audio.resume();}catch{toast('Audio could not start. Check your device output.')} },
  toggle() {
    const c=this.config();this.unlock();this.silence();c.ringing=false;
    if(c.running){c.elapsed=c.mode==='stopwatch'?c.elapsed+Date.now()-c.startedAt:c.mode==='countdown'?c.minutes*60000-Math.max(0,c.deadline-Date.now()):0;c.running=false;}
    else { if(c.mode==='countdown'){if(c.elapsed>=c.minutes*60000)c.elapsed=0;c.deadline=Date.now()+c.minutes*60000-c.elapsed;}else if(c.mode==='stopwatch')c.startedAt=Date.now();else if(c.mode==='alarm'){const [h,m]=c.alarm.split(':').map(Number),d=new Date();d.setHours(h,m,0,0);if(d.getTime()<=Date.now())d.setDate(d.getDate()+1);c.deadline=d.getTime();}c.running=true; }
    save();this.render();
  },
  duration(ms) { const sec=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return (h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); },
  tick() {
    const c=this.config(),now=new Date();if(!c.visible)return;
    if(c.running&&c.mode!=='stopwatch'&&Date.now()>=c.deadline){c.running=false;c.ringing=true;c.elapsed=c.mode==='countdown'?c.minutes*60000:0;save();this.ring();this.render();toast(c.mode==='alarm'?'Your alarm is ringing.':'Focus session complete. Take a breath.');return;}
    for(const el of this.roots()){
      el.classList.toggle('ringing',c.ringing);el.dataset.mode=c.mode;
      const amount=c.mode==='stopwatch'?c.elapsed+(c.running?Date.now()-c.startedAt:0):c.running?c.deadline-Date.now():c.minutes*60000-c.elapsed;
      const parts=(c.mode==='clock'||c.mode==='alarm'?[String(now.getHours()).padStart(2,'0'),String(now.getMinutes()).padStart(2,'0'),String(now.getSeconds()).padStart(2,'0')]:this.duration(amount).split(':'));if(parts.length===2)parts.unshift('00');const value=parts.join(':'),digits=$('.clock-digits',el);if(digits.dataset.value!==value){digits.dataset.value=value;digits.setAttribute('aria-label',value);digits.innerHTML='<span class="lcd-major">'+this.segments(parts.slice(0,-1).join(':'))+'</span><span class="lcd-minor">'+this.segments(parts.at(-1))+'<small>SEC</small></span>'}
      $('.clock-caption',el).textContent=c.ringing?'ALARM • TIME IS UP':c.mode==='clock'?now.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'}):c.mode==='alarm'?(c.running?'Alarm set for '+new Date(c.deadline).toLocaleString([],{weekday:'short',hour:'2-digit',minute:'2-digit'}):'SET ALARM →'):c.mode==='stopwatch'?(c.running?'RECORDING TIME':'READY TO COUNT'):(c.running?'FOCUS SESSION':'SET DURATION →');
      $('.clock-live-status',el).textContent=c.ringing?'Alarm ringing':'';
    }
  },
  ring() { let pulses=0;this.silence();const chime=()=>{if(!this.config().ringing)return;const a=this.audio;if(a?.state==='running'){for(let i=0;i<3;i++){const o=a.createOscillator(),g=a.createGain(),t=a.currentTime+i*.18;o.frequency.value=[660,880,1100][i];g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.12,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.6);o.connect(g).connect(a.destination);o.start(t);o.stop(t+.65);o.onended=()=>{o.disconnect();g.disconnect()};}}if(++pulses>=10)this.silence();};chime();this.ringInterval=setInterval(chime,2200); },
  silence() { clearInterval(this.ringInterval);this.ringInterval=null; },
  init() { this.config();this.render();setInterval(()=>this.tick(),250);window.addEventListener('resize',()=>this.clamp());document.addEventListener('pointermove',e=>{if(!this.drag)return;const c=this.config();c.x=this.drag.left+e.clientX-this.drag.x;c.y=this.drag.top+e.clientY-this.drag.y;this.clamp()});document.addEventListener('pointerup',()=>{if(this.drag){this.drag=null;this.roots().forEach(el=>el.classList.remove('clock-dragging'));save()}});window.addEventListener('blur',()=>{this.drag=null}); }
};

var Soundscape = {
  audio:null, playing:false, layers:{}, voices:new Set(), nextMusic:0,nextBird:0,nextPluck:0,
  tracks:[['music','Ambient keys','Soft, slow chords'],['wind','Wind','Air through the trees'],['birds','Birdsong','A few distant friends'],['water','Flowing water','A gentle stream'],['rain','Rain','A soft window-side shower']],
  prefs() { if(!state.soundscape||typeof state.soundscape!=='object'||Array.isArray(state.soundscape))state.soundscape={};const p=state.soundscape,defaults={master:40,music:55,wind:20,birds:18,water:0,rain:0};for(const[k,v]of Object.entries(defaults))p[k]=Number.isFinite(p[k])?Math.max(0,Math.min(100,p[k])):v;if(!['Quiet studio','Forest morning','Rainy window','By the stream','Your mix'].includes(p.preset))p.preset='Quiet studio';return p; },
  widget() {const p=this.prefs();p.pin=p.pin==='canvas'?'canvas':'screen';p.visible=p.visible===true;p.x=Number.isFinite(p.x)?p.x:null;p.y=Number.isFinite(p.y)?p.y:100;return p;},
  nodes() {return state.boards.flatMap(b=>b.nodes.filter(n=>n.type==='soundscape').map(node=>({node,board:b})));},
  open() {const p=this.widget();p.visible=true;if(p.pin==='canvas'){const entry=this.nodes()[0];if(entry){openBoard(entry.board.id);selectNode(entry.node.id)}else this.toCanvas()}this.render();save();},
  template() {const p=this.widget(),channels=[...this.tracks.map(([id,name])=>[id,name]),['master','Master']];return `<div class="soundscape-device ${this.playing?'is-playing':''}"><div class="mixer-handle"><span><i class="mixer-led"></i>AMBIENCE <b>•</b> SIX CHANNEL MIXER</span><div><button class="mixer-pin icon-btn" aria-label="${p.pin==='screen'?'Pin mixer to canvas':'Pin mixer to screen'}" title="${p.pin==='screen'?'Pin to canvas':'Pin to screen'}">${studioIcon(p.pin==='screen'?'pin':'screen')}</button><button class="mixer-close icon-btn" aria-label="Hide soundscape mixer">${icon('close')}</button></div></div><div class="mixer-display"><div><span class="mixer-display-label">YOUR ATMOSPHERE</span><strong class="mixer-preset-name">${p.preset}</strong><span class="mixer-play-status">${this.playing?'PLAYING':'PAUSED'} · OFFLINE AUDIO</span></div><span class="mixer-meter" aria-hidden="true">${channels.slice(0,5).map(([id])=>`<i data-mix-meter="${id}" style="--level:${p[id]}%"></i>`).join('')}</span></div><div class="mixer-presets" role="group" aria-label="Soundscape presets">${['Quiet studio','Forest morning','Rainy window','By the stream'].map((name,i)=>`<button data-sound-preset="${name}" aria-label="${name}" aria-pressed="${p.preset===name}" class="${p.preset===name?'active':''}"><small>0${i+1}</small>${['STUDIO','FOREST','RAIN','STREAM'][i]}</button>`).join('')}</div><div class="mixer-faders">${channels.map(([id,name],i)=>`<label class="mixer-channel ${id==='master'?'master-channel':''}"><span>${['KEYS','WIND','BIRDS','WATER','RAIN','MAIN'][i]}</span><div class="mixer-fader-track"><input type="range" min="0" max="100" value="${p[id]}" data-sound-layer="${id}" aria-label="${name} volume"></div><output data-mix-output="${id}">${String(p[id]).padStart(2,'0')}</output><small>${i===5?'MASTER':'0'+(i+1)}</small></label>`).join('')}</div><div class="mixer-bottom"><span class="mixer-grille" aria-hidden="true">${'<i></i>'.repeat(12)}</span><button class="mixer-play" aria-label="${this.playing?'Pause atmosphere':'Play atmosphere'}">${icon(this.playing?'pause':'play')}<span>${this.playing?'PAUSE':'PLAY'}</span><i></i></button><span class="mixer-pin-state">${p.pin.toUpperCase()}<br>PINNED</span></div><details class="mixer-credits"><summary>RECORDING CREDITS</summary><p>Birds: kvgarlic, wind: felix.blume, stream: gluckose (CC0). Rain: alex36917 (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>). Loop preparation: Porrumentzio / <a href="https://github.com/rafaelmardojai/blanket/blob/master/SOUNDS_LICENSING.md" target="_blank" rel="noopener">Blanket</a>. Ambient keys generated locally.</p></details></div>`;},
  roots() {return $$('.soundscape-device');},
  render() {const p=this.widget();let el=$('#soundscapePanel');if(p.visible&&p.pin==='screen'){if(!el){document.body.insertAdjacentHTML('beforeend','<aside id="soundscapePanel" aria-label="Soundscape mixer widget"></aside>');el=$('#soundscapePanel')}el.innerHTML=this.template();this.clamp()}else el?.remove();for(const entry of this.nodes()){const body=$('[data-node="'+entry.node.id+'"] .mixer-node-body');if(body)body.innerHTML=this.template()}this.bind();this.refresh();},
  bind() {for(const el of this.roots()){
    $('.mixer-pin',el).onclick=()=>this.togglePin();$('.mixer-close',el).onclick=()=>this.hide();$('.mixer-play',el).onclick=async()=>{await this.toggle();this.refresh()};
    $$('[data-sound-layer]',el).forEach(input=>input.oninput=()=>{this.prefs()[input.dataset.soundLayer]=+input.value;this.prefs().preset='Your mix';this.gains();save();this.refresh(false)});
    $$('[data-sound-preset]',el).forEach(b=>b.onclick=()=>{const p=this.prefs(),values={'Quiet studio':[55,20,18,0,0],'Forest morning':[15,45,65,20,0],'Rainy window':[35,10,0,0,60],'By the stream':[18,20,32,65,0]}[b.dataset.soundPreset];this.tracks.forEach(([id],i)=>p[id]=values[i]);p.preset=b.dataset.soundPreset;this.gains();save();this.render()});
    el.oncontextmenu=e=>{if(e.target.closest('a,summary'))return;e.preventDefault();e.stopPropagation();context(e,[['connect',this.widget().pin==='screen'?'Pin to canvas':'Pin to screen',()=>this.togglePin()],['close','Hide mixer',()=>this.hide()]])};
    const credits=$('.mixer-credits',el);credits.ontoggle=()=>this.clamp();
    if(el.closest('#soundscapePanel'))el.onpointerdown=e=>{if(e.button!==0||e.target.closest('button,input,label,a,summary,details'))return;e.preventDefault();const p=this.widget();this.drag={x:e.clientX,y:e.clientY,left:p.x,top:p.y};el.classList.add('mixer-dragging');el.setPointerCapture(e.pointerId)};
  }},
  refresh() {const p=this.prefs();for(const el of this.roots()){el.classList.toggle('is-playing',this.playing);$('.mixer-preset-name',el).textContent=p.preset;$('.mixer-play-status',el).textContent=(this.playing?'PLAYING':'PAUSED')+' · OFFLINE AUDIO';const play=$('.mixer-play',el);play.innerHTML=icon(this.playing?'pause':'play')+'<span>'+(this.playing?'PAUSE':'PLAY')+'</span><i></i>';play.setAttribute('aria-label',this.playing?'Pause atmosphere':'Play atmosphere');$$('[data-mix-output]',el).forEach(out=>out.textContent=String(p[out.dataset.mixOutput]).padStart(2,'0'));$$('[data-mix-meter]',el).forEach(bar=>bar.style.setProperty('--level',p[bar.dataset.mixMeter]+'%'));$$('[data-sound-layer]',el).forEach(input=>input.value=p[input.dataset.soundLayer]);$$('[data-sound-preset]',el).forEach(b=>{b.classList.toggle('active',b.dataset.soundPreset===p.preset);b.setAttribute('aria-pressed',String(b.dataset.soundPreset===p.preset))})}$$('[data-tool="sound"]').forEach(b=>b.classList.toggle('audio-playing',this.playing));},
  clamp() {const el=$('#soundscapePanel'),p=this.widget();if(!el)return;p.x=Math.max(12,Math.min(window.innerWidth-el.offsetWidth-12,p.x??24));p.y=Math.max(12,Math.min(window.innerHeight-el.offsetHeight-12,p.y));el.style.left=p.x+'px';el.style.top=p.y+'px';},
  togglePin() {this.widget().pin==='screen'?this.toCanvas():this.toScreen();},
  toCanvas() {if(tab!=='whiteboard')switchTab('whiteboard');const p=this.widget(),r=$('#soundscapePanel')?.getBoundingClientRect();checkpoint();for(const b of state.boards)b.nodes=b.nodes.filter(n=>n.type!=='soundscape');p.pin='canvas';p.visible=true;const point=r?scenePoint({clientX:r.left,clientY:r.top}):{x:(window.innerWidth/2-pan.x)/zoom,y:(120-pan.y)/zoom};addNode('soundscape',point,{title:'Atmosphere mixer',w:356,scaleX:1/zoom,scaleY:1/zoom});this.render();save();toast('Mixer pinned to canvas · Right-click to pin to screen');},
  toScreen() {const p=this.widget(),entry=this.nodes()[0],r=entry?$('[data-node="'+entry.node.id+'"]')?.getBoundingClientRect():null;checkpoint();if(r){p.x=r.left;p.y=r.top}for(const b of state.boards)b.nodes=b.nodes.filter(n=>n.type!=='soundscape');p.pin='screen';p.visible=true;renderNodes();this.render();save();},
  hide() {checkpoint();this.widget().visible=false;for(const b of state.boards)b.nodes=b.nodes.filter(n=>n.type!=='soundscape');renderNodes();this.render();save();},
  init() {this.widget();this.render();window.addEventListener('resize',()=>this.clamp());document.addEventListener('pointermove',e=>{if(!this.drag)return;const p=this.widget();p.x=this.drag.left+e.clientX-this.drag.x;p.y=this.drag.top+e.clientY-this.drag.y;this.clamp()});document.addEventListener('pointerup',()=>{if(this.drag){this.drag=null;this.roots().forEach(el=>el.classList.remove('mixer-dragging'));save()}});window.addEventListener('blur',()=>this.drag=null);},
  async setup() {
    if(this.audio)return;const a=this.audio=new(window.AudioContext||window.webkitAudioContext)();this.master=a.createGain();this.master.gain.value=0;
    const limiter=a.createDynamicsCompressor();limiter.threshold.value=-18;limiter.knee.value=16;limiter.ratio.value=5;this.master.connect(limiter).connect(a.destination);
    for(const[id]of this.tracks){const g=a.createGain();g.gain.value=0;g.connect(this.master);this.layers[id]=g;}
    this.recordings={};for(const[id,file]of Object.entries({wind:'wind',birds:'birds',water:'stream',rain:'rain'})){const media=new Audio('./audio/'+file+'.ogg');media.loop=true;media.preload='metadata';this.recordings[id]=media;a.createMediaElementSource(media).connect(this.layers[id]);}
    this.scheduler=setInterval(()=>this.schedule(),400);
  },
  gains() { if(!this.audio)return;const p=this.prefs(),t=this.audio.currentTime;this.master.gain.setTargetAtTime(this.playing?p.master/100*.6:0,t,.15);for(const[id]of this.tracks)this.layers[id].gain.setTargetAtTime(p[id]/100,t,.25); },
  async toggle() {
    try { await this.setup();clearTimeout(this.pauseTimeout);
      if(this.playing){this.playing=false;this.gains();this.pauseTimeout=setTimeout(()=>{if(!this.playing){Object.values(this.recordings).forEach(m=>m.pause());for(const v of this.voices){try{v.stop()}catch{}}this.audio.suspend()}},700);}
      else {await this.audio.resume();await Promise.all(Object.values(this.recordings).map(m=>m.play()));this.playing=true;this.nextMusic=this.audio.currentTime+.08;this.nextPluck=this.audio.currentTime+.4;this.gains();this.schedule();}
    }catch{this.playing=false;Object.values(this.recordings||{}).forEach(m=>m.pause());this.gains();toast('Nature recordings could not load. Please reopen the app and try again.');}
  },
  voice(freq,start,duration,volume,layer='music',slide=null) { const a=this.audio,o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(freq,start);if(slide)o.frequency.exponentialRampToValueAtTime(slide,start+duration*.65);g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(volume,start+Math.min(.4,duration*.2));g.gain.exponentialRampToValueAtTime(.0001,start+duration);o.connect(g).connect(this.layers[layer]);o.start(start);o.stop(start+duration+.05);this.voices.add(o);o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect()}; },
  schedule() {
    const a=this.audio;if(!a||!this.playing||a.state!=='running')return;const now=a.currentTime;
    if(this.nextMusic<now+1.2){const chords=[[130.81,164.81,196,246.94],[110,164.81,220,261.63],[87.31,130.81,174.61,220],[98,146.83,196,246.94]],chord=chords[(this.chord||0)%chords.length];const t=Math.max(now+.02,this.nextMusic);chord.forEach((f,i)=>this.voice(f,t+i*.12,14,.075));this.chord=(this.chord||0)+1;this.nextMusic=t+11;}
    if(this.nextPluck<now+1.2){const notes=[523.25,587.33,659.25,783.99,880],t=Math.max(now+.02,this.nextPluck);this.voice(notes[Math.floor(Math.random()*notes.length)],t,3.8,.055);this.nextPluck=t+2.4+Math.random()*1.2;}
  }
};

var StudioPointer = {
  pressed:false, mode:null,
  init() {
    document.body.insertAdjacentHTML('beforeend','<div id="studioPointer" aria-hidden="true"></div>');document.body.classList.add('use-studio-pointer');
    document.addEventListener('pointermove',e=>this.move(e));
    document.addEventListener('pointerdown',e=>{if(e.button===0)this.pressed=true;this.move(e)},true);
    document.addEventListener('pointerup',e=>{this.pressed=false;this.move(e)},true);
    document.addEventListener('pointerleave',()=>$('#studioPointer')?.classList.remove('visible'));
    window.addEventListener('blur',()=>{this.pressed=false;$('#studioPointer')?.classList.remove('visible')});
  },
  move(e) {
    this.last=e;const pointer=$('#studioPointer');if(!pointer)return;pointer.style.translate=e.clientX+'px '+e.clientY+'px';const releasing=$('#wireDragHand.releasing');if(releasing){releasing.style.translate=(e.clientX-8.5)+'px '+(e.clientY-17)+'px';releasing.classList.toggle('gripping',this.pressed);}
    const editing=e.target.closest('textarea,[contenteditable="plaintext-only"],input:not([type="range"]):not([type="color"]):not([type="checkbox"])');
    const canvas=e.target.closest('#canvas'),drawing=canvas&&!e.target.closest('.tool-options,.canvas-bottom');
    const resize=drag?.type==='transform'?drag.dir:e.target.closest('[data-resize]')?.dataset.resize;const resizeMode=resize?(resize==='n'||resize==='s'?'ns':resize==='e'||resize==='w'?'ew':resize==='ne'||resize==='sw'?'nesw':'nwse'):null;const mode=resizeMode?'resize-'+resizeMode:editing?'text':drawing&&tool==='pen'?'pen':document.body.classList.contains('wire-cut-mode')||drawing&&tool==='cut'||tab==='structure'&&ContentCamera.cut&&e.target.closest('#structureBody')&&!e.target.closest('.date-rail,.content-zoom-control')?'knife':e.target.closest('.port,.topic-port')&&!(tab==='whiteboard'&&['note','stamp','pen','text'].includes(tool))?'socket':drawing&&['note','stamp'].includes(tool)?'hidden':CalendarUI.drag?.moved?'hand':e.target.closest('button:not(.port):not(.topic-port),a,summary,[role="button"],input[type="checkbox"]')?'press':!e.target.closest('.stuck-stamp')&&e.target.closest('.node,.focus-clock,.soundscape-device,.topic-card,.calendar-topic')||drawing&&(tool==='hand'||spacePressed||this.pressed)?'hand':'arrow';
    if(mode!==this.mode){this.mode=mode;pointer.className='studio-pointer cursor-'+mode;pointer.innerHTML=mode.startsWith('resize-')?'<svg viewBox="0 0 24 24"><path d="M3 12h18M7 7l-5 5 5 5M17 7l5 5-5 5" fill="none" stroke="#25252c" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 12h18M7 7l-5 5 5 5M17 7l5 5-5 5" fill="none" stroke="#fafaff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>':mode==='socket'?'<svg viewBox="0 0 48 48" aria-hidden="true"><g transform="translate(48 0) scale(-1 1)"><path d="M2 13h8L29 3c5-2 12-2 14 2 2 5-2 8-6 8h-7l8 6c4 3 5 7 2 10-3 4-7 2-10 0l-6-4-2 4 5 7c2 3 0 7-4 7-2 0-3-1-4-2L9 32H2" fill="#fafaff" stroke="#34343c" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><path d="m30 13-6 3m1 8 4-4" fill="none" stroke="#8d8d97" stroke-width="1" stroke-linecap="round"/></g></svg>':mode==='press'?'<svg viewBox="0 0 42 48" aria-hidden="true"><g transform="rotate(-13 20 24)"><path d="M11 23V6a3 3 0 0 1 6 0v11a3 3 0 0 1 6 0v2a3 3 0 0 1 6 0v2a3 3 0 0 1 6 0v8c0 5-3 8-2 13H18c-1-6-5-10-10-14l-4-4c-4-4 0-8 4-5l5 5" fill="#fafaff" stroke="#34343c" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/></g></svg>':mode==='hand'?CanvasEditor.handSVG():mode==='pen'?'<img src="./pen-cursor.svg" alt="">':mode==='knife'?'<img src="./knife-cursor.svg" alt="">':'<svg viewBox="0 0 24 28"><path d="M3 2v22l6-6 5 9 4-2-5-9h9Z" fill="#f7f7fb" stroke="#29292f" stroke-width="1.4" stroke-linejoin="round"/></svg>';}
    pointer.style.setProperty('--hand-scale',Math.max(.65,Math.min(1,Math.sqrt(tab==='structure'?ContentCamera.zoom:zoom))));pointer.classList.toggle('visible',!['hidden','text'].includes(mode));pointer.classList.toggle('gripping',this.pressed);
  }
};

var CreativeStudio = {
  cancelPlacement() {
    if(drag?.type==='shapeDraw'){const id=drag.node.id;board().nodes=board().nodes.filter(n=>n.id!==id);drag=null;history.pop();renderNodes();updateHistory();save()}
    CanvasEditor.finish();document.activeElement?.blur?.();selectNode(null);setTool('select');$('#toolOptions').innerHTML='';
  },
  init() {
    FocusClock.init();Soundscape.init();StudioPointer.init();document.addEventListener('pointerdown',()=>StudioSFX.unlock(),{once:true,capture:true});
    document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.matches('.port,.topic-port'))return;const toolKey=b.dataset.tool;requestAnimationFrame(()=>{const current=toolKey?$('[data-tool="'+toolKey+'"]'):b;if(!current?.isConnected)return;current.classList.remove('button-press');current.getBoundingClientRect();current.classList.add('button-press');setTimeout(()=>current.classList.remove('button-press'),240)})},true);
    document.addEventListener('pointermove',e=>StampKit.move(e));
    document.addEventListener('pointerdown',e=>{if(!e.target.closest('.stuck-stamp,#attachedStampActions,#contextMenu'))StampKit.clearAttachment()},true);
    document.addEventListener('keydown',e=>{if(StampKit.selectedAttachment&&!isEditing()&&['Delete','Backspace'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();StampKit.removeAttachment()}else if(e.key==='Escape')StampKit.clearAttachment()},true);
    document.addEventListener('pointerdown',e=>{if(e.button===2&&['shape','note','stamp','text'].includes(tool)&&e.target.closest('#canvas')){e.preventDefault();e.stopImmediatePropagation();CanvasSelection.suppressContextUntil=Date.now()+500;this.cancelPlacement()}},true);
    document.addEventListener('keydown',e=>{if(tab==='whiteboard'&&e.key==='Escape'&&['shape','note','stamp','text','cut'].includes(tool)){e.preventDefault();e.stopImmediatePropagation();this.cancelPlacement()}},true);
  }
};

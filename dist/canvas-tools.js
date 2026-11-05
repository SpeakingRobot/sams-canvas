/* Screen-fixed content camera and selectable freehand drawing objects. */
var ContentCamera = {
  zoom:1, frame:0, target:null, cut:false,
  setCut(active) { this.cut=!!active;cancelConnections();$('#contentCutWires')?.classList.toggle('selected',this.cut);$('#contentCutWires')?.setAttribute('aria-pressed',String(this.cut));$('#contentSelect')?.classList.toggle('selected',!this.cut); },
  apply() {
    const cards=$('#topicCards'),field=$('#topicField'),rail=$('.date-rail');
    $('#structureBody').style.setProperty('--date-rail-size',rail.offsetWidth+'px');
    cards.style.position='absolute';cards.style.transform='none';cards.style.zoom=this.zoom;cards.style.left=topicPan.x/this.zoom+'px';cards.style.top=topicPan.y/this.zoom+'px';
    field.style.backgroundPosition=topicPan.x+'px '+topicPan.y+'px';field.style.backgroundSize=19*this.zoom+'px '+19*this.zoom+'px';
    if($('#contentZoomValue'))$('#contentZoomValue').textContent=Math.round(this.zoom*100)+'%';
  },
  move(x,y,z) {
    this.target={x,y,z};if(this.frame)return;const tick=()=>{const ease=reduceMotion()?1:.32;topicPan.x+=(this.target.x-topicPan.x)*ease;topicPan.y+=(this.target.y-topicPan.y)*ease;this.zoom+=(this.target.z-this.zoom)*ease;this.apply();renderScheduleWires();if(Math.abs(topicPan.x-this.target.x)+Math.abs(topicPan.y-this.target.y)+Math.abs(this.zoom-this.target.z)*100>.08)this.frame=requestAnimationFrame(tick);else{topicPan={x:this.target.x,y:this.target.y};this.zoom=this.target.z;this.frame=0;this.apply();renderScheduleWires()}};this.frame=requestAnimationFrame(tick);
  },
  by(factor,point) {
    stopDragMotion();const r=$('#topicField').getBoundingClientRect(),base=this.frame?this.target:{...topicPan,z:this.zoom},x=point?point.x-r.left:r.width/2,y=point?point.y-r.top:r.height/2,z=Math.max(.3,Math.min(1.8,base.z*factor));
    this.move(x-(x-base.x)*z/base.z,y-(y-base.y)*z/base.z,z);
  },
  fit() {
    const field=$('#topicField'),nodes=state.topics;if(!nodes.length){this.move(0,0,1);return}const left=Math.min(0,...nodes.map(n=>n.x??40)),top=Math.min(0,...nodes.map(n=>n.y??82)),right=Math.max(...nodes.map(n=>(n.x??40)+310)),bottom=Math.max(...nodes.map(n=>(n.y??82)+240)),z=Math.max(.3,Math.min(1,(field.clientWidth-80)/(right-left),(field.clientHeight-170)/(bottom-top)));this.move(40-left*z,85-top*z,z);
  },
  init() {
    $('#structureBody').append($('#scheduleWires'));$('#topicField').insertAdjacentHTML('beforeend','<div class="content-zoom-control zoom-control"><button class="icon-btn selected" id="contentSelect" aria-label="Select content · V" title="Select · V">'+icon('cursor')+'</button><button class="icon-btn" id="contentCutWires" aria-label="Cut content wires · K" aria-pressed="false" title="Cut wires · K">'+icon('knife')+'</button><span class="divider"></span><button class="icon-btn" id="contentZoomOut" aria-label="Zoom content out">'+icon('minus')+'</button><span id="contentZoomValue">100%</span><button class="icon-btn" id="contentZoomIn" aria-label="Zoom content in">'+icon('plus')+'</button><span class="divider"></span><button class="icon-btn" id="fitContent" aria-label="Fit content board">'+icon('fit')+'</button></div>');
    $('#contentSelect').onclick=()=>this.setCut(false);$('#contentCutWires').onclick=()=>this.setCut(!this.cut);
    $('#structureBody').addEventListener('pointerdown',e=>{if(e.target.closest('.date-rail,.content-zoom-control'))return;if(e.button===2){e.stopPropagation();if(this.cut){e.preventDefault();CanvasSelection.suppressContextUntil=Date.now()+400;this.setCut(false)}else CanvasSelection.rightStart(e,'schedule');return}if(e.button===0&&this.cut){e.stopPropagation();startWireCut(e,'schedule')}},true);
    $('#structureBody').addEventListener('contextmenu',e=>{if(Date.now()<CanvasSelection.suppressContextUntil){e.preventDefault();e.stopPropagation()}},true);
    document.addEventListener('keydown',e=>{if(tab!=='structure'||isEditing())return;if(e.key==='Escape'){this.setCut(false);return}if(!e.ctrlKey&&!e.metaKey&&['k','v'].includes(e.key.toLowerCase())){e.preventDefault();this.setCut(e.key.toLowerCase()==='k')}});
    $('#contentZoomOut').onclick=()=>this.by(1/1.15);$('#contentZoomIn').onclick=()=>this.by(1.15);$('#fitContent').onclick=()=>this.fit();
  }
};

var InkSelection = {
  bounds(stroke) { const p=stroke.points,half=Math.max(.5,stroke.size||3)/2,left=Math.min(...p.map(p=>p[0]))-half,top=Math.min(...p.map(p=>p[1]))-half,right=Math.max(...p.map(p=>p[0]))+half,bottom=Math.max(...p.map(p=>p[1]))+half;return{x:left,y:top,w:Math.max(1,right-left),h:Math.max(1,bottom-top)}; },
  items() {
    return board().strokes.filter(s=>s.points?.length).map(stroke=>{if(!stroke.id)stroke.id=uid();const bounds=this.bounds(stroke),item={id:'ink:'+stroke.id,type:'ink',stroke,w:bounds.w,h:bounds.h};
      Object.defineProperties(item,{x:{get:()=>this.bounds(stroke).x,set:value=>{const delta=value-this.bounds(stroke).x;stroke.points.forEach(p=>p[0]+=delta)}},y:{get:()=>this.bounds(stroke).y,set:value=>{const delta=value-this.bounds(stroke).y;stroke.points.forEach(p=>p[1]+=delta)}}});return item;});
  },
  selected() { return board().strokes.filter(s=>CanvasSelection.ids.has('ink:'+s.id)); },
  hasSelected() { return this.selected().length>0; },
  render() {
    if(board().nodes.length||board().strokes.length)$('.empty-board-note')?.remove();
    const html=board().strokes.filter(s=>s.points?.length).map(s=>{if(!s.id)s.id=uid();const d=s.points.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' '),size=Math.max(.5,Math.min(1000,s.size||3));return '<path d="'+d+'" fill="none" stroke="'+validColor(s.color)+'" stroke-width="'+size+'" stroke-linecap="round" stroke-linejoin="round"/><path class="ink-hit" data-stroke="'+s.id+'" d="'+d+'" fill="none" stroke="transparent" stroke-width="'+Math.max(size,12/zoom)+'" stroke-linecap="round" stroke-linejoin="round" aria-label="Pen drawing"/>'}).join('');
    $('#inkLayer').innerHTML=html+'<g id="inkSelectionBounds"></g>';$$('[data-stroke]').forEach(el=>{el.onpointerdown=e=>this.down(e,el.dataset.stroke);el.oncontextmenu=e=>CanvasSelection.context(e,'ink:'+el.dataset.stroke)});this.renderBounds();
  },
  renderBounds() {
    const group=$('#inkSelectionBounds');if(!group)return;group.innerHTML=this.items().filter(n=>CanvasSelection.ids.has(n.id)).map(n=>'<rect x="'+n.x+'" y="'+n.y+'" width="'+n.w+'" height="'+n.h+'" rx="3" fill="none" stroke="var(--accent)" stroke-width="'+1.2/zoom+'" pointer-events="none"/>').join('');
  },
  down(e,id) {
    if(e.button===2){e.preventDefault();e.stopPropagation();CanvasSelection.rightStart(e,'board');return}if(e.button!==0||tool!=='select')return;e.preventDefault();e.stopPropagation();
    if(e.shiftKey){CanvasSelection.start(e,e.ctrlKey||e.metaKey?'lasso':'rectangle');return}CanvasSelection.focusCanvas();const key='ink:'+id;if(!CanvasSelection.ids.has(key))selectNode(key);checkpoint();const item=this.items().find(n=>n.id===key);drag={type:'node',node:item,startX:e.clientX,startY:e.clientY,x:item.x,y:item.y,moved:false,group:CanvasSelection.items().filter(n=>CanvasSelection.ids.has(n.id)&&n.id!==key).map(node=>({node,x:node.x,y:node.y}))};$('#canvas').setPointerCapture?.(e.pointerId);
  },
  cloneSelected(offset=35) { return this.selected().map(stroke=>({...clone(stroke),id:uid(),points:stroke.points.map(p=>[p[0]+offset,p[1]+offset])})); },
  import(strokes) { return (Array.isArray(strokes)?strokes:[]).slice(0,2000).filter(s=>s&&Array.isArray(s.points)&&s.points.length>0&&s.points.length<=50000&&s.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))).map(s=>({id:uid(),color:validColor(s.color),size:Math.max(.5,Math.min(1000,Number(s.size)||3)),points:s.points.map(p=>[p[0]+35,p[1]+35])})); }
};

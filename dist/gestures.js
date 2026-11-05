/* Selection, lasso, right-drag wire cutting, and non-overlapping arrangement. */
var CanvasSelection = {
  ids: new Set(), showFormat: false, suppressContextUntil: 0, arrangement: 0,
  focusCanvas() { CanvasEditor.finish(); document.activeElement?.blur?.(); $('#canvas').focus({ preventScroll: true }); },
  items() { return [...board().nodes,...InkSelection.items()]; },
  one(id) { this.ids = new Set(id ? [id] : []); this.showFormat = false; selectedNode = board().nodes.some(n=>n.id===id)?id:null; this.render(); },
  render() {
    const valid = new Set(this.items().map(n => n.id));
    this.ids = new Set([...this.ids].filter(id => valid.has(id)));
    $$('.node').forEach(el => el.classList.toggle('selected', this.ids.has(el.dataset.node)));
    $('#canvas').classList.toggle('multi-selection', this.ids.size > 1);InkSelection.renderBounds();
    let actions = $('#selectionActions');
    if ((this.ids.size > 1 || this.showFormat) && this.ids.size) {
      if (!actions) { $('#canvas').insertAdjacentHTML('beforeend', '<div id="selectionActions" class="selection-actions"></div>'); actions = $('#selectionActions'); }
      actions.innerHTML = `<span>${this.ids.size} selected</span><button class="primary-btn" id="formatSelection">${icon('fit')}Format selection</button><button class="icon-btn" id="clearCanvasSelection" aria-label="Clear selection">${icon('close')}</button>`;
      $('#formatSelection').onclick = () => this.arrange();
      $('#clearCanvasSelection').onclick = () => selectNode(null);
    } else actions?.remove();
  },
  all() { this.focusCanvas(); if (tool !== 'select') setTool('select'); this.ids = new Set(this.items().map(n => n.id)); this.showFormat = true; selectedNode = null; this.render(); renderToolOptions(); renderBoardWires(); },
  bounds(node) { if(node.type==='ink')return{x:node.x,y:node.y,w:node.w,h:node.h};const el = $(`[data-node="${node.id}"]`), s = nodeScale(node); return { x: node.x, y: node.y, w: node.w * s.x, h: (el?.offsetHeight || node.h || 150) * s.y }; },
  start(e, mode) {
    e.preventDefault(); e.stopPropagation(); this.focusCanvas(); cancelConnections();
    const point = scenePoint(e), rect = $('#canvas').getBoundingClientRect();
    drag = { type: 'selection', mode, origin: point, points: [point], screen: [[e.clientX - rect.left, e.clientY - rect.top]], previous: new Set(this.ids) };
    this.ids.clear(); this.showFormat = false; selectedNode = null; this.render();
    $('#selectionOverlay')?.remove();
    $('#canvas').insertAdjacentHTML('beforeend', '<svg id="selectionOverlay" aria-hidden="true"><path/></svg>');
    $('#canvas').classList.add(mode === 'lasso' ? 'lasso-selecting' : 'box-selecting');
  },
  contains(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || 1) + a.x) inside = !inside;
    }
    return inside;
  },
  move(e) {
    const d = drag, point = scenePoint(e), rect = $('#canvas').getBoundingClientRect(), screen = [e.clientX - rect.left, e.clientY - rect.top];
    if (d.mode === 'lasso') {
      if (Math.hypot(point.x - d.points.at(-1).x, point.y - d.points.at(-1).y) > 3 / zoom) { d.points.push(point); d.screen.push(screen); }
      $('#selectionOverlay path').setAttribute('d', d.screen.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ') + ' Z');
      this.ids = new Set(this.items().filter(n => { const b = this.bounds(n); return this.contains({ x: b.x + b.w / 2, y: b.y + b.h / 2 }, d.points); }).map(n => n.id));
    } else {
      const x = Math.min(d.origin.x, point.x), y = Math.min(d.origin.y, point.y), w = Math.abs(point.x - d.origin.x), h = Math.abs(point.y - d.origin.y);
      const a = d.screen[0], left = Math.min(a[0], screen[0]), top = Math.min(a[1], screen[1]), sw = Math.abs(screen[0] - a[0]), sh = Math.abs(screen[1] - a[1]);
      $('#selectionOverlay path').setAttribute('d', `M ${left} ${top} h ${sw} v ${sh} h ${-sw} Z`);
      this.ids = new Set(this.items().filter(n => { const b = this.bounds(n); return b.x < x + w && b.x + b.w > x && b.y < y + h && b.y + b.h > y; }).map(n => n.id));
    }
    this.showFormat = this.ids.size > 1; this.render();
  },
  finish() {
    $('#selectionOverlay')?.remove(); $('#canvas').classList.remove('box-selecting', 'lasso-selecting');
    selectedNode = this.ids.size === 1 && board().nodes.some(n=>n.id===[...this.ids][0]) ? [...this.ids][0] : null; this.showFormat = this.ids.size > 1; drag = null;
    this.render(); renderToolOptions(); renderBoardWires();
  },
  rightStart(e, kind = 'board') {
    e.preventDefault(); this.focusCanvas();
    drag = { type: 'rightPending', kind, startX: e.clientX, startY: e.clientY, original: e };
  },
  context(e, id) {
    e.preventDefault(); e.stopPropagation();
    if (Date.now() < this.suppressContextUntil) return;
    if (id && !this.ids.has(id)) selectNode(id);
    const count = this.ids.size;
    const items = [['fit', count > 1 ? `Format ${count} selected objects` : 'Format on canvas', () => this.arrange()]];
    if (count === 1) {
      const itemId = [...this.ids][0];
      if(itemId.startsWith('ink:'))items.push(['copy','Duplicate drawing',()=>this.duplicate()]);else items.push(['text', 'Edit object', () => { const n = board().nodes.find(n => n.id === itemId); if (['text', 'note', 'sticky', 'shape', 'table'].includes(n?.type)) CanvasEditor.edit(itemId); else editNode(itemId); }], ['copy', 'Duplicate', () => duplicateNode(itemId)], ['connect', 'Disconnect wires', () => disconnectNode(itemId)]);
    }
    if (count) items.push(['trash', count > 1 ? `Delete ${count} objects` : 'Delete object', () => this.remove(), true]);
    if (count) context(e, items);
  },
  remove() {
    if (!this.ids.size) return; checkpoint(); const ids = new Set(this.ids);
    board().nodes = board().nodes.filter(n => !ids.has(n.id));board().strokes=board().strokes.filter(s=>!ids.has('ink:'+s.id)); board().edges = board().edges.filter(e => !ids.has(e.from) && !ids.has(e.to));
    this.ids.clear(); selectedNode = null; this.showFormat = false; renderNodes(); renderInk(); renderToolOptions(); save(); toast('Selection removed · Ctrl Z to undo');
  },
  duplicate() {
    const selected = board().nodes.filter(n => this.ids.has(n.id) && n.type !== 'sequencer' && n.type !== 'clock'); const strokes=InkSelection.cloneSelected();if (!selected.length&&!strokes.length) return;
    checkpoint(); const map = new Map();
    for (const node of selected) { const copy = clone(node); copy.id = uid(); copy.x += 35; copy.y += 35; map.set(node.id, copy.id); board().nodes.push(copy); }
    const edges = board().edges.filter(e => map.has(e.from) && map.has(e.to)).map(e => ({ ...e, id: uid(), from: map.get(e.from), to: map.get(e.to) })); board().edges.push(...edges);
    board().strokes.push(...strokes);this.ids = new Set([...map.values(),...strokes.map(s=>'ink:'+s.id)]); selectedNode = null; this.showFormat = true; renderNodes(); renderInk(); renderToolOptions(); save();
  },
  copy(e, cut) {
    const nodes = board().nodes.filter(n => this.ids.has(n.id)),strokes=InkSelection.selected(); if (!nodes.length&&!strokes.length) return;
    const payload = { kind: 'selection', nodes: clone(nodes), strokes:clone(strokes), edges: clone(board().edges.filter(edge => this.ids.has(edge.from) && this.ids.has(edge.to))) };
    e.clipboardData.setData('application/x-threadline', JSON.stringify(payload)); e.clipboardData.setData('text/plain', nodes.map(n => n.plainText || n.title).join('\n\n')); e.preventDefault();
    if (cut) this.remove(); else toast(`${nodes.length+strokes.length} objects copied`);
  },
  paste(payload) {
    if (!Array.isArray(payload.nodes) || payload.nodes.length > 2000) return;
    const nodes = payload.nodes.filter(n => n && n.type !== 'sequencer' && n.type !== 'clock' && ['text', 'note', 'sticky', 'image', 'video', 'link', 'table', 'shape', 'stamp'].includes(n.type) && Number.isFinite(n.x) && Number.isFinite(n.y) && Number.isFinite(n.w));
    const strokes=InkSelection.import(payload.strokes);if (!nodes.length&&!strokes.length) return; checkpoint(); const map = new Map();
    for (const item of nodes) { const n = clone(item); n.id = uid(); n.x += 35; n.y += 35; map.set(item.id, n.id); board().nodes.push(n); }
    for (const edge of payload.edges || []) if (map.has(edge.from) && map.has(edge.to)) board().edges.push({ ...edge, id: uid(), from: map.get(edge.from), to: map.get(edge.to) });
    board().strokes.push(...strokes);this.ids = new Set([...map.values(),...strokes.map(s=>'ink:'+s.id)]); this.showFormat = true; selectedNode = null; renderNodes(); renderInk(); renderToolOptions(); save();
  },
  cancelArrangement() { if (this.arrangement) { cancelAnimationFrame(this.arrangement); this.arrangement = 0; save(); } },
  layout(nodes) {
    const ids=new Set(nodes.map(n=>n.id)),edges=board().edges.filter(e=>ids.has(e.from)&&ids.has(e.to)&&e.from!==e.to),boxes=new Map(nodes.map(n=>[n.id,this.bounds(n)])),byId=new Map(nodes.map(n=>[n.id,n]));
    const adjacent=new Map(nodes.map(n=>[n.id,[]]));for(const e of edges){adjacent.get(e.from).push(e.to);adjacent.get(e.to).push(e.from)}
    const visited=new Set(),components=[];for(const n of nodes){if(visited.has(n.id))continue;const todo=[n.id],component=[];visited.add(n.id);while(todo.length){const id=todo.shift();component.push(id);for(const other of adjacent.get(id))if(!visited.has(other)){visited.add(other);todo.push(other)}}components.push(component)}
    components.sort((a,b)=>b.length-a.length);const left=Math.min(...nodes.map(n=>n.x)),top=Math.min(...nodes.map(n=>n.y)),targets=[];let componentY=top,maxWidth=600;
    for(const component of components.filter(c=>c.length>1)){
      const set=new Set(component),links=edges.filter(e=>set.has(e.from)&&set.has(e.to)),incoming=new Map(component.map(id=>[id,[]])),outgoing=new Map(component.map(id=>[id,[]]));for(const e of links){if(!outgoing.get(e.from).includes(e.to)){outgoing.get(e.from).push(e.to);incoming.get(e.to).push(e.from)}}
      const degree=new Map(component.map(id=>[id,incoming.get(id).length])),ranks=new Map(component.map(id=>[id,0])),queue=component.filter(id=>degree.get(id)===0),done=new Set();
      while(queue.length){const id=queue.shift();done.add(id);for(const next of outgoing.get(id)){ranks.set(next,Math.max(ranks.get(next),ranks.get(id)+1));degree.set(next,degree.get(next)-1);if(degree.get(next)===0)queue.push(next)}}
      let cycleRank=Math.max(...ranks.values());for(const id of component)if(!done.has(id))ranks.set(id,cycleRank++);
      const layers=Array.from({length:Math.max(...ranks.values())+1},()=>[]);for(const id of component)layers[ranks.get(id)].push(id);const order=new Map();
      layers.forEach(layer=>{layer.sort((a,b)=>byId.get(a).y-byId.get(b).y);layer.forEach((id,i)=>order.set(id,i))});
      for(let pass=0;pass<5;pass++){for(let col=1;col<layers.length;col++){const layer=layers[col],bary=id=>{const sources=incoming.get(id);return sources.length?sources.reduce((sum,s)=>sum+(order.get(s)||0),0)/sources.length:order.get(id)};layer.sort((a,b)=>bary(a)-bary(b));layer.forEach((id,i)=>order.set(id,i))}}
      const gapY=110,gapX=170,widths=layers.map(layer=>Math.max(80,...layer.map(id=>boxes.get(id).w))),heights=layers.map(layer=>layer.reduce((sum,id)=>sum+boxes.get(id).h,0)+Math.max(0,layer.length-1)*gapY),height=Math.max(...heights),positions=new Map();
      let x=left;layers.forEach((layer,col)=>{let y=componentY+(height-heights[col])/2;for(const id of layer){positions.set(id,{x,y});y+=boxes.get(id).h+gapY}x+=widths[col]+gapX});
      for(let col=layers.length-2;col>=0;col--){const layer=layers[col];let last=componentY-110;for(const id of layer){const children=outgoing.get(id).filter(next=>ranks.get(next)>col),box=boxes.get(id),desired=children.length?children.reduce((sum,next)=>sum+positions.get(next).y+boxes.get(next).h/2,0)/children.length-box.h/2:positions.get(id).y;positions.get(id).y=Math.max(last+110,Math.min(componentY+height-box.h,Math.max(componentY,desired)));last=positions.get(id).y+box.h}}
      for(const id of component){const n=byId.get(id),p=positions.get(id);targets.push({node:n,x:n.x,y:n.y,tx:p.x,ty:p.y})}
      for(const e of links){if(ranks.get(e.from)<ranks.get(e.to)){e.fromSide='right';e.toSide='left'}else{e.fromSide='bottom';e.toSide='bottom'}}
      maxWidth=Math.max(maxWidth,x-left-gapX);componentY=Math.max(...component.map(id=>positions.get(id).y+boxes.get(id).h))+180;
    }
    const loose=components.filter(c=>c.length===1).flat().map(id=>byId.get(id));if(loose.length){const columns=Math.min(4,Math.max(1,Math.ceil(Math.sqrt(loose.length)))),widths=Array.from({length:columns},(_,col)=>Math.max(80,...loose.filter((_,i)=>i%columns===col).map(n=>boxes.get(n.id).w)));let y=componentY;for(let row=0;row<Math.ceil(loose.length/columns);row++){let x=left;const items=loose.slice(row*columns,(row+1)*columns);items.forEach((n,col)=>{targets.push({node:n,x:n.x,y:n.y,tx:x,ty:y});x+=widths[col]+110});y+=Math.max(...items.map(n=>boxes.get(n.id).h))+110}}
    return targets;
  },
  arrange() {
    const nodes = this.items().filter(n => this.ids.has(n.id)); if (!nodes.length) return;
    this.cancelArrangement(); CanvasEditor.finish(); checkpoint();
    nodes.sort((a, b) => a.y - b.y || a.x - b.x);
    const targets = this.layout(nodes);
    const start = performance.now(), duration = reduceMotion() ? 1 : 460;
    const frame = now => {
      const progress = Math.min(1, (now - start) / duration), ease = 1 - Math.pow(1 - progress, 3);
      for (const t of targets) { t.node.x = t.x + (t.tx - t.x) * ease; t.node.y = t.y + (t.ty - t.y) * ease; const el = $(`[data-node="${t.node.id}"]`); if (el) { el.style.left = t.node.x + 'px'; el.style.top = t.node.y + 'px'; } }
      renderBoardWires();if(nodes.some(n=>n.type==='ink'))renderInk();
      if (progress < 1) this.arrangement = requestAnimationFrame(frame);
      else { this.arrangement = 0; save(); fitBoard(); toast(`${nodes.length} objects arranged without overlaps · Ctrl Z to undo`); }
    };
    this.arrangement = requestAnimationFrame(frame);
  },
  init() {
    document.addEventListener('pointerdown', e => {
      this.cancelArrangement();
      const input = $('#boardNameInput'); if (document.activeElement === input && e.target !== input) input.blur();
    }, true);
    document.addEventListener('contextmenu', e => {
      if (tool === 'note' && e.target.closest('#canvas')) { e.preventDefault(); e.stopImmediatePropagation(); this.suppressContextUntil = Date.now() + 350; setTool('select'); }
      else if (Date.now() < this.suppressContextUntil) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
    document.addEventListener('keydown', e => {
      if (tab !== 'whiteboard' || isEditing()) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape' && drag?.type === 'selection') { e.preventDefault(); e.stopImmediatePropagation(); this.ids = drag.previous; this.finish(); }
      else if (ctrl && e.key.toLowerCase() === 'a') { e.preventDefault(); e.stopImmediatePropagation(); this.all(); }
      else if (ctrl && e.key.toLowerCase() === 'd' && (this.ids.size > 1||InkSelection.hasSelected())) { e.preventDefault(); e.stopImmediatePropagation(); this.duplicate(); }
      else if (['Delete', 'Backspace'].includes(e.key) && (this.ids.size > 1||InkSelection.hasSelected())) { e.preventDefault(); e.stopImmediatePropagation(); this.remove(); }
      else if (e.key === 'Escape' && tool === 'note') { e.preventDefault(); e.stopImmediatePropagation(); setTool('select'); }
    }, true);
    window.addEventListener('blur', () => { $('#selectionOverlay')?.remove(); $('#canvas').classList.remove('box-selecting', 'lasso-selecting'); this.cancelArrangement(); });
  }
};

/* Direct canvas editing, formatting, and board/content identity. */
var CanvasEditor = {
  fonts: ['DM Sans', 'Manrope', 'Arial', 'Segoe UI', 'Georgia', 'Times New Roman', 'Courier New'],
  editing: null, stickyColor: '#ffeca0', stickyPoint: { x: 0, y: 0 },
  color(value, fallback) { return /^#[0-9a-f]{6}$/i.test(value || '') ? value : fallback; },
  format(node) {
    const f = node.format || {};
    return {
      family: this.fonts.includes(f.family) ? f.family : 'DM Sans',
      size: Math.max(8, Math.min(200, Number(f.size) || (node.type === 'sticky' ? 18 : 24))),
      bold: !!f.bold, italic: !!f.italic, underline: !!f.underline,
      color: this.color(f.color, ''), highlight: this.color(f.highlight, '#ffe58a'),
      highlighted: !!f.highlighted,
      shape: ['none', 'rectangle', 'rounded', 'ellipse', 'diamond'].includes(f.shape) ? f.shape : 'none',
      background: this.color(f.background, '')
    };
  },
  template(node) {
    const placeholder = node.type === 'sticky' ? 'Write a note…' : 'Type something…';
    return `<div class="inline-text-shell"><div class="inline-editable" data-inline-text contenteditable="false" role="textbox" aria-label="${node.type === 'sticky' ? 'Sticky note text' : 'Canvas text'}" aria-multiline="true" data-placeholder="${placeholder}" spellcheck="true">${escapeHTML(node.plainText || '')}</div></div>`;
  },
  flatten(node) {
    return [node.title, ...(node.bullets || []).map(s => '• ' + s), node.text].filter(Boolean).join('\n');
  },
  bind() {
    this.measuring=true;const nodeMap=new Map(board().nodes.map(n=>[n.id,n]));
    for (const el of $$('.node')) {
      const node = nodeMap.get(el.dataset.node);
      if (!node) continue;
      if (node.inline) {
        this.bindField(el.querySelector('[data-inline-text]'), node, 'plainText');
        this.apply(node, el);
      } else if (['text', 'note', 'sticky', 'shape'].includes(node.type)) {
        this.bindField(el.querySelector('.node-title'), node, 'title');
        this.bindField(el.querySelector('.node-description'), node, 'text');
        $$('.node-bullet', el).forEach((row, i) => this.bindField(row.lastElementChild, node, 'bullet', i));
        if (node.format || node.type === 'sticky') { if (node.type === 'sticky') this.paper(node, el); if (node.format) this.apply(node, el); }
      }
      if (node.type === 'table') {
        this.bindField(el.querySelector('.node-title'), node, 'title');
        $$('td', el).forEach((cell, i) => {
          const cols = node.rows?.[0]?.length || 1;
          this.bindField(cell, node, 'cell', [Math.floor(i / cols), i % cols]);
          cell.contentEditable = 'plaintext-only';
          cell.setAttribute('role', 'textbox');
          cell.setAttribute('aria-label', `Table row ${Math.floor(i / cols) + 1}, column ${i % cols + 1}`);
        });
      }
    }
    this.measuring=false;cancelAnimationFrame(this.measureFrame||0);this.measureFrame=requestAnimationFrame(() => {
      this.measureFrame=0;this.measuring=true;for (const node of board().nodes.filter(n => n.inline)) {
        const el = $(`[data-node="${node.id}"]`);
        if (el) this.measure(node, el);
      }
      this.measuring=false;renderBoardWires();
    });
  },
  bindField(field, node, key, index) {
    if (!field) return;
    field.dataset.editableField = key;
    if (index !== undefined) field.dataset.editIndex = JSON.stringify(index);
    if (!field.hasAttribute('contenteditable')) field.contentEditable = 'false';
    field.onfocus = () => {
      if (field.contentEditable === 'false') return;
      if (this.editing?.field !== field) checkpoint();
      this.editing = { field, node, key, index };
      selectNode(node.id);
      field.closest('.node')?.classList.add('editing-inline');
    };
    field.oninput = () => {
      const value = field.innerText.replace(/\r/g, '').slice(0, 50000);
      if (key === 'bullet') node.bullets[index] = value;
      else if (key === 'cell') node.rows[index[0]][index[1]] = value;
      else node[key] = value;
      if (key === 'plainText') node.title = value.split('\n')[0].slice(0, 120);
      this.measure(node, field.closest('.node'));
      save();
    };
    field.onblur = () => {
      if (key !== 'cell') field.contentEditable = 'false';
      field.closest('.node')?.classList.remove('editing-inline');
      if (this.editing?.field === field) this.editing = null;
      this.measure(node, field.closest('.node'));
      save();
    };
    field.onkeydown = e => {
      if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault(); e.stopPropagation();
        const name = { b: 'bold', i: 'italic', u: 'underline' }[e.key.toLowerCase()];
        this.setFormat(node, { [name]: !this.format(node)[name] });
      } else if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
        e.preventDefault(); e.stopPropagation(); field.blur(); if (e.key === 'Escape' && tool === 'note') setTool('select');
      }
    };
  },
  edit(id, target) {
    const node = board().nodes.find(n => n.id === id), el = $(`[data-node="${id}"]`);
    if (!node || !el) return;
    if (node.type === 'table') {
      const cell = target?.closest('td');
      if (cell) { cell.focus({ preventScroll: true }); return; }
      this.tableDialog(node); return;
    }
    const field = target?.closest('[data-editable-field]') || el.querySelector('[data-inline-text], .node-title');
    if (!field) return;
    field.contentEditable = 'plaintext-only';
    field.focus({ preventScroll: true });
    const range = document.createRange(); range.selectNodeContents(field); range.collapse(false);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
  },
  finish() { this.editing?.field?.blur(); },
  paper(node, el) {
    const paper = this.color(node.noteColor, '#ffeca0'), rgb = [1,3,5].map(i=>parseInt(paper.slice(i,i+2),16));
    el.style.setProperty('--note-paper', paper);el.style.setProperty('--note-ink',rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>150?'#37342b':'#f2eee5');el.style.setProperty('--paper-fold','#'+rgb.map(v=>Math.max(0,v-28).toString(16).padStart(2,'0')).join(''));
  },
  apply(node, el) {
    if (!el) return;
    const f = this.format(node), field = el.querySelector('[data-inline-text]') || el.querySelector('.node-title');
    if (!field) return;
    const paper = node.type === 'sticky' ? this.color(node.noteColor, '#ffeca0') : '';
    let paperInk = 'var(--text)';
    if (paper) {
      const rgb = [1, 3, 5].map(i => parseInt(paper.slice(i, i + 2), 16));
      paperInk = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > 150 ? '#37342b' : '#f2eee5';
      this.paper(node, el);
      el.style.setProperty('--paper-fold', '#' + rgb.map(v => Math.max(0, v - 28).toString(16).padStart(2, '0')).join(''));
    }
    Object.assign(field.style, {
      fontFamily: `'${f.family}', sans-serif`, fontSize: f.size + 'px',
      fontWeight: f.bold ? '700' : '400', fontStyle: f.italic ? 'italic' : 'normal',
      textDecoration: f.underline ? 'underline' : 'none', color: f.color || paperInk,
      backgroundColor: f.highlighted ? f.highlight : 'transparent'
    });
    if (node.inline && node.type === 'text') el.dataset.textShape = f.shape;
    this.measure(node, el);
  },
  measure(node, el) {
    if (!el || !el.isConnected || !el.getClientRects().length || !el.offsetWidth) return;
    if (node.inline) node.w = Math.max(node.type === 'sticky' ? 160 : 50, el.offsetWidth);
    if (node.inline && node.type === 'text') {
      const f = this.format(node);
      let bg = el.querySelector('.inline-background');
      if (f.shape === 'none') bg?.remove();
      else {
        const w = Math.max(1, el.offsetWidth), h = Math.max(1, el.offsetHeight);
        if (!bg) { el.insertAdjacentHTML('afterbegin', '<svg class="inline-background" aria-hidden="true"></svg>'); bg = el.querySelector('.inline-background'); }
        bg.setAttribute('viewBox', `0 0 ${w} ${h}`); bg.setAttribute('preserveAspectRatio', 'none');
        bg.style.fill = f.background || 'var(--surface)';
        bg.innerHTML = f.shape === 'ellipse' ? `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 1}" ry="${h / 2 - 1}"/>` : f.shape === 'diamond' ? `<path d="M ${w / 2} 1 L ${w - 1} ${h / 2} L ${w / 2} ${h - 1} L 1 ${h / 2} Z"/>` : `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${f.shape === 'rounded' ? 14 : 2}"/>`;
      }
    }
    if(!this.measuring)renderBoardWires();
  },
  setFormat(node, patch) {
    checkpoint();
    const converting = patch.shape && patch.shape !== 'none' && !node.inline && node.type !== 'shape' && node.type !== 'sticky';
    if (converting) { node.plainText = this.flatten(node); node.inline = true; node.autoWidth = true; }
    node.format = { ...this.format(node), ...patch };
    if (converting) renderNodes(); else this.apply(node, $(`[data-node="${node.id}"]`));
    save();
  },
  formatting(node) {
    const f = this.format(node);
    $('#toolOptions').innerHTML = `<div class="type-format-bar" role="toolbar" aria-label="Text formatting"><select id="textFont" aria-label="Font family">${this.fonts.map(font => `<option ${font === f.family ? 'selected' : ''}>${font}</option>`).join('')}</select><label class="font-size-field"><input id="textSize" type="number" min="8" max="200" value="${f.size}" aria-label="Font size"><span>px</span></label><span class="divider"></span>${[['bold', 'B'], ['italic', 'I'], ['underline', 'U']].map(([key, label]) => `<button class="type-toggle ${f[key] ? 'active' : ''}" data-text-toggle="${key}" aria-pressed="${f[key]}" aria-label="${key}">${label}</button>`).join('')}<label class="format-color" title="Text color"><span>A</span><input type="color" id="textColor" value="${f.color || (document.documentElement.dataset.theme === 'dark' ? '#eeeeee' : '#28282c')}" aria-label="Text color"></label><span class="divider"></span><button class="type-toggle highlight-toggle ${f.highlighted ? 'active' : ''}" id="textHighlight" aria-label="Highlight text" aria-pressed="${f.highlighted}">H</button><input class="compact-color" id="highlightColor" type="color" value="${f.highlight}" aria-label="Highlight color">${node.type !== 'sticky' && node.type !== 'shape' ? `<span class="divider"></span><select id="textBackgroundShape" aria-label="Text background shape">${[['none', 'No shape'], ['rectangle', 'Rectangle'], ['rounded', 'Rounded'], ['ellipse', 'Ellipse'], ['diamond', 'Diamond']].map(([key, label]) => `<option value="${key}" ${f.shape === key ? 'selected' : ''}>${label}</option>`).join('')}</select>${f.shape !== 'none' ? `<input class="compact-color" type="color" id="textBackgroundColor" value="${f.background || (document.documentElement.dataset.theme === 'dark' ? '#2b2b30' : '#ffffff')}" aria-label="Shape background color">` : ''}` : ''}</div>`;
    if (node.type === 'sticky') {
      $('.type-format-bar').insertAdjacentHTML('beforeend', `<span class="divider"></span><label class="paper-color-control">Paper<input class="compact-color" id="notePaperColor" type="color" value="${this.color(node.noteColor, document.documentElement.dataset.theme === 'dark' ? '#39352b' : '#fff2bf')}" aria-label="Sticky note paper color"></label>`);
      $('.type-format-bar').insertAdjacentHTML('beforeend','<span class="note-tilt-actions"><button id="tiltNote" title="Give this note a natural tilt">Tilt</button><button id="straightenNote">Straighten</button></span>');
      const rotate=angle=>{checkpoint();node.rotation=angle;$(`[data-node="${node.id}"]`).style.transform=noteTransform(node);renderBoardWires();save()};$('#tiltNote').onclick=()=>rotate((Math.random()>.5?1:-1)*(1+Math.random()*2));$('#straightenNote').onclick=()=>rotate(0);
      $('#notePaperColor').oninput = e => { checkpoint(); node.noteColor = e.target.value; this.stickyColor = e.target.value; this.apply(node, $(`[data-node="${node.id}"]`)); save(); };
    }
    $('#textFont').onchange = e => this.setFormat(node, { family: e.target.value });
    $('#textSize').oninput = e => { if (+e.target.value >= 8) this.setFormat(node, { size: Math.min(200, +e.target.value) }); };
    $$('[data-text-toggle]').forEach(b => b.onclick = () => { const name = b.dataset.textToggle; this.setFormat(node, { [name]: !this.format(node)[name] }); this.formatting(node); });
    $('#textColor').oninput = e => this.setFormat(node, { color: e.target.value });
    $('#textHighlight').onclick = () => { this.setFormat(node, { highlighted: !this.format(node).highlighted }); this.formatting(node); };
    $('#highlightColor').oninput = e => this.setFormat(node, { highlight: e.target.value, highlighted: true });
    if ($('#textBackgroundShape')) $('#textBackgroundShape').onchange = e => { this.setFormat(node, { shape: e.target.value }); this.formatting(node); };
    if ($('#textBackgroundColor')) $('#textBackgroundColor').oninput = e => this.setFormat(node, { background: e.target.value });
  },
  createText(point) {
    const node = addNode('text', point, { inline: true, autoWidth: true, plainText: '', title: '', text: '', label: '', w: 80, format: { size: 24 } });
    tool = 'select'; renderTools(); requestAnimationFrame(() => this.edit(node.id)); return node;
  },
  createSticky() {
    const c = $('#canvas'), point = { x: (c.clientWidth / 2 - pan.x) / zoom - 125, y: (c.clientHeight / 2 - pan.y) / zoom - 90 };
    const node = addNode('sticky', point, { inline: true, plainText: '', title: '', text: '', label: '', w: 250, format: { size: 18 } });
    tool = 'select'; renderTools(); requestAnimationFrame(() => this.edit(node.id)); return node;
  },
  activateSticky() {
    $('#stickyPlacementCursor')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div id="stickyPlacementCursor" class="sticky-placement-cursor gripping" aria-hidden="true"><svg class="held-note" viewBox="0 0 30 34"><path class="held-paper" d="M2 1h19l7 7v24H2z"/><path class="held-fold" d="M21 1v7h7"/><path class="held-paper-lines" d="M7 14h15M7 19h12"/></svg><span class="sticky-cursor-hand">${this.handSVG()}</span></div>`);
    this.updateStickyCursorColor(); this.stickyOptions();
    $('#canvasHint').textContent = 'Right-click, Escape, or the note tool to stop';
    toast('Right-click or press Escape to finish.');
  },
  stopStickyCursor() { $('#stickyPlacementCursor')?.remove(); },
  updateStickyCursorColor() { $('#stickyPlacementCursor')?.style.setProperty('--held-paper-color', this.stickyColor); },
  stickyOptions() {
    const colors = ['#ffeca0', '#ffcaab', '#ffc8d6', '#ded0ff', '#bfdfff', '#e5e5eb'];
    $('#toolOptions').innerHTML = `<div class="sticky-tool-options" role="toolbar" aria-label="Sticky note placement"><span>Paper</span>${colors.map(c => `<button class="swatch ${this.stickyColor === c ? 'active' : ''}" data-sticky-color="${c}" style="background:${c}" aria-label="Sticky note color ${c}"></button>`).join('')}<input class="compact-color" id="placementPaperColor" type="color" value="${this.stickyColor}" aria-label="Custom sticky note color"><span class="divider"></span><label class="tilt-control"><input type="checkbox" id="naturalNoteTilt" ${state.noteRandomTilt!==false?'checked':''}>Natural tilt</label><span class="sticky-place-instruction">Right-click or Esc to finish</span></div>`;
    $$('[data-sticky-color]').forEach(b => b.onclick = () => { this.stickyColor = b.dataset.stickyColor; this.updateStickyCursorColor(); this.stickyOptions(); });
    $('#naturalNoteTilt').onchange=e=>{state.noteRandomTilt=e.target.checked;save()};
    $('#placementPaperColor').oninput = e => { this.stickyColor = e.target.value; this.updateStickyCursorColor(); };
  },
  moveStickyCursor(e) {
    const cursor = $('#stickyPlacementCursor'); if (tool !== 'note' || !cursor) return;
    this.stickyPoint = { x: e.clientX, y: e.clientY };
    const canvasTarget = e.target.closest('#canvas'), blocked = e.target.closest('.canvas-bottom,.tool-options,[contenteditable="plaintext-only"]');
    cursor.classList.toggle('is-visible', !!canvasTarget && !blocked);
    cursor.style.left = (e.clientX - 8) + 'px'; cursor.style.top = (e.clientY - 20) + 'px';
  },
  placeSticky(point) {
    this.finish();
    const node = addNode('sticky', point, { inline: true, plainText: '', title: '', text: '', label: '', w: 245, noteColor: this.stickyColor, rotation: state.noteRandomTilt===false?0:(Math.random()-.5)*5.6, format: { size: 18 } });
    const el = $(`[data-node="${node.id}"]`); el?.classList.add('just-placed'); setTimeout(() => el?.classList.remove('just-placed'), 300);
    const cursor = $('#stickyPlacementCursor'); cursor?.classList.remove('gripping'); cursor?.classList.add('placing');
    setTimeout(() => { if (cursor?.isConnected) { cursor.classList.add('gripping'); cursor.classList.remove('placing'); } }, 230);
    requestAnimationFrame(() => this.edit(node.id));
    $('#canvasHint').textContent = 'Right-click, Escape, or the note tool to stop';
    return node;
  },
  penOptions() {
    const colors = ['#0d99ff', '#e79b54', '#a182ed', '#ef7a9e', '#c5c5d0'];
    $('#toolOptions').innerHTML = `<div class="pen-control-bar" role="toolbar" aria-label="Pen settings">${colors.map(color => `<button class="swatch ${inkColor === color ? 'active' : ''}" style="background:${color}" data-pen-color="${color}" aria-label="Pen color ${color}"></button>`).join('')}<label class="custom-ink-color" title="Choose any color">${icon('pen')}<input type="color" id="inkColorPicker" value="${inkColor}" aria-label="Custom pen color"></label><span class="divider"></span><span class="pen-width-symbol" aria-hidden="true"></span><input type="range" id="penWidthSlider" min="0.5" max="${Math.max(40, inkSize)}" step="0.5" value="${inkSize}" aria-label="Pen thickness slider"><label class="pen-value-field"><input id="penWidthValue" type="number" min="0.5" max="1000" step="0.5" value="${inkSize}" aria-label="Pen thickness value"><span>px</span></label><span class="divider"></span><button class="text-btn small-text" id="clearInk">Clear ink</button></div>`;
    $$('[data-pen-color]').forEach(b => b.onclick = () => { inkColor = b.dataset.penColor; this.penOptions(); });
    $('#inkColorPicker').oninput = e => { inkColor = e.target.value; $$('.pen-control-bar .swatch').forEach(b => b.classList.toggle('active', b.dataset.penColor === inkColor)); };
    $('#penWidthSlider').oninput = e => { inkSize = +e.target.value; $('#penWidthValue').value = inkSize; };
    $('#penWidthValue').oninput = e => { const value = +e.target.value; if (value >= .5 && value <= 1000) { inkSize = value; $('#penWidthSlider').max = Math.max(40, value); $('#penWidthSlider').value = value; } };
    $('#clearInk').onclick = () => { if (!board().strokes.length) return; checkpoint(); board().strokes = []; save(); renderInk(); };
  },
  tableDialog(existing) {
    showModal(`<div class="modal-header"><div><div class="eyebrow">A LITTLE STRUCTURE</div><h2 id="modalTitle">${existing ? 'Resize your table.' : 'Build a table for your board.'}</h2><p>Choose the size, then type directly into its cells on the canvas.</p></div>${closeButton()}</div><form id="tableSetupForm"><label class="field"><span>Table title</span><input id="tableSetupTitle" maxlength="200" required value="${escapeHTML(existing?.title || 'Research at a glance')}"></label><div class="field-row"><label class="field"><span>Rows, including heading</span><input id="tableSetupRows" type="number" min="1" max="50" value="${existing?.rows?.length || 4}" required></label><label class="field"><span>Columns</span><input id="tableSetupColumns" type="number" min="1" max="20" value="${existing?.rows?.[0]?.length || 3}" required></label></div><div id="tableSizePreview" class="table-size-preview" aria-hidden="true"></div><p class="field-help">The first row is styled as a heading. Every cell is editable. Resize changes can be undone.</p><div class="modal-actions"><button class="secondary-btn" type="button" data-close>Cancel</button><button class="primary-btn">${icon('table')}${existing ? 'Update table' : 'Insert on canvas'}</button></div></form>`);
    const preview = () => { const rows = Math.min(8, +$('#tableSetupRows').value || 1), cols = Math.min(8, +$('#tableSetupColumns').value || 1); $('#tableSizePreview').style.gridTemplateColumns = `repeat(${cols},1fr)`; $('#tableSizePreview').innerHTML = Array.from({ length: rows * cols }, (_, i) => `<span class="${i < cols ? 'heading-cell' : ''}"></span>`).join(''); };
    $('#tableSetupRows').oninput = preview; $('#tableSetupColumns').oninput = preview; preview();
    $('#tableSetupForm').onsubmit = e => {
      e.preventDefault(); const rowCount = Math.max(1, Math.min(50, +$('#tableSetupRows').value)), colCount = Math.max(1, Math.min(20, +$('#tableSetupColumns').value)), title = $('#tableSetupTitle').value.trim();
      const rows = Array.from({ length: rowCount }, (_, r) => Array.from({ length: colCount }, (_, c) => existing?.rows?.[r]?.[c] ?? (r === 0 ? `Column ${c + 1}` : '')));
      if (existing) { checkpoint(); existing.rows = rows; existing.title = title; existing.w = Math.max(existing.w, colCount * 120 + 32); closeModal(); renderNodes(); save(); }
      else { closeModal(); addNode('table', null, { title, rows, w: Math.min(1200, Math.max(320, colCount * 130 + 32)), configured: true }); }
    };
  },
  ensureContent(b) {
    let content = state.topics.find(t => t.boardId === b.id);
    if (!content && b.contentArchived) return null;
    let slot={x:44,y:82};if(!content){const columns=Math.max(1,Math.min(3,Math.floor((($('#topicField')?.clientWidth||1000)-60)/330)));for(let i=0;i<3000;i++){slot={x:44+i%columns*330,y:82+Math.floor(i/columns)*235};if(!state.topics.some(t=>slot.x<(t.x??40)+312&&slot.x+312>(t.x??40)&&slot.y<(t.y??82)+215&&slot.y+215>(t.y??82)))break;}}
    if (!content) { content = { id: uid(), boardId: b.id, title: b.title, summary: '', pointers: derivePointers(b), platform: 'YouTube', format: 'Video', date: null, time: '', status: 'Idea', color: b.color, x:slot.x,y:slot.y }; state.topics.push(content); }
    return content;
  },
  rename(b, value) {
    b.title = value.trim() || 'Untitled content';
    const content = this.ensureContent(b);
    if (content) sequences().filter(s => s.boardId === b.id).forEach(s => s.contentTitle = content.title);
    b.nodes.filter(n => n.type === 'sequencer').forEach(n => n.title = content?.title || b.title);
    renderSidebar(); save();
  },
  sequenceForBoard(id) {
    const b = state.boards.find(b => b.id === id), node = b?.nodes.find(n => n.type === 'sequencer');
    return sequences().find(s => s.id === node?.sequenceId) || sequences().find(s => s.boardId === id && !s.archived) || sequences().filter(s => s.boardId === id).at(-1);
  },
  ensureSequence(content, reopen) {
    let seq = this.sequenceForBoard(content.boardId);
    if (!seq) { seq = { id: uid(), contentId: content.id, contentTitle: content.title, boardId: content.boardId, createdAt: new Date().toISOString(), completedAt: null, archived: false, shots: [] }; sequences().push(seq); }
    seq.contentId = content.id; seq.contentTitle = content.title;
    if (reopen && seq.archived) { seq.archived = false; seq.completedAt = null; if (seq.shots.length) { seq.shots.at(-1).done = false; seq.shots.at(-1).completedAt = null; } }
    return seq;
  },
  startSequence(content) {
    checkpoint(); const seq = this.ensureSequence(content, true);
    if (!seq.shots.length) seq.shots = (content.pointers.length ? content.pointers : ['']).map(makeShot);
    shotContentId = content.id; shotMode = 'active'; shotHistoryId = null; save(); renderShots();
  },
  createSequencer() {
    checkpoint(); const content = this.ensureContent(board()); if (!content) return toast('Create content for this board before adding a shot sequencer.'); const seq = this.ensureSequence(content, false);
    if (!seq.shots.length) seq.shots = (content.pointers.length ? content.pointers : ['']).map(makeShot);
    embedSequence(seq.id);
  },
  handSVG() { return `<svg viewBox="0 0 40 44" class="studio-hand"><path class="pull-cable" d="M0 20h16"/><g class="hand-open"><path class="fa-hand" transform="translate(2 2) scale(.069)" d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 208c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-176c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 272c0 1.5 0 3.1 .1 4.6L67.6 283c-16-15.2-41.3-14.6-56.6 1.4s-14.6 41.3 1.4 56.6L124.8 448c43.1 41.1 100.4 64 160 64l19.2 0c97.2 0 176-78.8 176-176l0-208c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 112c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-176c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 176c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-208z"/></g><g class="hand-closed"><path class="fa-hand" transform="translate(4 2) scale(.071)" d="M144 0C117.5 0 96 21.5 96 48l0 48 0 28.5L96 176c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-26.7-9 7.5C40.4 169 32 187 32 206L32 244c0 38 16.9 74 46.1 98.3L128 384l0 96c0 17.7 14.3 32 32 32l160 0c17.7 0 32-14.3 32-32l0-105.3c46.9-19 80-65 80-118.7l0-80 0-16 0-16c0-26.5-21.5-48-48-48c-12.4 0-23.6 4.7-32.1 12.3C350 83.5 329.3 64 304 64c-12.4 0-23.6 4.7-32.1 12.3C270 51.5 249.3 32 224 32c-12.4 0-23.6 4.7-32.1 12.3C190 19.5 169.3 0 144 0z"/></g></svg>`; },
  init() {
    state.boards.forEach(b=>b.nodes.forEach(n=>{const s=nodeScale(n);if(Math.abs(s.x-s.y)>.001){if(['stamp','clock'].includes(n.type)){n.scaleX=n.scaleY=Math.sqrt(s.x*s.y)}else{n.w=Math.min(3000,Math.max(n.type==='sticky'?160:80,n.w*s.x));if(n.type==='shape')n.h=(n.h||110)*s.y;else if(n.type==='image'){n.displayHeight=(n.displayHeight||n.imageHeight||170)*s.y;n.stretchedImage=true}else if(n.minHeight)n.minHeight*=s.y;n.scaleX=n.scaleY=1;}}if(n.inline&&n.type==='sticky'&&n.w<160)n.w=245}));
    state.boards.forEach(b => this.ensureContent(b));
    sequences().forEach(seq => { const b = state.boards.find(b => b.id === seq.boardId); if (b) { const content = this.ensureContent(b); if (content) { seq.contentTitle = content.title; seq.contentId = content.id; } } });
    const input = $('#boardNameInput');
    if (input) { input.onfocus = () => checkpoint(); input.oninput = () => this.rename(board(), input.value); input.onblur = () => { this.rename(board(), input.value); input.value = board().title; }; input.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } }; }
    document.addEventListener('pointermove', e => this.moveStickyCursor(e));
  }
};

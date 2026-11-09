/* Content creation and card details. Platform marks are lightweight inline SVGs. */
var ContentDetails = {
  platforms: ['YouTube', 'Instagram', 'TikTok', 'Facebook', 'X', 'Threads', 'Twitch', 'LinkedIn', 'Pinterest', 'Snapchat', 'Reddit', 'Discord', 'Vimeo', 'Bluesky', 'Mastodon', 'WhatsApp', 'Telegram', 'Podcast', 'Newsletter', 'Website', 'Blog', 'Other'],
  format(value) { return /picture|image|photo/i.test(value || '') ? 'Picture' : 'Video'; },
  mark(name) {
    const marks = {
      YouTube: '<svg viewBox="0 0 24 24" class="platform-mark youtube-mark" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 6 3-6 3z" class="mark-cutout"/></svg>',
      Instagram: '<svg viewBox="0 0 24 24" class="platform-mark instagram-mark" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.8" r="1" class="mark-solid"/></svg>',
      TikTok: '<svg viewBox="0 0 24 24" class="platform-mark tiktok-mark" aria-hidden="true"><path d="M14 3v11.1a4.4 4.4 0 1 1-3.4-4.3v3.5a1.1 1.1 0 1 0 .2.8V3h3.2c.4 2.1 1.7 3.4 4 3.8v3.3A9 9 0 0 1 14 8.5"/></svg>',
      Facebook: '<svg viewBox="0 0 24 24" class="platform-mark facebook-mark" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M13.4 20v-7h2.4l.4-2.8h-2.8V8.4c0-.8.3-1.4 1.4-1.4h1.5V4.5c-.3 0-1.2-.1-2.2-.1-2.3 0-3.8 1.4-3.8 3.9v1.9H8v2.8h2.3v7z" class="mark-cutout"/></svg>',
      X: '<svg viewBox="0 0 24 24" class="platform-mark x-mark" aria-hidden="true"><path d="M4 3h4.8l11.2 18h-4.8zM20 3l-6 7m-4 4-6 7"/></svg>',
      Threads: '<svg viewBox="0 0 24 24" class="platform-mark threads-mark" aria-hidden="true"><path d="M12 21a9 9 0 1 1 8.1-12.9M20 8.1c-.5-2.8-2.4-4.2-5.4-4.2-3.2 0-5 1.5-5 3.7 0 2.1 1.8 3.2 5 3.2s5 1.1 5 3.5c0 2.5-1.9 4.1-5.2 4.1-3 0-4.8-1.3-5.4-3.7-.4-1.7.7-3 2.4-3 1.7 0 2.7 1 2.7 2.4 0 1.3-.8 2.3-2.2 2.7"/></svg>',
      Twitch: '<svg viewBox="0 0 24 24" class="platform-mark twitch-mark" aria-hidden="true"><path d="M5 3h17v12l-5 5h-4l-3 3v-3H5z"/><path d="M10 7v6m6-6v6" class="mark-cutout"/></svg>',
      LinkedIn: '<svg viewBox="0 0 24 24" class="platform-mark linkedin-mark" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="3"/><path d="M6 10v8m0-11v.1M10 18v-8h3v1.2c.5-.9 1.3-1.4 2.5-1.4 2 0 2.5 1.3 2.5 3.4V18h-3v-4.2c0-.9-.1-1.6-1.1-1.6s-1.4.7-1.4 1.6V18z" class="mark-cutout"/></svg>',
      Pinterest: '<svg viewBox="0 0 24 24" class="platform-mark pinterest-mark" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M10 20l2-7m-1-1.5c0-2 1.3-3.5 3.1-3.5s2.8 1.2 2.8 3c0 2.4-1.2 4.5-3.1 4.5-1 0-1.8-.6-2-1.4" class="mark-cutout"/></svg>',
      Snapchat: '<svg viewBox="0 0 24 24" class="platform-mark snapchat-mark" aria-hidden="true"><path d="M12 3c-3 0-4.5 2.1-4.5 5.3 0 1.3.2 2.3-.1 3.2-.3.9-1.5 1.5-2.6 1.8-.7.2-.7.9.2 1.2.8.3 1.3.3 1.7.9.4.6-.2 1.5-.6 2.1-.4.7.1 1 1 .8 1.3-.3 2.1.6 3.1 1.5.7.6 1.3.9 1.8.9s1.1-.3 1.8-.9c1-.9 1.8-1.8 3.1-1.5.9.2 1.4-.1 1-.8-.4-.6-1-1.5-.6-2.1.4-.6.9-.6 1.7-.9.9-.3.9-1 .2-1.2-1.1-.3-2.3-.9-2.6-1.8-.3-.9-.1-1.9-.1-3.2C16.5 5.1 15 3 12 3z"/></svg>',
      Reddit: '<svg viewBox="0 0 24 24" class="platform-mark reddit-mark" aria-hidden="true"><circle cx="12" cy="13" r="8"/><circle cx="9" cy="12" r=".8" class="mark-cutout"/><circle cx="15" cy="12" r=".8" class="mark-cutout"/><path d="M8.5 15c1.8 1.6 5.2 1.6 7 0M12 5l1-3 4 1M19 8l2-2"/></svg>',
      Discord: '<svg viewBox="0 0 24 24" class="platform-mark discord-mark" aria-hidden="true"><path d="M6 5a18 18 0 0 1 12 0l2 13a16 16 0 0 1-4 2l-1-2a12 12 0 0 1-6 0l-1 2a16 16 0 0 1-4-2z"/><circle cx="9" cy="12" r="1" class="mark-cutout"/><circle cx="15" cy="12" r="1" class="mark-cutout"/></svg>',
      Vimeo: '<svg viewBox="0 0 24 24" class="platform-mark vimeo-mark" aria-hidden="true"><path d="M3 8c2-2 4-2.5 5.3-.4l2.1 6.3c.4 1.3.8 1.5 1.5.4l2.5-4c.8-1.4.5-2-1.5-1.4.8-3 5-4.5 7.1-2.8 2.3 1.8-.1 6.4-2 9-2.7 3.8-6.7 7-9.3 5.3-1.1-.8-1.7-2.5-2.4-5.2L5.2 10C4.8 8.7 4.3 8.8 3 9.5z"/></svg>',
      Bluesky: '<svg viewBox="0 0 24 24" class="platform-mark bluesky-mark" aria-hidden="true"><path d="M12 11c-1.2-2.2-4.6-6.3-7.2-7.4C2.7 2.7 2 3.8 2.2 5.4c.2 1.4 1.1 4.9 2.6 6.5 1.3 1.4 3.2 2 5.3 2.2-4.3.6-5.5 2.7-4.7 4.8.8 2 3.2 2.3 4.8.5L12 16l1.8 3.4c1.6 1.8 4 1.5 4.8-.5.8-2.1-.4-4.2-4.7-4.8 2.1-.2 4-.8 5.3-2.2 1.5-1.6 2.4-5.1 2.6-6.5.2-1.6-.5-2.7-2.6-1.8C16.6 4.7 13.2 8.8 12 11z"/></svg>',
      Mastodon: '<svg viewBox="0 0 24 24" class="platform-mark mastodon-mark" aria-hidden="true"><path d="M4 5c2-2 14-2 16 0 1.5 1.5 1.5 8.5.5 11-1 2.4-3.5 3.5-6.5 3.8V17c2.2-.2 3.5-.8 4-2-.9.4-2 .6-3.3.7-3 .3-5.9.1-7.3-1.4-1.2-1.3-1.4-4.1-1.4-7.2"/><path d="M8 8v6m0-6c0-2 3.5-2 3.5 0v6m0-6c0-2 3.5-2 3.5 0v6"/></svg>',
      WhatsApp: '<svg viewBox="0 0 24 24" class="platform-mark whatsapp-mark" aria-hidden="true"><path d="M20 11.7a8 8 0 0 1-11.7 7L4 20l1.3-4.1A8 8 0 1 1 20 11.7z"/><path d="M9 8c-.8.5-.7 1.6.1 2.8 1.1 1.7 2.5 2.8 4.1 3.4 1.2.5 2.1.1 2.3-.8l-2-1-1 1c-.9-.4-1.8-1.2-2.4-2.1l.7-.9z"/></svg>',
      Telegram: '<svg viewBox="0 0 24 24" class="platform-mark telegram-mark" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m5 11 13-5-3 12-4-4-2 2v-4z" class="mark-cutout"/></svg>',
      Podcast: '<svg viewBox="0 0 24 24" class="platform-mark podcast-mark" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3m-3 0h6"/></svg>',
      Newsletter: '<svg viewBox="0 0 24 24" class="platform-mark newsletter-mark" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
      Website: '<svg viewBox="0 0 24 24" class="platform-mark website-mark" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>',
      Blog: '<svg viewBox="0 0 24 24" class="platform-mark blog-mark" aria-hidden="true"><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7m-7 4h7"/></svg>',
      Other: '<svg viewBox="0 0 24 24" class="platform-mark website-mark" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8m-4-4v8"/></svg>'
    };
    return marks[name] || marks.Other;
  },
  picker(value) {
    const selected = this.platforms.includes(value) ? value : 'YouTube';
    return `<div class="platform-picker" data-platform-picker><input type="hidden" id="contentPlatform" value="${escapeHTML(selected)}"><button type="button" class="platform-picker-trigger" aria-haspopup="listbox" aria-expanded="false">${this.mark(selected)}<span>${escapeHTML(selected)}</span>${icon('down')}</button><div class="platform-options" role="listbox" aria-label="Choose a publishing platform">${this.platforms.map(name => `<button type="button" role="option" aria-selected="${name === selected}" class="platform-option ${name === selected ? 'selected' : ''}" data-platform-option="${escapeHTML(name)}">${this.mark(name)}<span>${escapeHTML(name)}</span>${name === selected ? icon('check') : ''}</button>`).join('')}</div></div>`;
  },
  bindPicker() {
    const root = $('[data-platform-picker]', $('#modal'));
    if (!root) return;
    const trigger = $('.platform-picker-trigger', root), input = $('#contentPlatform');
    trigger.onclick = e => { e.stopPropagation(); const open = root.classList.toggle('is-open'); trigger.setAttribute('aria-expanded', String(open)); };
    $$('[data-platform-option]', root).forEach(option => option.onclick = () => {
      const value = option.dataset.platformOption; input.value = value;
      trigger.innerHTML = `${this.mark(value)}<span>${escapeHTML(value)}</span>${icon('down')}`;
      trigger.setAttribute('aria-expanded', 'false'); root.classList.remove('is-open');
      $$('[data-platform-option]', root).forEach(item => { const selected = item.dataset.platformOption === value; item.classList.toggle('selected', selected); item.setAttribute('aria-selected', String(selected)); });
    });
  },
  details(id = null, boardId = null) {
    const content = id ? state.topics.find(t => t.id === id) : null;
    if (id && !content) return;
    const linkedBoard = boardId ? state.boards.find(b => b.id === boardId) : null;
    showModal(`<div class="modal-header"><div><div class="eyebrow">${content ? 'CONTENT DETAILS' : 'A NEW PIECE TO SHARE'}</div><h2 id="modalTitle">${content ? 'Edit content details.' : 'Plan new content.'}</h2><p>${content ? 'Update the details shown on this content card.' : 'Add the details shown on your content card.'}</p></div>${closeButton()}</div><form id="contentDetailsForm"><label class="field"><span>Content name</span><input id="contentName" required maxlength="200" value="${escapeHTML(content?.title || '')}" placeholder="What are you creating?"></label><div class="field-row"><label class="field"><span>Platform</span>${this.picker(content?.platform || 'YouTube')}</label><label class="field"><span>Format</span><input type="hidden" id="contentFormat" value="${this.format(content?.format)}"><div class="content-format-choice" role="group" aria-label="Content format"><button type="button" data-content-format="Video" aria-pressed="${this.format(content?.format) === 'Video'}">${icon('play')}Video</button><button type="button" data-content-format="Picture" aria-pressed="${this.format(content?.format) === 'Picture'}">${icon('image')}Picture</button></div></label></div><label class="field"><span>Description</span><textarea id="contentDescription" rows="3" maxlength="3000" placeholder="Add a short description…">${escapeHTML(content?.summary || '')}</textarea></label><div class="modal-actions"><button type="button" class="secondary-btn" data-close>Cancel</button><button class="primary-btn">${icon(content ? 'check' : 'plus')}${content ? 'Save details' : 'Create content'}</button></div></form>`, true);
    this.bindPicker();
    $$('[data-content-format]', $('#contentDetailsForm')).forEach(button => button.onclick = () => {
      $('#contentFormat').value = button.dataset.contentFormat;
      $$('[data-content-format]', $('#contentDetailsForm')).forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    });
    $('#contentDetailsForm').onsubmit = e => {
      e.preventDefault();
      const title = $('#contentName').value.trim(); if (!title) return;
      const values = { title, platform: $('#contentPlatform').value, format: $('#contentFormat').value, summary: $('#contentDescription').value.trim() };
      checkpoint();
      if (content) {
        Object.assign(content, values);
        sequences().filter(sequence => sequence.boardId === content.boardId).forEach(sequence => { sequence.contentTitle = title; });
        state.boards.find(board => board.id === content.boardId)?.nodes.filter(node => node.type === 'sequencer').forEach(node => { node.title = title; });
      } else {
        const linkedBoardId = linkedBoard?.id || uid(), color = linkedBoard?.color || palette[state.topics.length % palette.length], position = { x: 40 + (state.topics.length % 2) * 55, y: 82 + state.topics.length * 238 };
        if (linkedBoard) linkedBoard.contentArchived = false;
        else state.boards.push({ id: linkedBoardId, title, color, nodes: [], edges: [], strokes: [] });
        state.topics.push({ id: uid(), boardId: linkedBoardId, ...values, pointers: [], date: null, time: '', status: 'Idea', color, ...position });
        selectedTopic = state.topics.at(-1).id;
      }
      closeModal(); renderSidebar();
      if (tab === 'overview') { renderOverview(); }
      else { switchTab('structure'); }
      save(); toast(content ? 'Content details updated.' : 'Content created with its linked research board.');
    };
  },
  create(boardId = null) { this.details(null, boardId); },
  edit(id) { this.details(id); },
  remove(id) {
    const content = state.topics.find(t => t.id === id); if (!content) return;
    const board = state.boards.find(b => b.id === content.boardId);
    showModal(`<div class="modal-header"><div><div class="eyebrow">MAKE A LITTLE ROOM</div><h2 id="modalTitle">Delete this content?</h2><p>“${escapeHTML(content.title)}” and its linked research board and shot history will be removed. You can undo with Ctrl Z.</p></div>${closeButton()}</div><div class="modal-actions"><button class="secondary-btn" data-close>Keep content</button><button class="primary-btn" id="confirmDeleteContent" style="background:#a16c52">Delete content</button></div>`);
    $('#confirmDeleteContent').onclick = () => {
      checkpoint(); state.topics = state.topics.filter(t => t.id !== id); state.sequences = sequences().filter(s => s.boardId !== content.boardId);
      if (board && state.boards.length > 1) { state.boards = state.boards.filter(b => b.id !== board.id); if (state.activeBoard === board.id) state.activeBoard = state.boards[0].id; }
      else if (board) board.contentArchived = true;
      selectedTopic = null; closeModal(); renderAll(); save(); toast('Content deleted · Ctrl Z to undo');
    };
  }
};

document.addEventListener('click', e => {
  if (e.target.closest('.platform-picker')) return;
  $$('.platform-picker.is-open').forEach(root => { root.classList.remove('is-open'); $('.platform-picker-trigger', root)?.setAttribute('aria-expanded', 'false'); });
});

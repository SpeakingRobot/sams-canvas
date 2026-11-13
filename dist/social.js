/* Friends use separate, private presence channels. Board access is never granted here. */
var CanvasSocial = {
  friends: [], channels: new Map(), user: null, client: null, following: null,
  init() {
    setInterval(() => this.refresh(), 12000);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.stopFollowing(); });
    document.addEventListener('pointerdown', e => { if (e.target.closest('#canvas') && !e.target.closest('#followBanner')) this.stopFollowing(); }, true);
    document.addEventListener('wheel', e => { if (e.target.closest('#canvas')) this.stopFollowing(); }, {capture:true,passive:true});
    this.refresh();
  },
  avatar(e, id) {
    const person = Collaboration.onlinePeople().find(p => p.user_id === id);
    if (!person) return;
    const friend = this.friends.find(f => f.peer_id === id);
    context(e, [
      ['hand', this.following === id ? 'Stop following' : 'Follow user', () => this.following === id ? this.stopFollowing() : this.follow(id)],
      ['connect', friend?.status === 'accepted' ? 'View friend' : friend?.incoming ? 'Accept friend request' : friend ? 'Friend request sent' : 'Add friend', () => friend?.status === 'accepted' ? this.open() : friend?.incoming ? this.action('accept', id) : friend ? this.open() : this.action('request', id)],
      ['connect', 'Friends & availability', () => this.open()]
    ]);
  },
  follow(id) {
    if (!Collaboration.realtimeReady || !Collaboration.onlinePeople().some(p => p.user_id === id)) return toast('This collaborator is not online in this canvas.');
    const peer = Collaboration.peers.get(id);
    if (peer?.following === Collaboration.user) return toast('This person is already following you.');
    this.following = id;
    $('#followBanner')?.remove();
    const banner = document.createElement('div'); banner.id = 'followBanner';
    const name = Collaboration.onlinePeople().find(p => p.user_id === id)?.name || 'collaborator';
    banner.innerHTML = '<span>Following ' + escapeHTML(name) + '</span><button>Stop following · Esc</button>';
    banner.querySelector('button').onclick = () => this.stopFollowing(); document.body.append(banner);
    if (peer) this.receive(peer);
  },
  stopFollowing() { this.following = null; $('#followBanner')?.remove(); },
  camera() { if (tab !== 'whiteboard') return null; const c = $('#canvas'); return { x: (c.clientWidth / 2 - pan.x) / zoom, y: (c.clientHeight / 2 - pan.y) / zoom, z: zoom }; },
  receive(packet) {
    if (packet.peer !== this.following) return;
    if (packet.following === Collaboration.user) return this.stopFollowing();
    const camera = packet.camera;
    if (packet.view !== 'whiteboard' || !camera || ![camera.x, camera.y, camera.z].every(Number.isFinite)) {
      const label = $('#followBanner span'); if (label) label.textContent = packet.name + ' is viewing ' + ({structure:'Content',shots:'Shot Sequencer',overview:'Content Calendar'}[packet.view] || 'another view'); return;
    }
    if (tab !== 'whiteboard') switchTab('whiteboard');
    const c = $('#canvas'), z = Math.max(.25, Math.min(2, camera.z));
    moveCamera(c.clientWidth / 2 - camera.x * z, c.clientHeight / 2 - camera.y * z, z);
    const label = $('#followBanner span'); if (label) label.textContent = 'Following ' + packet.name;
  },
  cameraMoved() {
    if (this.following || !Collaboration.realtimeReady || this.cameraTimer) return;
    this.cameraTimer = setTimeout(() => { this.cameraTimer = null; if (performance.now() - (Collaboration.lastSent || 0) >= 50) Collaboration.sendPointer(Collaboration.lastPoint || null); }, 50);
  },
  reset() {
    for (const entry of this.channels.values()) this.client?.removeChannel(entry.channel);
    this.client?.realtime.disconnect(); this.channels.clear(); this.client = null; this.user = null; this.friends = [];
  },
  async refresh() {
    if (this.busy) return;
    const user = Collaboration.identity();
    if (!user) { if (this.user) this.reset(); return; }
    if (this.user !== user) { this.reset(); this.user = user; }
    this.busy = true;
    try {
      const friends = await sb('/rest/v1/rpc/list_canvas_friends', { method: 'POST', body: {} }, true);
      if (this.user !== user) return;
      this.friends = friends || []; this.error = null;
      if (!this.client) this.client = SupabaseRealtime.createClient(cloudConfig.url, cloudConfig.key, { accessToken: async () => cloudSession?.access_token || null, auth: { persistSession: false, autoRefreshToken: false } });
      await this.client.realtime.setAuth(cloudSession.access_token);
      const accepted = new Set(this.friends.filter(f => f.status === 'accepted').map(f => f.peer_id));
      for (const [id, entry] of this.channels) if (!accepted.has(id)) { this.client.removeChannel(entry.channel); this.channels.delete(id); }
      for (const id of accepted) if (!this.channels.has(id)) {
        const topic = 'friends:' + [user, id].sort().join(':');
        const channel = this.client.channel(topic, { config: { private: true, presence: { key: uid() } } });
        const entry = { channel, online: false, ready: false }; this.channels.set(id, entry);
        channel.on('presence', { event: 'sync' }, () => { entry.online = Object.values(channel.presenceState()).flat().some(p => p.user_id === id); this.render(); });
        channel.subscribe(async status => {
          entry.ready = status === 'SUBSCRIBED';
          if (entry.ready) await channel.track({ user_id: user }); else entry.online = false;
          this.render();
        });
      }
      this.render();
    } catch (e) { this.error = 'Friends setup is not available yet. Run supabase/friends.sql in your project’s SQL Editor. ' + e.message; this.render(); }
    finally { this.busy = false; }
  },
  async action(action, peer) {
    try {
      await sb('/rest/v1/rpc/manage_canvas_friend', { method: 'POST', body: { action, peer, canvas: Collaboration.room } }, true);
      await this.refresh(); toast(action === 'request' ? 'Friend request sent.' : action === 'accept' ? 'Friend added.' : 'Friend removed.');
    } catch (e) { toast(e.message + ' Friends requires supabase/friends.sql.'); }
  },
  open() {
    if (!Collaboration.identity()) return cloudSettings();
    showModal('<div class="modal-header"><div><div class="eyebrow">CREATE TOGETHER</div><h2 id="modalTitle">Friends & availability</h2><p>Add collaborators from their avatar. Availability is shared after they accept.</p></div>' + closeButton() + '</div><div id="friendsList"></div>');
    this.render(); this.refresh();
  },
  render() {
    const list = $('#friendsList'); if (!list) return;
    if (this.error) { list.textContent = this.error; return; }
    list.innerHTML = this.friends.length ? this.friends.map(f => {
      const entry = this.channels.get(f.peer_id), online = entry?.ready && entry.online;
      const status = f.status !== 'accepted' ? f.incoming ? 'Wants to be your friend' : 'Request sent' : !entry?.ready ? 'Checking availability…' : online ? 'Online' : 'Offline';
      return '<div class="friend-row"><span class="friend-dot ' + (online ? 'online' : '') + '"></span><div><strong>' + escapeHTML(f.peer_name) + '</strong><small>' + status + '</small></div>' + (f.incoming && f.status !== 'accepted' ? '<button class="primary-btn" data-friend-accept="' + escapeHTML(f.peer_id) + '">Accept</button>' : '') + '<button class="text-btn" data-friend-remove="' + escapeHTML(f.peer_id) + '">' + (f.status === 'accepted' ? 'Remove' : 'Cancel') + '</button></div>';
    }).join('') : '<p class="collab-footnote">No friends yet. Click an online collaborator’s avatar and choose Add friend.</p>';
    list.querySelectorAll('[data-friend-accept]').forEach(b => b.onclick = () => this.action('accept', b.dataset.friendAccept));
    list.querySelectorAll('[data-friend-remove]').forEach(b => b.onclick = () => this.action('remove', b.dataset.friendRemove));
  }
};

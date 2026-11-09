(() => {
  const avatar = document.getElementById('avatarButton');
  const helpButton = document.getElementById('helpButton');
  const appendTourLink = () => {
    const menu = document.getElementById('contextMenu');
    if (!menu || menu.classList.contains('hidden') || menu.querySelector('[data-tour-menu]')) return;
    menu.insertAdjacentHTML('beforeend', '<button data-tour-menu><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m8 5 11 7-11 7z"/></svg>Interactive tutorial</button>');
    menu.querySelector('[data-tour-menu]').onclick = () => { menu.classList.add('hidden'); window.CreatorTutorial.open(); };
  };
  avatar?.addEventListener('click', () => setTimeout(appendTourLink, 0));
  const originalHelp = window.help;
  if (typeof originalHelp === 'function') {
    window.help = function() {
      originalHelp();
      const modal = document.getElementById('modal');
      modal?.insertAdjacentHTML('beforeend', '<div class="help-section"><strong>Guided walk-through</strong><br>Replay the visual tour of content, connected ideas, shot planning and the calendar.<br><button class="text-btn" id="replayCreatorTour"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m8 5 11 7-11 7z"/></svg>Start the interactive tour</button></div>');
      document.getElementById('replayCreatorTour')?.addEventListener('click', () => {
        document.getElementById('modalBackdrop')?.classList.add('hidden');
        if (modal) modal.innerHTML = '';
        setTimeout(() => window.CreatorTutorial.open(), 180);
      });
    };
    if (helpButton) helpButton.onclick = window.help;
  }
})();

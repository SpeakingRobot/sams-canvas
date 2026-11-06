var Welcome = {
  step: 'email',
  pendingEmail: '',

  getSession() {
    try {
      return JSON.parse(localStorage.getItem('threadline.cloud.session') || 'null');
    } catch {
      return null;
    }
  },

  init() {
    const root = document.getElementById('welcomeScreen');
    if (!root) return;

    if (document.documentElement.dataset.welcome === 'closed') {
      root.classList.add('hidden');
      return;
    }

    this.render();
  },

  render() {
    const slot = document.getElementById('welcomeAuthSlot');
    if (!slot) return;

    const session = this.getSession();
    if (session && session.user) {
      const email = session.user.email || 'Creator';
      slot.innerHTML = `
        <div class="welcome-signed-box">
          <div class="welcome-user-pill">
            <span class="green-dot"></span>
            <span>Signed in as <strong>${this.escape(email)}</strong></span>
          </div>
          <button id="enterStudio" class="welcome-enter" type="button">
            Enter Studio
            <svg aria-hidden="true"><use href="#i-arrow"/></svg>
          </button>
          <button type="button" class="welcome-auth-link" id="welcomeSignOut">
            Switch or sign out account
          </button>
        </div>
      `;

      const enterBtn = document.getElementById('enterStudio');
      if (enterBtn) {
        enterBtn.onclick = () => this.close();
        requestAnimationFrame(() => enterBtn.focus({ preventScroll: true }));
      }

      const signOutBtn = document.getElementById('welcomeSignOut');
      if (signOutBtn) {
        signOutBtn.onclick = async () => {
          try {
            if (typeof sb === 'function') {
              await sb('/auth/v1/logout', { method: 'POST' }, true);
            }
          } catch {}
          localStorage.removeItem('threadline.cloud.session');
          localStorage.removeItem('threadline.cloud.version');
          if (typeof cloudSession !== 'undefined') cloudSession = null;
          window.cloudSession = null;
          if (typeof updateProfileUI === 'function') updateProfileUI();
          this.step = 'email';
          this.pendingEmail = '';
          this.render();
        };
      }
      return;
    }

    if (this.step === 'otp') {
      slot.innerHTML = `
        <div class="welcome-auth-box">
          <form id="welcomeOtpForm" class="welcome-auth-form">
            <label class="welcome-auth-label" for="welcomeOtp">VERIFICATION CODE</label>
            <div style="font-size:12px;color:var(--text-2);margin-bottom:2px">
              We sent an 8-digit code to <strong>${this.escape(this.pendingEmail)}</strong>
            </div>
            <input type="text" id="welcomeOtp" class="welcome-input" inputmode="numeric" autocomplete="one-time-code" minlength="8" maxlength="8" placeholder="Enter 8-digit code" required autofocus>
            <button type="submit" id="welcomeVerifyBtn" class="welcome-btn-full">
              Verify &amp; Enter Studio →
            </button>
          </form>
          <div class="welcome-auth-status" id="welcomeStatus"></div>
          <div class="welcome-auth-links" style="justify-content:center">
            <button type="button" id="welcomeBackBtn" class="welcome-auth-link">← Use a different email</button>
          </div>
        </div>
      `;

      const otpForm = document.getElementById('welcomeOtpForm');
      const otpInput = document.getElementById('welcomeOtp');
      const verifyBtn = document.getElementById('welcomeVerifyBtn');
      const statusEl = document.getElementById('welcomeStatus');
      const backBtn = document.getElementById('welcomeBackBtn');

      if (backBtn) {
        backBtn.onclick = () => {
          this.step = 'email';
          this.render();
        };
      }

      if (otpInput) {
        requestAnimationFrame(() => otpInput.focus({ preventScroll: true }));
      }

      if (otpForm) {
        otpForm.onsubmit = async (e) => {
          e.preventDefault();
          const token = otpInput.value.trim();
          if (!token) return;

          verifyBtn.disabled = true;
          verifyBtn.textContent = 'Verifying…';
          if (statusEl) {
            statusEl.style.color = 'var(--accent)';
            statusEl.textContent = 'Confirming your code…';
          }

          try {
            let result;
            try {
              result = await sb('/auth/v1/verify', {
                method: 'POST',
                body: { email: this.pendingEmail, token, type: 'email' }
              });
            } catch (err1) {
              try {
                result = await sb('/auth/v1/verify', {
                  method: 'POST',
                  body: { email: this.pendingEmail, token, type: 'signup' }
                });
              } catch {
                throw err1;
              }
            }

            const newSession = {
              ...result,
              expires_at: Date.now() / 1000 + (result.expires_in || 3600)
            };
            localStorage.setItem('threadline.cloud.session', JSON.stringify(newSession));
            if (typeof cloudSession !== 'undefined') cloudSession = newSession;
            window.cloudSession = newSession;

            if (typeof updateProfileUI === 'function') updateProfileUI();
            if (typeof startCloud === 'function') startCloud(true);
            if (typeof toast === 'function') {
              toast('Welcome! Signed in as ' + (newSession.user?.email || this.pendingEmail));
            }

            // Immediately enter studio workspace
            this.close();
          } catch (err) {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify & Enter Studio →';
            if (statusEl) {
              statusEl.style.color = '#ef4444';
              statusEl.textContent = err.message || 'Invalid code. Please try again.';
            }
          }
        };
      }
      return;
    }

    // Step 1: Email Form
    slot.innerHTML = `
      <div class="welcome-auth-box">
        <form id="welcomeEmailForm" class="welcome-auth-form">
          <label class="welcome-auth-label" for="welcomeEmail">CREATOR SIGN IN OR SIGN UP</label>
          <input type="email" id="welcomeEmail" class="welcome-input" placeholder="name@example.com" value="${this.escape(this.pendingEmail)}" required autocomplete="email" autofocus>
          <button type="submit" id="welcomeSendBtn" class="welcome-btn-full">
            Send 8-digit sign-in code →
          </button>
        </form>
        <div class="welcome-auth-status" id="welcomeStatus"></div>
      </div>
    `;

    const emailForm = document.getElementById('welcomeEmailForm');
    const emailInput = document.getElementById('welcomeEmail');
    const sendBtn = document.getElementById('welcomeSendBtn');
    const statusEl = document.getElementById('welcomeStatus');

    if (emailInput) {
      requestAnimationFrame(() => emailInput.focus({ preventScroll: true }));
    }

    if (emailForm) {
      emailForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim().toLowerCase();
        if (!email) return;

        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending code…';
        if (statusEl) {
          statusEl.style.color = 'var(--accent)';
          statusEl.textContent = 'Sending 8-digit code to your email…';
        }

        try {
          await sb('/auth/v1/otp', {
            method: 'POST',
            body: { email, create_user: true }
          });

          this.pendingEmail = email;
          this.step = 'otp';
          this.render();
        } catch (err) {
          sendBtn.disabled = false;
          sendBtn.textContent = 'Send 8-digit sign-in code →';
          if (statusEl) {
            statusEl.style.color = '#ef4444';
            statusEl.textContent = err.message || 'Could not send verification code.';
          }
        }
      };
    }
  },

  close() {
    const root = document.getElementById('welcomeScreen');
    try {
      sessionStorage.setItem('sams-canvas.entered', '1');
    } catch {}
    document.documentElement.dataset.welcome = 'closed';
    if (root) {
      root.classList.add('leaving');
      setTimeout(() => root.classList.add('hidden'), 240);
    }
    requestAnimationFrame(() => {
      if (typeof updateTabs === 'function') updateTabs();
      if (typeof tab !== 'undefined' && tab === 'whiteboard' && typeof updateTransform === 'function') {
        updateTransform();
      }
    });
  },

  escape(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

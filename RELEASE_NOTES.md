# Sam's Canvas 1.9.0 — Testing preview

A private testing build of Sam's Canvas — Creator Studio featuring the new custom typography logo and a streamlined startup authentication gate.

### What's New in 1.9.0

- **Brand & Custom Logo:** Integrated the official "Sam's Canvas" custom logo across the application icon, welcome startup screen, sidebar header, project whiteboard title, Windows desktop taskbar icon, and installer.
- **Startup Authentication Gate:**
  - Authentication prompt presented immediately on the welcome screen before entering the workspace.
  - Single-step Email OTP flow: enter your email, receive an instant 6-digit verification code, and confirm.
  - Immediate entry upon OTP confirmation: session is created, securely saved, and the studio opens automatically with zero redundant sign-in prompts inside.
  - Persistent sessions: your login state is preserved across application launches and restarts on both desktop and web.
  - "Welcome back" return view recognizing your signed-in email with one-click direct entry and account switching options.
  - Offline guest mode: "Continue as guest" escape hatch available to test locally without cloud sync.
- **Supabase Cloud Synchronization:** Automatic real-time sync with Supabase for research boards, content items, shot sequences, and publishing calendars.
- **Desktop & Web Parity:** Full offline-first local storage fallback with cloud synchronization when online.

### Windows Installation

Download and run **Sams-Canvas-Setup-1.9.0.exe** to install Sam's Canvas on Windows.
The executable is also available unpacked in `release-1.9.0/win-unpacked/Sam's Canvas.exe`.

SHA256 checksums are provided in `SHA256SUMS.txt`.

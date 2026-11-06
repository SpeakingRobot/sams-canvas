# Sam's Canvas 1.10.0 — Testing preview

A private testing build of Sam's Canvas — Creator Studio with a cleaned-up authentication flow.

### What's New in 1.10.0

- **Cleaned welcome screen:** Logo removed from the startup page; just the app name and login form — no distractions.
- **Tagline update:** "Your Creative Space" replaced with "Content planning hub" throughout the interface.
- **8-digit OTP:** Verification code input now correctly enforces an 8-digit code (matching Supabase's default OTP length).
- **Login only on startup:** Removed all guest / "test offline" escape links from the sign-in flow. Users must log in to enter the studio.
- **Persistent session:** Session saved in `localStorage` on OTP confirmation; next launch goes straight to "Welcome back" with one-click entry.

### Windows Installation

Download and run **Sams-Canvas-Setup-1.10.0.exe** to install Sam's Canvas on Windows.

SHA256 checksums are provided in `SHA256SUMS.txt`.

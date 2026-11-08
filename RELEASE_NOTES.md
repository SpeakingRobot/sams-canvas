# Sam's Canvas 1.10.1 — Testing preview

A private testing build of Sam's Canvas — Creator Studio with a clearer new-content creation flow.

### What's New in 1.10.1

- **Create content directly:** The New content action opens a form for content name, platform, format, description, talking points, status, and optional publish date and time.
- **Linked research board:** Creating content also creates its associated blank research board, so the content card is ready to plan without asking for a project name.
- **Clear action labels:** The content calendar action is labeled New content as well.

### Windows Installation

Download and run **Sams-Canvas-Setup-1.10.1.exe** to install Sam's Canvas on Windows.

SHA256 checksums are provided in `SHA256SUMS.txt`.

---

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

# Sam's Canvas 1.11.0 — In-app updates

### What's new

- **Check updates inside Settings:** The Windows desktop app checks for a newer release when you open it and keeps manual checks available in Settings.
- **Review before updating:** Read release notes before deciding to download.
- **Download and install in the app:** See download progress, then install the update and relaunch Sam's Canvas.
- **Private release channel:** The updater is wired to the SpeakingRobot Supabase proxy; its server-side GitHub token must be configured before update downloads are available.
- **Simpler Windows setup:** The NSIS installer keeps the guided install flow, adds a Start menu shortcut, and uses Sam's Canvas as the shortcut name.

### Windows Installation

Download and run the Windows setup installer to install Sam's Canvas.

---

# Sam's Canvas 1.10.2 — Testing preview

### What's new

- **Simpler content details:** Create and edit only the content name, platform, video or picture format, and description.
- **Platform icons:** The platform menu shows a custom mark beside each social, publishing, and web destination.
- **Better card controls:** Right-click a content card to edit details or delete it. Select a card and press Delete to remove it with its linked board and shot history.
- **Content names stay independent:** Changing content details no longer renames its research board.
- **No generic card subtitle:** Cards show the creator’s description instead of the placeholder sentence.

### Windows Installation

Download and run **Sams-Canvas-Setup-1.10.2.exe** to install Sam's Canvas on Windows.

SHA256 checksums are provided in `SHA256SUMS.txt`.

---

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

# Sam's Canvas — Creator Studio

A full-screen creator workspace for Windows and the web. This private testing build opens without an account. A startup screen leads into the saved workspace through **Enter**.

## Run locally

Requires Node.js 22 or newer. The web app has no runtime dependencies or build step.

```sh
npm start
```

Open http://localhost:4173. The static `dist/` folder also works on an HTTPS static host, with offline caching after the first visit.

## Windows

Installer: `release-1.10.0/Sam's Canvas Setup 1.10.0.exe`.
Portable application: `release-1.10.0/win-unpacked/Sam's Canvas.exe`.

```sh
npm ci
npm run desktop:build
```

The installer is unsigned. macOS packaging is planned for later. Electron uses sandboxing, context isolation, and no renderer Node access. Existing desktop data from the earlier app name is preserved when available.

## Workflow

1. **Content:** each project is one content item, with the same name. Drag its socket to a publishing-day channel. Double-click a card to open its whiteboard. The left canvas zooms independently of the fixed digital publishing patchbay. K enables the knife; V selects; Escape or right-click leaves knife mode. Right-drag also cuts wires.
2. **Whiteboard:** collect notes, text, images, links, YouTube thumbnails, tables, shapes, and pen drawings. Connect ideas through four sockets. Text and sticky notes edit directly; text cards resize by reflowing content. Shift-resize scales proportionally, while images can stretch. New images fit within 40% of the viewport. There is no separate content brief.
3. **Shot Sequencer:** a film-style script and recording tracker. One shot list per project, shared with the embedded whiteboard card. Left-click stamps Recorded; right-click clears. Completed lists move to History and can be reopened.
4. **Content Calendar:** a month grid with all scheduled titles and optional times. Mark content Posted, or drag unposted cards to another day. Clicking opens the shot list when available; otherwise it offers the Content view. Days grow to show all their content without individual scrollbars.

The project control stays at the top left on every tab. It provides project switching, a searchable project grid, renaming, new projects, deletion, and backup options. The avatar contains settings, appearance, interaction sounds, help, backups, and optional cloud connection.

Refresh restores the tab, project, shot content/history, month, and canvas viewports. The startup screen appears once per app/browser-tab session; refresh after Enter returns directly to the workspace. All creative work auto-saves locally.

## Creative tools

- Shift-drag selects a rectangle; Ctrl+Shift-drag draws a lasso. Ctrl A includes cards and pen strokes. Format arranges selected ideas without overlaps.
- Ctrl C/X/V copies, cuts, and pastes; Ctrl D duplicates; Ctrl Z undoes. Undo defaults to 25 steps, adjustable to 1000 in Settings.
- Mouse wheel zooms, including over editable canvas text. Shift + wheel pans vertically; drag an empty area to pan.
- Sticky notes have opaque colored paper, a folded corner, optional natural tilt, and repeated placement. Escape or right-click exits placement.
- Stamps use a press-and-lift animation. Stamps placed on cards attach to the parent; they move with it and can be selected and deleted.
- A digital clock provides time, countdown, count-up, and alarms through physical-style controls and a vector segmented LCD.
- A six-channel atmosphere mixer has fader levers, four presets, master volume, and offline nature recordings plus ambient keys.
- The clock and mixer can move around the screen, stay within its edges, or be pinned to the canvas and detached again.
- Wire grabs, connections, sparks, cutting, and stamping have small offline sound effects. Content connections have electrical sparks; cuts make the cable ends recoil. Settings controls interaction sounds.
- Neutral light/dark appearances, small custom pressing/pinching/gripping cursors, and reduced-motion support. The bottom toolbar has a gentle hover lift; the top tabs have icons without hover motion.

Screens must be at least 960 × 600. Smaller screens show a screen-size notice.

## Storage and Supabase later

Data saves in localStorage. Export a JSON workspace backup from the avatar menu to move work between web and desktop. These use separate local stores. Audio does not autoplay after a reload.

Optional setup:

1. Create a Supabase project and run `supabase/schema.sql`. It creates one workspace per authenticated user with row-level security.
2. Enable email authentication. The Magic Link email template should include `{{ .Token }}` for code-based login. Configure SMTP for production email delivery.
3. Open Account & cloud sync and enter the project URL and public publishable/anon key. Never use a secret or service-role key.
4. Sign in with an email code when ready. If there is already a cloud workspace, choose the starting copy before syncing.

Cloud revision checks avoid silent overwrites. Live collaboration, automatic social publishing, billing, and required sign-up are not implemented. A live Supabase project has not been connected or tested in this build.

## Validation and source

```sh
npm run check
npm test
```

Regression checks cover timers, layouts, hidden-note width, drawing selection, undo limits, responsive resizing, calendar routing/rescheduling, compositor dragging, view restoration, LCD rendering, and SFX audio graphs.

The UI lives in `dist/`; `desktop/main.cjs` wraps the same assets in Electron. `server.mjs` runs the local preview. Optional cloud SQL lives in `supabase/`.

Nature recording sources and licenses are in `dist/audio/CREDITS.md`. Hand artwork credits are in `dist/vendor/CREDITS.md`.

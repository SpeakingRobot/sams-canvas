# Shared canvases

## Enable in Supabase

1. Open the SQL Editor for the same Supabase project configured in Account & Cloud Sync.
2. Paste the contents of `collaboration-setup.sql` and click **Run**. This includes the original sharing migration plus invite links. If `collaboration.sql` was already applied, you can run only `collaboration-links.sql`. Run `schema.sql` first if this is a new project.
3. Reopen Sam’s Canvas 1.14.0. Both people must sign into their own accounts connected to this project.

The migration runs in a transaction and can be run again. It adds `canvas_rooms`, `canvas_members`, `canvas_receipts`, membership policies, and four mutation functions. It does not alter `creator_workspaces`. No service-role key is used in the app.

## Invite and open a canvas

1. Open the canvas you want to share and click **Share** near the upper right.
2. Click **Share this canvas**, then enter the other person’s existing account email and click **Invite collaborator**.
3. The other person opens **Share → Shared with you** and selects the board.
4. Both can edit. Each person keeps their own pan, zoom, selection, and current tab. Colored cursors show where the other person is pointing on the whiteboard; drag previews update while moving cards.

Invites grant access immediately to an existing account; they do not send email. Only the owner can invite or remove other members. The owner can remove access in the Share dialog. Other private boards are not shared.

## Invite links

The owner can use **Share → Create invite link → Copy link**. Anyone with that link can join after signing into an account on the same Supabase project. Desktop links use `samscanvas://join?token=…` and open the installed app; web links from a hosted website open the web app. Localhost previews generate desktop links because a localhost address cannot be used by another computer. A signed-out recipient's invite is kept while they sign in. Desktop links require Sam’s Canvas to be installed.

You can also open **Share → Join by invite link**, paste the complete desktop or web invite link in the field (or use **Paste link**), and click **Join canvas**. Invalid or expired links show an error in place so you can correct the link and retry. This uses the same invite permissions and requires no additional SQL migration.

Links expire after seven days. Creating a new link replaces the previous link. **Disable link** prevents further joins; members who already joined keep access until the owner removes them. Only the hash of the random invite token is stored in Supabase, and the token table is not directly accessible to clients.

## Sync behavior

Cards, wires, drawings, content details, scheduling, and shot lists persist in the shared room. Changes to different card properties merge. Concurrent changes to the same property use the last server write; text is not merged character by character. Offline changes queue on the device and retry when it reconnects. The local storage limit and a 20 MB shared-board payload limit still apply.

Private Supabase Realtime channels carry presence, cursors, drag previews, and notifications to fetch durable updates. A revision poll catches missed notifications and checks membership every 1.5 seconds. Access removal is enforced on durable reads/writes immediately and the app disconnects the removed member’s channel on its next membership check. Cursors are never persisted in your board.

Online collaborators appear beside Share as initial avatars with green rings. The connection label names the people connected to the board. Remote cursors show the current tool (including knife, pen, hand, sticky note, shapes, and stamps), with a tool label beside the collaborator's name. The online roster is also available inside Share. Presence is temporary, and disconnected collaborators are not shown with live cursors or green avatar rings. No additional SQL migration is required for these indicators.

Version 1.15.0 streams temporary ink, card movement/resizing, wire previews, and text as it is typed. Text and embedded shot notes show a typing indicator. These previews are separate from saved state, so they can appear while the recipient is also working without changing their selection or camera. Durable changes still save through the room's existing property-level merge. Very long stroke previews are sampled to bound network traffic; the saved stroke retains its complete points.

The eraser is in the whiteboard toolbar (**E**). Drag it over pen drawings to remove parts of a stroke. Adjust its size in the tool options; Ctrl Z restores the previous drawing. The eraser does not delete cards or references, which keep their existing Delete action. Erasing is also previewed live for collaborators.

## Validation

`npm run check` and `npm test` include syntax and property-merge checks. During development, the migration was also executed against a temporary PostgreSQL runtime with owner/member/outsider roles, including retry and revocation checks. Two headless browser clients verified rendering, concurrent changes, and cursor positions with a simulated transport. A real two-account Supabase session must be checked after you apply the migration.

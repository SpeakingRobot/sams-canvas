# Private desktop release updater

The Windows desktop app checks this authenticated function for `latest.yml`, release notes, and installer files. GitHub access credentials are read only by the function and must never be added to the app, repository, or a client-side setting.

## One-time setup

1. Create a fine-grained GitHub token restricted to `speakingrobot/sams-canvas` with **Contents: read-only** access.
2. In Supabase project settings, add the token as the Edge Function secret `GITHUB_RELEASE_TOKEN`. Keep it out of chat and source control.
3. Deploy this function as `release-updates` with JWT verification enabled. The function also validates the user's session with Supabase Auth.

With the Supabase CLI, deploy from the repository root using `supabase functions deploy release-updates`. Set the secret from the Supabase dashboard or with the CLI before deploying.

## Each Windows release

Build the Windows NSIS installer with `npm run desktop:build`. Publish these generated assets on the matching **private** GitHub release:

- `latest.yml`
- `*.exe`
- `*.exe.blockmap` (when produced)

The release must be published (not a draft) and tagged with its app version, for example `v1.11.0`. The proxy selects the newest published release that includes `latest.yml`, serves release notes, and streams the installer to authenticated desktop users.

## Verification notes

The browser/PWA build does not have an auto-install path and will show the desktop-only note in Settings. Windows NSIS is the supported updater target in this setup. macOS update packaging is not configured.

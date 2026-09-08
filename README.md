# Roots Atlas (family-roots)

Universal family tree viewer and editor backed by Firebase (`roots-atlas`).

- Unlisted trees: no public directory; each tree has a private view link
- View link: anyone with `?v=` can browse without signing in
- Editors: sign in to add/edit people, relationships, photos, and invites
- Multiple family trees supported, each with its own URL slug
- Photos are stored as compressed base64 in Firestore

## Local setup

1. Copy `.env.example` to `.env.local` and add your Firebase web app config.

2. Deploy Firestore rules (once):

```bash
npx firebase login
npm run deploy:rules
```

3. Run the app:

```bash
npm install
npm run dev
```

4. First-time setup in the browser:
   - Open `/login` and create your account
   - Open `/admin` → create a family tree (name + URL slug)

## Deploy hosting

Deploy manually from a machine that has `.env.local` (or equivalent env vars) with your Firebase web app config — those values are baked into the production bundle at build time.

```bash
npm run build
npx firebase deploy
```

Or use the combined script:

```bash
npm run deploy
```

Site URL: `https://roots-atlas.web.app`

There is no GitHub Actions auto-deploy; pushes to `main` do not update the live site.

## Share a view link

1. Sign in → open a family’s **Manage** page (`/families/{slug}/admin`)
2. Copy the **Share view link** URL (`/families/{slug}?v={viewKey}`)
3. Send that full link to viewers — they do not need an account

Regenerating the view link invalidates older links.

## Invite an editor

1. Sign in → open a family’s **Manage** page (`/families/{slug}/admin`)
2. Under **Invite an editor**, choose **Open link** or **Email-bound link**
3. Copy the join link (`/families/{slug}/join/{token}`) and send it
4. They sign in (or sign up) via that link and become an editor

Legacy email invites (`pendingInviteEmails`) still work until removed.

## Security note

This app uses practical unlisted access: the UI and Firestore listing rules hide trees from casual discovery, but direct Firestore reads remain possible for someone with the Firebase web config. Strict enforcement would require Cloud Functions or authenticated view grants.

## Testing

```bash
npm run check          # lint + typecheck + unit + rules tests
npm run test:unit
npm run test:e2e
```

## Architecture

- Domain graph and validation live in `src/domain/`.
- Firestore repositories live in `src/data/firestore/`.
- The complete-family tree renderer lives in `src/features/tree/`.
- View access is app-enforced via `viewKey`; rules enforce editor-only writes and field invariants.

See `docs/architecture/` for domain and layout notes.

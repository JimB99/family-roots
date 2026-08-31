# Roots Atlas (family-roots)

Universal family tree viewer and editor backed by Firebase (`roots-atlas`).

- Public read: anyone can browse published family trees
- Editors only: sign in to add/edit people, relationships, photos, and invites
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

## Invite a contributor

1. Sign in → open a family’s **Manage** page (`/families/{slug}/admin`)
2. Add their email under **Invite contributor**
3. They sign up with that same email and automatically get edit access

## Developer: spreadsheet import (CLI only)

One-time data migration from a visual Excel pedigree chart:

```bash
npm run import:stamm -- "path/to/file.xls"
npm run import:stamm -- "path/to/file.xls" --commit --slug=miller-family --name="Miller Family"
```

Requires `FIREBASE_SERVICE_ACCOUNT` pointing to a service-account JSON for `--commit`.

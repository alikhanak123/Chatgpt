# Salah Tracker: handover guide for AI assistants (ChatGPT / Codex / Claude)

Read this whole file before changing anything. It explains what the project is, how it is built,
the rules the owner cares about, and exactly how to publish changes to Firebase.

## 1. What this is

**Salah Tracker** is a live website for children to track their 5 daily prayers.

- **Live site:** https://prayertracker.web.app (the old address https://kids-salah-tracker.web.app redirects there).
- **Owner:** a non-technical parent. Explain things in plain English, with no jargon, and keep the kids' experience simple and friendly.
- **Users:** children (roughly ages 5–14) and their parents, mainly in Oman (the default city is Muscat).

What a kid can do:

- Create an account with a @username, a display name, a 4-digit PIN, date of birth, city/country and a 3D emoji avatar.
- Tick prayers: Prayed / Late / Missed / Excused, plus "I did it later" (qaza).
- Earn grades, streaks and badges.
- Feed and grow a 3D pet.
- Add Salah Buddies through a WhatsApp invite link, see rankings, and send stickers/nudges.
- Play games (Four in a Row, Tic-Tac-Toe, Chess, Memory, Snakes & Ladders for 2–4 players, Air Hockey), online with buddies or against the computer.
- Read a how-to-pray guide.

What grown-ups can do:

- Use **Grown-up mode** inside the kid's login (with the grown-up PIN), or log in separately: on the login screen choose "I'm a grown-up", then enter the child's username and the grown-up PIN.
- Confirm prayers (only when the admin switch requires it) and fix ticks.
- Send the child a message and change PINs.

The **admin page** is at `/admin`: it shows all kids and activity and holds the app switches.

## 2. Tech stack (no build step)

- Plain HTML, CSS and JavaScript ES modules. **No bundler, no npm dependencies, no build.** The files in `public/` are served exactly as they are.
- **Firebase** on the free Spark plan, project id `family-salah-tracker-765ed`:
  - Hosting: two sites, configured in `firebase.json`.
    - `prayertracker` serves `public/`. This is the real app.
    - `kids-salah-tracker` serves `redirect/` and returns a 301 to the new address.
  - Authentication: email/password, but users never see an email address (see section 4).
  - Cloud Firestore: profiles, prayer ticks, leaderboard, config, activity.
  - Realtime Database (europe-west1): games, live game state, nudges, game inbox.
- The Firebase SDK is loaded from `https://www.gstatic.com/firebasejs/10.12.2/...` using normal ES imports.
- The Firebase web config is **not stored in the repo**. The app fetches it at runtime from `/__/firebase/init.json`, which Firebase Hosting provides. So the app only works when served from Firebase Hosting or the emulator, not when you open the file directly.
- **three.js 0.160** comes from cdn.jsdelivr, set up through the import map in `public/index.html`. It powers the 3D pets.
- **Prayer times** come from the AlAdhan API, calculated with the Hanafi Asr method.

## 3. Files

| File | What it does |
|---|---|
| `public/index.html` | The whole main app: CSS, state, login/sign-up, the kid view, the grown-up view, scoring, badges, calendar, buddies and boot code. It is large, so search by function name. |
| `public/prayer.js` | Prayer times (AlAdhan), rakat chips, the how-to-pray guide (Arabic + transliteration + meaning). |
| `public/games.js` | Online games with buddies (Realtime Database) and the games panel. |
| `public/solo.js` | Games against the computer (Easy / Medium / Hard). |
| `public/chesskit.js` | Chess rules and engine. |
| `public/nudges.js` | Stickers/nudges between buddies (Realtime Database). |
| `public/pet.js` | The pet programme: pet list, levels, the pet panel, the pet chooser, and a 2D fallback. |
| `public/pet3d.js` | 3D pet scene (three.js): loads GLB models, lighting, garden, calm wandering, crown/bow/stars by level. |
| `public/petrig.js` | Hand-made rigging: realistic eyes, cat walk cycle, parrot (macaw) skeleton and animation. |
| `public/admin.js` | The `/admin` page. |
| `public/models/*.glb` | 3D animal models. Licences are in `public/models/CREDITS.txt`; keep the credit line shown under the pet. |
| `public/img/*.png` | 3D Fluent emoji images used across the UI. |
| `firestore.rules` | Firestore security rules. **Security-critical.** |
| `database.rules.json` | Realtime Database security rules. **Security-critical.** |
| `firestore.indexes.json` | Leaderboard indexes. |
| `firebase.json` | Hosting setup (two sites, no-cache headers for html/js/json, SPA rewrite). |
| `redirect/index.html` | Redirect page for the old address. |

## 4. How login works (important)

- Kid login is a Firebase email/password account:
  - email = `<username>@kids.salah-tracker.example`
  - password = `<PIN>#salah-kid`
- Grown-up login is a separate account:
  - email = `<child username>@parents.salah-tracker.example`
  - password = `<grown-up PIN>#salah-parent`
  - Its `displayName` holds the child's uid.
  - The child's `users/{uid}.parent` field holds this login's uid. That field is what the rules check (`isParentOf()`).
  - The link is created by `linkParentLogin()` in `index.html`, which runs in a hidden second Firebase app instance. It runs at sign-up, when Grown-up mode is opened with the PIN, and when the grown-up PIN changes.
- The grown-up PIN is also stored as a SHA-256 hash in `users/{uid}/private/settings.parentPinHash`, so it can be checked inside the kid's session.
- Admin logins use `@admins.salah-tracker.example`. Admin uids are listed in `isAdmin()` in `firestore.rules`.

## 5. Data model

- **Firestore:**
  - `users/{uid}` is the profile. Fields: username, name, avatar, dob, city, country, joined, friends[], badges[], pet{type,name,since}, petLevel, parentMsg{from,text,t,seen}, parent, lastSeen, visits, disabled.
  - `users/{uid}/private/settings` holds `parentPinHash`.
  - `marks/{uid}_{YYYY-MM}` holds one kid's month: `{uid, month, days:{DD:{fajr:'p'|'l'|'m'|'e', …, tahajjud, ishraq}}, checked:{DD:{fajr:true…}}, qaza:{DD:{fajr:'pending'|'ok'}}}`.
  - `leaderboard/{uid}` holds numbers only: `{wk, w, wb, mk, m, mb, t}`.
  - `config/app` holds app switches, e.g. `requireConfirm` (whether grown-ups must confirm ticks; off by default).
  - `activity/{id}` is the admin's activity trail.
- **Realtime Database:** `inbox/{uid}`, `games/{gid}`, `live/{gid}`, `nudges/{to}`.

## 6. Owner's rules: do not break these

1. **English UI.** Arabic appears only in the how-to-pray guide, with transliteration and meaning.
2. **Never show the word "Hanafi" on screen.** Prayer times still follow Hanafi rules behind the scenes.
3. **Never add a child's account as an admin**, and never weaken `isAdmin()`. Admin uids are listed explicitly. Today that is only `AUccw2YJEJdaPJd4Bas2fNrPqWs2` (the owner).
4. **Never loosen the security rules** so that one kid can read or change another kid's data. A grown-up login may access only its own linked child. If you change a rule, explain why in the commit.
5. **No secrets in the repo**: no service-account keys, no `.env`, no tokens. `.gitignore` already blocks these.
6. **Kid-friendly and calm.** Bright, cute and simple. Pets must move calmly and naturally: no shaking, no creepy jumping.
7. **Free plan only** (Firebase Spark). Don't add Cloud Functions, paid APIs or anything that needs billing.
8. Keep the existing code style: small helper `el(tag, attrs, ...kids)` for DOM, `img(name)` for icons, `toast()`, `modal()`, and a `render()` that redraws the screen.

## 7. Trying changes locally

- The simplest check is the Firebase Hosting emulator, which provides `/__/firebase/init.json`. It still talks to the **real** Auth and database, so be careful:
  ```bash
  npx -y firebase-tools@latest emulators:start --only hosting
  ```
  Then open http://localhost:5000.
- Syntax check for a module: `node --check public/pet3d.js`. For `index.html`, copy the `<script type="module">` contents into a `.mjs` file and run `node --check` on it.
- Test on a phone-sized screen. Most kids use phones.

## 8. Publishing to Firebase: NOT done by ChatGPT

**The owner has decided that only Claude Code, on the owner's computer, publishes the live site.**
ChatGPT (or any other assistant working from GitHub) must **not** deploy, must not add deploy workflows or
GitHub Actions, and must not ask the owner for Firebase keys or service-account files.

What ChatGPT should do instead:
1. Make the change and check it (section 7).
2. Push it to GitHub (a branch or `main`), with a clear description of what changed.
3. Tell the owner the change is ready. The owner will ask Claude Code to review and publish it.

For reference only (Claude Code runs this on the owner's computer, which is logged in to Firebase):
```bash
npx -y firebase-tools@latest deploy --only hosting:prayertracker --non-interactive
```
Add `,firestore:rules,database` only when the rules files changed.

Before every publish, Claude Code backs up all kids' data to `salah-backups<date>` (outside this repo) and
checks afterwards that no progress changed. Kids' progress (ticks, streaks, badges, pets, scores) must never be lost.

### Rolling back
- Hosting: Firebase console → Hosting → prayertracker → release history → roll back.

## 9. Kids' data is precious
The kids' streaks, badges, pets and scores are what keeps them praying and coming back. Never rename or remove
data fields, never reset or "clean up" data, and keep reading old data formats (e.g. `checked[DD] === true`,
old pet types via `petType()`). A design change must not change what is saved.

## 10. History / where things stand
- Built and maintained with Claude Code; the source moved to GitHub on 2026-10-21. Claude Code publishes the live site.
- Recent work:
  - realistic 3D pets (rigged GLB models, matte lighting);
  - the cat got eyes and a walk cycle;
  - the parrot became a rigged scarlet macaw;
  - a separate grown-up login and dashboard.
- Grown-up login for families who signed up **before** it existed switches on the first time a grown-up opens Grown-up mode with their PIN inside the child's login.

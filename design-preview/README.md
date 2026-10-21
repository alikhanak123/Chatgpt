# Isolated visual demo

This is a separate, self-contained design demo. It uses fictional information and memory-only interactions. It does not import the Firebase SDK, use production app code, read credentials, sign in, call APIs, or persist progress. Its Content Security Policy blocks connections.

The illustrated puppy uses gentle CSS animation. This is a proposed alternative presentation, not a replacement or demonstration of the current live 3D models.

The workflow `.github/workflows/design-preview.yml` publishes only this directory to the `graphics-review` Firebase Hosting preview channel. It never deploys the live channel, rules, indexes, authentication, or databases. Preview expiry is 7 days.

Local review: `python3 -m http.server 8080 --directory design-preview` from the repository root. Test the five prayer buttons, pet pats, food interaction and bottom tabs. All changes reset on page refresh.

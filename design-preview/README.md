# Isolated 3D pet playground preview

A separate visual demo for children under 14. Uses fictional, memory-only prayer progress. No Firebase SDK, authentication, database access, credentials, message delivery, or saved progress. Nothing here is imported into the live application.

Peaches now has a new rounded character sculpt, including blinking eyes, attached to the original CC0 horse skeleton. The original horse mesh is hidden; its actual walk/idle animation still drives the new geometry. Other preview animals retain their existing GLB models. Pony, puppy, fox, and bunny can be selected. Pets explore the 3D garden autonomously; tap the ground to guide them, drag horizontally to rotate the camera, or use Walk, Snack, and Hello. The three-dimensional environment, character sculpt, materials, lighting, shadows, and UI are independent preview code. See DESIGN-SOURCES.md for the design skill and asset research.

All runtime assets are hosted locally, including the pinned Three.js 0.160.0 library. See vendor/three/LICENSE and models/CREDITS.txt for third-party licensing. Bunny credit is also visible in the UI. CSP allows only same-origin asset requests; no remote APIs are used. Automatic wandering is paused for reduced-motion preference until the user explicitly requests a walk.

Workflow `.github/workflows/design-preview.yml` publishes only this directory to the separate `salah-preview-765ed` Hosting site, available at https://salah-preview-765ed.web.app and https://salah-preview-765ed.firebaseapp.com. It validates the isolated site ID before deployment, then checks both public addresses and the animated pony in Chrome. It does not deploy live hosting, security rules, indexes, or databases.

For local review from the repository root: `python3 -m http.server 8080 --directory design-preview`. Open the local page in a WebGL-capable browser. Verify walking with animated legs, pet switching, ground destination taps, camera drag, snack and hello actions, sample prayer tick/undo, and responsive layouts. Refresh resets fictional prayer state.

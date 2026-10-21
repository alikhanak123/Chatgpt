# Design and asset research

- Frontend design workflow: https://github.com/anthropics/skills/tree/main/skills/frontend-design (Apache-2.0). Downloaded and read locally at /workspace/skills/frontend-design/SKILL.md. Applied its plan, critique, and rendered-review process.
- Alternative animated fox reviewed: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox. Rejected for this preview because its angular mesh did not address the requested character quality. This asset is not bundled.
- Rounded interface fonts: Fredoka and Nunito from https://github.com/google/fonts. Font files and their SIL Open Font Licenses are bundled in fonts/.
- Peaches: new rounded character geometry created for this preview in pony-character.js. It uses the original CC0 Quaternius horse skeleton and animation clips; the old horse mesh is hidden. Both eyes have sclera, iris, pupil, catchlights and blink motion. The face, ears, mane, body, legs, socks, hooves and tail follow the rig's animated bones.
- Other preview pets retain the existing models; their appearance has not been rebuilt in this revision. Their original credits are in models/CREDITS.txt.
- Three.js 0.160.0 is vendored with its MIT license in vendor/three/LICENSE.

The preview is independent from the live app. Its progress and interactions are fictional and reset on refresh. It has no Firebase SDK, login, database calls or real user information.

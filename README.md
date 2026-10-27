# Gesture Grove Vision

Build a polished, working web app called "GestureAI — Real-Time Hand Gesture Recognition". It is for a college engineering project and should be usable, not just a landing page.

Core functionality:
- Use the browser webcam with explicit permission via navigator.mediaDevices.getUserMedia and MediaPipe Tasks Vision HandLandmarker (or MediaPipe Hands if more reliable) to detect hand landmarks in real time entirely in the browser. Do not pretend predictions are real: show "Camera off", "Initializing model", "No hand detected", and detected results accurately based on the running model.
- Overlay 21 hand landmarks and connections on the camera canvas. Show hand count, FPS (smoothed estimate), current gesture, confidence/score when the selected classifier supports a meaningful score, and a short description.
- Implement a useful gesture classifier from hand landmark geometry for common static gestures: Open Palm, Fist, Thumbs Up, Peace/V Sign, OK Sign (where achievable), Pointing Up, and Unknown. Explain in the UI that geometry-based classification is an MVP and some gestures can be ambiguous depending on orientation/lighting. Be conservative rather than claiming perfect accuracy.
- Camera controls: Start Camera, Stop Camera, camera selection if multiple devices exist, mirror toggle, and graceful error handling for permissions/insecure origin/no device.
- Add a gesture history panel with timestamps, only recording when the detected gesture changes or stays stable for a cooldown; provide clear history control.
- Add a practice/learning area with cards for supported gestures, simple illustrated hand icons or tasteful icons, and guidance for positioning/lighting.
- Add a test/demo mode that can be used without a camera to explore the UI, clearly labeling sample results as demo data so it cannot be mistaken for live detection.
- Accessible responsive design, mobile-friendly layout, loading/error/empty states, no misleading metrics, clear camera privacy note (video processed locally; don't upload or save camera footage).
- Make sure the actual live detection loop works and stops cleanly when camera is stopped or component unmounts. Handle device track cleanup and model initialization errors.
- Add a settings area for confidence/gesture sensitivity threshold, landmark visibility, and camera mirroring if feasible.

Design:
- Premium, modern AI/vision studio, dark navy/charcoal background, electric cyan and violet accents, subtle gradients, glowing restrained borders, clean readable typography, polished dashboard with a large main live camera panel and status badge, compact KPI cards, gesture history, and learning cards. Avoid generic marketing landing page. Start with the app dashboard. Use lucide icons and subtle micro-interactions. Keep all user-facing language simple and professional.
- Use React + TypeScript + Tailwind + shadcn/ui, with robust component structure. Install needed package(s) compatible with this project.
- Do not require sign-in or a database for this MVP; make it functional locally in-browser and ready to preview.
- Test/fix TypeScript and runtime issues where possible. Provide concise setup notes in the project if anything needs browser permission or HTTPS.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gesture-grove-vision.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b850665b-8b71-46f7-9d46-b1a9c20da6f4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

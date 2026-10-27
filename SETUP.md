# GestureAI setup notes
- Camera access requires HTTPS or http://localhost (browsers block getUserMedia on insecure origins). The Lovable preview/published URLs are HTTPS.
- The browser will ask for camera permission on "Start camera". If denied, re-enable it in site settings.
- The MediaPipe WASM runtime and hand_landmarker.task model are downloaded from jsDelivr / Google Storage on first start; an internet connection is needed once.
- All video is processed locally; nothing is uploaded or saved.
- Run tests: `bunx vitest run`.

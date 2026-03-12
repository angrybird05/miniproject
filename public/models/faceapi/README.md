Put face-api.js model files in this folder so the frontend can load them at runtime.

Required (recommended) models for this project:
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`
- `face_recognition_model-shard2`

Download source:
- Face-api.js repository "weights" folder (copy the files above into this directory).

After placing the files:
- Restart the Vite dev server (`npm run dev`) and reload the Attendance/Register pages.

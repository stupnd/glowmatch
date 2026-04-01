# glowmatch

## Layout

```
glowmatch/
├── README.md
├── DEVLOG.md
├── frontend/        # Next.js app (later)
├── backend/         # FastAPI (later)
│   ├── detection/   # MediaPipe + Monk classifier
│   └── api/         # routes
└── data/            # shade datasets, sample images
```

# GlowMatch

GlowMatch is an AI-powered makeup shade recommender that detects your skin tone 
from a photo and matches you to real foundation shades.

Upload a photo → GlowMatch uses MediaPipe face mesh to isolate skin regions, 
classifies your tone using the Monk Skin Tone scale, and returns personalized 
foundation matches with a Claude-powered recommendation explaining why each 
shade works for you.

## Stack
- **Frontend:** Next.js
- **Backend:** FastAPI
- **CV:** MediaPipe + Monk Skin Tone classifier (HuggingFace)
- **AI:** Claude API (text)
- **Deploy:** Vercel + Render

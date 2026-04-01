# GlowMatch Devlog

## [April 1 2026] — Project Kickoff

Starting GlowMatch from scratch. The idea is an AI makeup shade recommender 
that actually uses real computer vision instead of just wrapping a vision LLM.

**What I'm building:** Upload a photo, detect skin tone via MediaPipe + a 
fine-tuned Monk Skin Tone classifier, match to real foundation shades, and 
use Claude to generate a personalized recommendation.

**Why this stack:** Already comfortable with Next.js + FastAPI from previous 
projects. Monk Skin Tone scale is the current industry standard (used by Google) 
so it felt like the right call over rolling my own clustering approach.

**What I'm unsure about:** How accurate the HuggingFace Monk classifier will be 
on diverse lighting conditions. Might need to preprocess images (normalize 
brightness) before passing to the model. Also need to figure out the best way 
to curate the foundation shade dataset — might start with just Fenty since they 
have the most inclusive shade range.

**First milestone:** Running FastAPI server + MediaPipe pixel extraction working 
end to end.

## [April 1 2026] — Issue 1 Complete: FastAPI Skeleton

Server is running on port 8000. Health check and placeholder /analyze 
route are working. CORS set up with wildcard for now, will tighten later. 
Dependencies installed in .venv.

## [April 1 2026] — Issue 2 Complete: MediaPipe Face Mesh + Pixel Sampling

Pixel extraction working. Had to pin mediapipe==0.10.9 since 0.10.33 
dropped .solutions support. 21 landmark points sampled across cheeks 
and forehead using 7x7 patch averaging. Verified with real photo — 
getting clean RGB tuples back.
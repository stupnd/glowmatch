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
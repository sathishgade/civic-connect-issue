from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
from services.r2_service import r2_service
from services.ai_service import ai_service
import firebase_admin
from firebase_admin import credentials, firestore
from config import settings

app = FastAPI(title="Civic Connect Voice API")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase (Mock/Try)
try:
    if settings.FIREBASE_CREDENTIALS and os.path.exists(settings.FIREBASE_CREDENTIALS):
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
    else:
        print("Firebase Creds not found. Running in Mock DB mode.")
        db = None
except Exception as e:
    print(f"Firebase Init Error: {e}")
    db = None

class VoiceResponse(BaseModel):
    status: str
    complaintId: str
    data: dict

@app.post("/api/v1/complaints/voice", response_model=VoiceResponse)
async def process_voice_complaint(
    audio_file: UploadFile = File(...),
    language: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    userId: str = Form(...),
    address: Optional[str] = Form(None)
):
    try:
        # 1. Upload to R2
        audio_url = await r2_service.upload_audio(audio_file)
        
        # 2. Transcription
        # Save temp file for OpenAI usage if needed, or pass stream
        # Here we mock passing the file object directly for the service logic
        transcript = await ai_service.transcribe(audio_file.file, language)
        
        transcript_english = transcript
        if language == 'te':
            transcript_english = await ai_service.translate(transcript, 'te', 'en')
            
        # 3. AI Extraction
        extraction = await ai_service.extract_details(transcript_english, address or f"{latitude}, {longitude}")
        
        # 4. Construct Record
        complaint_record = {
            "userId": userId,
            "callType": "Voice Complaint",
            "source": "voice",
            "audioUrl": audio_url,
            "title": extraction.get('summary', 'Voice Complaint'),
            "description": extraction.get('summary', 'No description'),
            "category": extraction.get('category', 'others'),
            "priority": extraction.get('priority', 'medium'),
            "status": "pending",
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "address": address or extraction.get('location_details', 'Unknown')
            },
            "metadata": {
                "language": language,
                "transcriptOriginal": transcript,
                "transcriptEnglish": transcript_english
            },
            "createdAt": firestore.SERVER_TIMESTAMP if db else "NOW"
        }
        
        # 5. Save to Firestore
        complaint_id = "mock-id-123"
        if db:
            doc_ref = db.collection('complaints').add(complaint_record)
            complaint_id = doc_ref[1].id
            
        return {
            "status": "success",
            "complaintId": complaint_id,
            "data": complaint_record  # Returning data for client-side fallback/confirmation
        }

    except Exception as e:
        print(f"Error processing voice complaint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class AnalysisResponse(BaseModel):
    category: str
    title: str
    description: str
    priority: str

@app.post("/api/v1/analyze-image", response_model=AnalysisResponse)
async def analyze_image_endpoint(image: UploadFile = File(...)):
    try:
        # Read file
        contents = await image.read()
        
        # Resize image if too large (using Pillow)
        try:
            from PIL import Image
            import io
            
            img = Image.open(io.BytesIO(contents))
            
            # resizing to max 1024 on longest side
            max_size = 1024
            if max(img.size) > max_size:
                ratio = max_size / max(img.size)
                new_size = (int(img.width * ratio), int(img.height * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
                
                # Save back to bytes
                buffer = io.BytesIO()
                # Convert to RGB if RGBA/P (JPEGs don't support alpha)
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                    
                img.save(buffer, format="JPEG", quality=85)
                contents = buffer.getvalue()
                print(f"Image resized to {new_size}")
                
        except ImportError:
            print("Pillow not installed, skipping resize. Install with: pip install Pillow")
        except Exception as e:
             print(f"Image resize failed: {e}")

        import base64
        image_b64 = base64.b64encode(contents).decode("utf-8")
        
        result = await ai_service.analyze_image(image_b64)
        return result
    except Exception as e:
        print(f"Error analyzing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    history: list[dict]
    location_context: str = ""
    language: str = "en"

class ChatResponse(BaseModel):
    response_text: str
    is_complete: bool
    extracted_data: dict | None = None

@app.post("/api/v1/chat/complaint", response_model=ChatResponse)
async def chat_complaint_endpoint(request: ChatRequest):
    try:
        # Pass history to AI service
        result = await ai_service.run_complaint_conversation(
            request.history, 
            request.location_context,
            request.language
        )
        
        return ChatResponse(
            response_text=result["response_text"],
            is_complete=result["is_complete"],
            extracted_data=result.get("extracted_data")
        )
    except Exception as e:
        print(f"Chat Error: {e}")
        return ChatResponse(
            response_text="I'm sorry, I encountered an error. Please try again.",
            is_complete=False
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

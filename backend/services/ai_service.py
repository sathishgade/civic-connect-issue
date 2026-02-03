import httpx
import json
from config import settings

class AIService:
    def __init__(self):
        self.api_key = settings.NVIDIA_API_KEY
        self.invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json"
        }

    async def _call_nvidia_api(self, messages, max_tokens=512, temperature=0.1):
        if not self.api_key:
            return None
            
        payload = {
            "model": "mistralai/mistral-large-3-675b-instruct-2512",
            "messages": messages,
            "max_tokens": 2048,
            "temperature": 0.15,
            "top_p": 1.00,
            "frequency_penalty": 0.00,
            "presence_penalty": 0.00,
            "stream": False
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.invoke_url, headers=self.headers, json=payload, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                return data['choices'][0]['message']['content']
            except httpx.HTTPStatusError as e:
                print(f"NVIDIA API Call Failed: Status {e.response.status_code}")
                print(f"Response Body: {e.response.text}")
                return None
            except Exception as e:
                print(f"NVIDIA API Call Failed: {e}")
                return None

    async def transcribe(self, audio_file, language: str) -> str:
        """
        Transcribes audio. 
        NOTE: OpenAI Whisper removed. 
        In production, integrate Google Cloud Speech or NVIDIA Riva ASR here.
        For now, returning Mock text to enable flow.
        """
        # Mock Transcription logic
        print("Mocking Transcription (STT Service required)")
        if language == 'te':
            return "ఈ రోజు మా వీధిలో డ్రైనేజీ పారుతోంది, దయచేసి బాగు చేయండి."
        return "There is a severe drainage overflow in our street, please fix it."

    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        if source_lang == target_lang:
            return text
            
        messages = [
            {"role": "user", "content": f"Translate the following {source_lang} text to {target_lang} strictly. Output only the translation:\n\n{text}"}
        ]
        
        result = await self._call_nvidia_api(messages)
        return result if result else f"[Mock Translation] {text}"

    async def extract_details(self, transcript: str, location_context: str = ""):
        """
        Extracts structured data from transcript using NVIDIA Phi-4.
        """
        system_prompt = """
        Analyze the civic complaint text and extract:
        1. Category (road, garbage, drainage, water, streetlight, others)
        2. Summary (short description)
        3. Priority (low, medium, high, critical)
        4. Location Details
        
        Output ONLY valid JSON format like: 
        {"category": "...", "summary": "...", "priority": "...", "location_details": "..."}
        """

        messages = [
            {"role": "user", "content": f"{system_prompt}\n\nComplaint: {transcript}\nLocation Context: {location_context}"}
        ]

        result = await self._call_nvidia_api(messages)
        
        if result:
            # Cleanup JSON markdown if present
            clean_result = result.replace("```json", "").replace("```", "").strip()
            try:
                return json.loads(clean_result)
            except json.JSONDecodeError:
                print(f"JSON Decode Failed. Raw: {result}")
                
        return {
            "category": "others",
            "summary": transcript[:50] + "...",
            "priority": "medium",
            "location_details": "Extracted from speech"
        }

    async def analyze_image(self, image_b64: str) -> dict:
        """
        Analyzes an image using NVIDIA Phi-4 Multimodal to extract complaint details.
        """
        system_prompt = """
        Analyze this image of a civic issue. 
        Extract the following details in JSON format:
        1. category: (road, garbage, drainage, water, streetlight,other)
        2. title: A short, clear title.
        3. description: A detailed description of the visual issue.
        4. priority: (low, medium, high, critical)
        
        Output ONLY valid JSON: {"category": "...", "title": "...", "description": "...", "priority": "..."}
        """

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": system_prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_b64}"
                        }
                    }
                ]
            }
        ]

        print(f"Sending image analysis request to NVIDIA API...") # Debug
        result = await self._call_nvidia_api(messages, max_tokens=512)
        
        print(f"Raw AI Response: {result}") # Debug

        if result:
            # Try to find JSON content if it's wrapped in markdown or just messy
            import re
            json_match = re.search(r'\{.*\}', result.replace('\n', ''), re.DOTALL)
            
            clean_result = result
            if json_match:
                 clean_result = json_match.group(0)
            else:
                 # Fallback cleanup
                 clean_result = result.replace("```json", "").replace("```", "").strip()
            
            try:
                parsed = json.loads(clean_result)
                # Ensure keys exist/lowercase category
                if "category" in parsed:
                    parsed["category"] = parsed["category"].lower()
                return parsed
            except json.JSONDecodeError:
                print(f"Image Analysis JSON Decode Failed. Raw: {result} | Cleaned: {clean_result}")
        else:
            print("NVIDIA API returned None/Empty result.")
        
        return {
            "category": "others",
            "title": "Issue Detected",
            "description": "Could not analyze image details automatically. (Analysis Failed)",
            "priority": "medium"
        }

    async def run_complaint_conversation(self, history: list, location_context: str = "", language: str = "en") -> dict:
        """
        Drives the conversational complaint intake.
        Returns a dict with 'response_text' (for TTS) and optional 'extracted_data' if complete.
        """
        
        # English System Prompt
        system_prompt_en = f"""
        You are a helpful civic complaint intake assistant for 'CivicConnect'.
        Your goal is to gather the following details from the user:
        1. Category (road, garbage, drainage, water, streetlight, others)
        2. Description (What exactly is the problem?)
        3. Priority/Severity (Does it look dangerous/urgent?)
        
        CONTEXT:
        - The user's GPS location is ALREADY CAPTURED ({location_context}). You verify this location only if necessary.
        - Act as a polite interviewer.
        - Ask ONE short clarifying question at a time.
        - Keep your responses BRIEF (max 1-2 sentences) as they will be spoken aloud.
        
        TERMINATION:
        - When you have obtained Category, Description, and Priority, output the special token [COMPLETE] followed immediately by a JSON object.
        - JSON Format: {{"category": "...", "title": "...", "description": "...", "priority": "..."}}
        
        Example:
        Assistant: "How large is the pothole?"
        User: "It's big."
        Assistant: [COMPLETE] {{"category": "road", "title": "Large Pothole", "description": "Big pothole blocking traffic", "priority": "high"}}
        """

        # Telugu System Prompt
        system_prompt_te = f"""
        మీరు 'CivicConnect' కోసం సహాయక పౌర ఫిర్యాదు స్వీకరణ సహాయకులు.
        మీ లక్ష్యం వినియోగదారు నుండి కింది వివరాలను సేకరించడం:
        1. వర్గం (రోడ్డు, చెత్త, డ్రైనేజీ, నీరు, వీధి దీపం, ఇతర)
        2. వివరణ (సమస్య ఏమిటి?)
        3. తీవ్రత (అది ప్రమాదకరంగా ఉందా?)
        
        సందర్భం:
        - వినియోగదారు GPS స్థానం ఇప్పటికే తీసుకోబడింది ({location_context}).
        - మర్యాదపూర్వక ఇంటర్వ్యూయర్‌గా వ్యవహరించండి.
        - ఒక సమయంలో ఒక చిన్న ప్రశ్న అడగండి.
        - మీ సమాధానాలు చాలా క్లుప్తంగా (గరిష్టంగా 1-2 వాక్యాలు) ఉండాలి ఎందుకంటే అవి బిగ్గరగా చదవబడతాయి.
        - **ముఖ్య గమనిక**: మీరు మీ ప్రతిస్పందనను పూర్తిగా తెలుగులో (Telugu Script) ఇవ్వాలి.
        
        ముగింపు:
        - మీరు వర్గం, వివరణ మరియు తీవ్రతను పొందినప్పుడు, [COMPLETE] అనే ప్రత్యేక టోకెన్‌ను అవుట్‌పుట్ చేయండి, దాని వెంటనే JSON ఆబ్జెక్ట్ ఉంటుంది.
        - JSON ఫార్మాట్ (ఇంగ్లీష్ కీలతో): {{"category": "...", "title": "...", "description": "...", "priority": "..."}}
        
        ఉదాహరణ:
        Assistant: "ఆ గుంత ఎంత పెద్దది?"
        User: "చాలా పెద్దది."
        Assistant: [COMPLETE] {{"category": "road", "title": "Large Pothole", "description": "Big pothole blocking traffic", "priority": "high"}}
        """

        selected_prompt = system_prompt_te if language == 'te' else system_prompt_en

        messages = [{"role": "system", "content": selected_prompt}] + history

        print(f"Running conversation step with {len(history)} user turns (Lang: {language})...")
        result = await self._call_nvidia_api(messages)
        
        if not result:
            return {
                "response_text": "I'm having trouble connecting to the server. Please try again." if language == 'en' else "సర్వర్‌కి కనెక్ట్ చేయడంలో సమస్య ఉంది. దయచేసి మళ్లీ ప్రయత్నించండి.",
                "is_complete": False
            }

        # Check for completion token
        if "[COMPLETE]" in result:
            parts = result.split("[COMPLETE]")
            response_text = parts[0].strip() 
            json_text = parts[1].strip()
            
            # Simple cleanup if the model chatters after JSON
            import re
            json_match = re.search(r'\{.*\}', json_text, re.DOTALL)
            extracted_data = None
            
            if json_match:
                try:
                    clean_json = json_match.group(0)
                    extracted_data = json.loads(clean_json)
                    if "category" in extracted_data:
                        extracted_data["category"] = extracted_data["category"].lower()
                except:
                    print(f"Failed to parse final JSON: {json_text}")

            # If the model didn't say anything before [COMPLETE], provide a generic success message
            if not response_text:
                response_text = "Got it. Submitting your report now." if language == 'en' else "అర్థమైంది. మీ నివేదికను ఇప్పుడు సమర్పిస్తున్నాను."

            return {
                "response_text": response_text,
                "is_complete": True,
                "extracted_data": extracted_data
            }
        else:
            # Continue conversation
            return {
                "response_text": result,
                "is_complete": False
            }

ai_service = AIService()

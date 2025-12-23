
from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import traceback
import os
import glob
import time
import google.generativeai as genai
import yt_dlp

# Import library and attempt to detect version/style
try:
    from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
except ImportError:
    print("[Proxy] Critical Error: youtube_transcript_api not installed.")
    YouTubeTranscriptApi = None

app = Flask(__name__)
CORS(app)

def extract_video_id(url):
    pattern = r'(?:v=|\/)([0-9A-Za-z_-]{11}).*'
    match = re.search(pattern, url)
    if match:
        return match.group(1)
    if len(url) == 11:
        return url
    raise ValueError("Invalid YouTube URL")

def download_audio_no_ffmpeg(video_id):
    """
    Downloads audio for the given video_id using yt-dlp.
    Selects 'm4a' specifically to avoid ffmpeg requirement for generic download.
    Returns the path to the downloaded file.
    """
    url = f"https://www.youtube.com/watch?v={video_id}"
    
    # Options to download ONLY audio, in m4a format, without needing conversion
    ydl_opts = {
        'format': 'bestaudio[ext=m4a]/bestaudio', # Prefer m4a for Gemini compatibility
        'outtmpl': f'%(id)s.%(ext)s',
        'noplaylist': True,
        'quiet': True,
        # 'ffmpeg_location': '...' # Not needed if we get native format
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            print(f"[Proxy] Downloading audio for {video_id} using yt-dlp...")
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            print(f"[Proxy] Downloaded audio file: {filename}")
            return filename
    except Exception as e:
        print(f"[Proxy] yt-dlp download failed: {e}")
        return None

def transcribe_with_gemini(audio_path, api_key):
    """
    Uploads audio to Gemini 1.5 Flash and requests transcription.
    """
    try:
        print("[Proxy] Configuring Gemini...")
        genai.configure(api_key=api_key)
        
        print(f"[Proxy] Uploading {audio_path} to Gemini...")
        audio_file = genai.upload_file(path=audio_path, mime_type="audio/mp4") # m4a is audio/mp4 container
        
        # Wait for processing? Usually instant for small files, but good to check state if needed.
        # For Flash and audio uploads, it's typically ready quickly.
        
        print("[Proxy] Requesting transcription from Gemini 2.5 Flash...")
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        # Prompt specifically for verbatim transcription
        response = model.generate_content(
            [
                "Please transcribe this audio file verbatim. Do not summarize. Return only the full text transcription.",
                audio_file
            ]
        )
        
        print("[Proxy] Transcription received.")
        return response.text
        
    except Exception as e:
        print(f"[Proxy] Gemini transcription failed: {e}")
        traceback.print_exc()
        return None
    finally:
        # Cleanup uploaded file from Gemini cloud if possible/needed? 
        # Standard API usage often cleans up or expires. 
        # Local file cleanup is handled by caller.
        pass

def fetch_transcript_universal(video_id, languages=['ja', 'en']):
    """
    Universal fetcher that handles:
    1. Standard version (0.6.x) using static get_transcript/list_transcripts and dict responses.
    2. Weird version (1.2.x) using instance .list() and object responses.
    """
    if not YouTubeTranscriptApi:
        raise Exception("Library not installed")

    # Debug: Check capabilities
    has_get_transcript = hasattr(YouTubeTranscriptApi, 'get_transcript')
    print(f"[Proxy] Library capability check: get_transcript={has_get_transcript}")

    fetched_data = None

    # --- STRATEGY A: Standard Static Method (0.6.x) ---
    if has_get_transcript:
        try:
            print("[Proxy] Trying standard get_transcript...")
            fetched_data = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
            return fetched_data # Expecting list of dicts
        except NoTranscriptFound:
            print("[Proxy] get_transcript failed. Trying list_transcripts fallback...")
            # Fallback to list_transcripts
            try:
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                
                # Helper to fetch from list object
                target = None
                try:
                    target = transcript_list.find_manually_created_transcript(languages)
                except:
                    pass
                
                if not target:
                    try:
                        target = transcript_list.find_generated_transcript(languages)
                    except:
                        pass
                
                if not target:
                    for t in transcript_list:
                        target = t
                        break
                
                if target:
                    print(f"[Proxy] Found fallback: {target.language_code}")
                    return target.fetch() # Returns list of dicts in 0.6.x
                
            except Exception as e:
                print(f"[Proxy] list_transcripts failed: {e}")
            
            # If we reach here, A failed.
            print("[Proxy] Strategy A failed to find transcript.")

    # --- STRATEGY B: Instance Method (1.2.x aka 'Weird' version) ---
    else:
        print("[Proxy] Standard method missing. Trying instance method (v1.2.x style)...")
        try:
            api = YouTubeTranscriptApi() # Instantiate
            transcript_list_obj = api.list(video_id)
            
            target = None
            # Note: 1.2.x finder methods might match 0.6.x names or might not.
            # Based on logs, it has .find_generated_transcript
            
            try:
                 target = transcript_list_obj.find_manually_created_transcript(languages)
            except:
                pass
                
            if not target:
                try:
                    target = transcript_list_obj.find_generated_transcript(languages)
                except:
                    pass
                    
            if not target:
                # Fallback iteration
                # Based on previous log debug, this object might be iterable
                for t in transcript_list_obj:
                    target = t
                    break
                    
            if target:
                print(f"[Proxy] Found instance fallback: {target.language_code}")
                data_objs = target.fetch()
                # CRITICAL: In 1.2.x this returns OBJECTS, not dicts.
                # We must convert to dicts or extract using .text attribute.
                
                # Check if subscriptable (dict) or object
                if data_objs and hasattr(data_objs[0], 'text'):
                    print("[Proxy] Converting objects to dicts...")
                    return [{'text': item.text, 'start': item.start, 'duration': item.duration} for item in data_objs]
                else:
                    return data_objs # Assume it's list of dicts
            
        except Exception as e:
            print(f"[Proxy] Strategy B failed: {e}")

    return None # Explicit failure signal

@app.route('/transcript', methods=['GET'])
def get_transcript():
    url = request.args.get('url')
    print(f"[Proxy] Received request for URL: {url}")
    
    if not url:
        return jsonify({'error': 'Missing or invalid "url" query parameter'}), 400

    try:
        video_id = extract_video_id(url)
        print(f"[Proxy] Extracted Video ID: {video_id}")
        
        # 1. Try Standard Transcript API
        transcript_data = fetch_transcript_universal(video_id, ['ja', 'en'])
    
        if transcript_data:
            # Join text
            # Robust join: check if item is dict or object (double safety)
            full_text = ""
            parts = []
            for item in transcript_data:
                if isinstance(item, dict):
                    parts.append(item.get('text', ''))
                elif hasattr(item, 'text'):
                    parts.append(item.text)
                else:
                     parts.append(str(item))
                     
            full_text = " ".join(parts)
            
            print(f"[Proxy] Returning transcript of length: {len(full_text)}")
            return jsonify({'transcript': full_text, 'method': 'standard'})
        
    except Exception as e:
        print(f"[Proxy] Standard transcript fetch error: {e}")
        # Continue to fallback check

    # CHECK FALLBACK FLAG
    allow_fallback = request.args.get('fallback', 'true').lower() == 'true'
    if not allow_fallback:
        print("[Proxy] Standard transcript failed and fallback=false. Returning 404.")
        return jsonify({'error': 'No standard transcript found', 'code': 'NO_TRANSCRIPT'}), 404
    
    # 2. FALLBACK: Audio Download + Gemini Transcription
    print("[Proxy] No standard transcript found. Initiating Audio Download Fallback...")
    
    api_key = request.headers.get('X-Gemini-API-Key')
    if not api_key:
         print("[Proxy] Fallback aborted: No X-Gemini-API-Key provided.")
         return jsonify({'error': 'No transcript found and missing API Key for audio fallback'}), 404

    audio_path = None
    try:
        audio_path = download_audio_no_ffmpeg(video_id)
        if not audio_path:
             return jsonify({'error': 'Failed to download audio for fallback'}), 500
             
        transcript_text = transcribe_with_gemini(audio_path, api_key)
        
        if transcript_text:
             print(f"[Proxy] Fallback successful. Transcript length: {len(transcript_text)}")
             return jsonify({'transcript': transcript_text, 'method': 'audio_fallback'})
        else:
             return jsonify({'error': 'Gemini transcription failed'}), 500

    except Exception as e:
        print(f"[Proxy] Fallback error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Fallback processing failed', 'details': str(e)}), 500
        
    finally:
        # Clean up local audio file
        if audio_path and os.path.exists(audio_path):
            try:
                os.remove(audio_path)
                print(f"[Proxy] Cleaned up temporary file: {audio_path}")
            except Exception as e:
                print(f"[Proxy] Failed to clean up file: {e}")

if __name__ == '__main__':
    print("Transcript proxy server (Python) running at http://localhost:3001")
    app.run(port=3001, debug=True)

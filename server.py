
from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import traceback

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
            else:
                raise Exception("No transcripts found.")

    # --- STRATEGY B: Instance Method (1.2.x aka 'Weird' version) ---
    else:
        print("[Proxy] Standard method missing. Trying instance method (v1.2.x style)...")
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
        else:
             raise Exception("No transcripts found (instance mode).")


@app.route('/transcript', methods=['GET'])
def get_transcript():
    url = request.args.get('url')
    print(f"[Proxy] Received request for URL: {url}")
    
    if not url:
        return jsonify({'error': 'Missing or invalid "url" query parameter'}), 400

    try:
        video_id = extract_video_id(url)
        print(f"[Proxy] Extracted Video ID: {video_id}")
        
        transcript_data = fetch_transcript_universal(video_id, ['ja', 'en'])
        
        if not transcript_data:
             raise Exception("Empty transcript data")

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
        return jsonify({'transcript': full_text})

    except Exception as e:
        print(f"[Proxy] Error: {e}")
        # print stack trace
        traceback.print_exc()
        return jsonify({'error': 'Failed to fetch transcript', 'details': str(e)}), 500

if __name__ == '__main__':
    print("Transcript proxy server (Python) running at http://localhost:3001")
    app.run(port=3001, debug=True)

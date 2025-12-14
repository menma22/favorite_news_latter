
from youtube_transcript_api import YouTubeTranscriptApi
import json

video_id = 'lNRsjnk7b20'

print("Testing YouTubeTranscriptApi.list...")
try:
    if hasattr(YouTubeTranscriptApi, 'list'):
        res = YouTubeTranscriptApi.list(video_id)
        print("Result of list:", res)
    else:
        print("No .list method")
except Exception as e:
    print("Error calling .list:", e)

print("\nTesting YouTubeTranscriptApi.fetch...")
try:
    if hasattr(YouTubeTranscriptApi, 'fetch'):
        res = YouTubeTranscriptApi.fetch(video_id)
        # It handles list of dicts normally
        print(f"Result of fetch: {len(res)} items")
        print(res[0])
    else:
        print("No .fetch method")
except Exception as e:
    print("Error calling .fetch:", e)

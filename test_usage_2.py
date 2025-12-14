
from youtube_transcript_api import YouTubeTranscriptApi
import inspect

print("Inspect .list signature:")
try:
    print(inspect.signature(YouTubeTranscriptApi.list_transcripts))
except:
    print("Could not get signature for list_transcripts")

try:
    print(inspect.signature(YouTubeTranscriptApi.list))
except:
    print("Could not get signature for list")

print("\nTesting instance call:")
try:
    api = YouTubeTranscriptApi()
    res = api.list('lNRsjnk7b20')
    print("Instance .list result:", res)
except Exception as e:
    print("Instance .list failed:", e)

print("\nTesting static call with extra arg?")

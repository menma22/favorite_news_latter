
import youtube_transcript_api
from youtube_transcript_api import YouTubeTranscriptApi
import sys
import os

with open("debug_output.txt", "w") as f:
    f.write(f"Python Executable: {sys.executable}\n")
    f.write(f"Module File: {youtube_transcript_api.__file__}\n")
    try:
        import pkg_resources
        version = pkg_resources.get_distribution("youtube-transcript-api").version
        f.write(f"Version: {version}\n")
    except Exception as e:
        f.write(f"Version check failed: {e}\n")

    f.write(f"Attributes: {dir(YouTubeTranscriptApi)}\n")
    f.write(f"Has list_transcripts: {hasattr(YouTubeTranscriptApi, 'list_transcripts')}\n")
    f.write(f"Has get_transcript: {hasattr(YouTubeTranscriptApi, 'get_transcript')}\n")

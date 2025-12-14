
import express from 'express';
import cors from 'cors';
import { YoutubeTranscript } from 'youtube-transcript';

const app = express();
const port = 3001;

app.use(cors());

app.get('/transcript', async (req, res) => {
    const url = req.query.url;
    console.log(`[Proxy] Received request for URL: ${url}`);
    if (!url || typeof url !== 'string') {
        console.error('[Proxy] Invalid URL parameter');
        return res.status(400).json({ error: 'Missing or invalid "url" query parameter' });
    }

    try {
        const videoId = extractVideoId(url);
        console.log(`[Proxy] Extracted Video ID: ${videoId}`);

        // Strategy:
        // 1. Try generic fetch (no lang). If it works and is non-empty, good.
        // 2. If it fails or is empty, try 'ja' specifically.
        // 3. If that fails, parse "Available languages" from error and try them.

        let transcriptItems = [];

        try {
            console.log(`[Proxy] Attempting default fetch for ${videoId}...`);
            const defaultItems = await YoutubeTranscript.fetchTranscript(videoId);
            if (defaultItems && defaultItems.length > 0) {
                transcriptItems = defaultItems;
                console.log(`[Proxy] Success: Default fetch returned ${transcriptItems.length} items`);
            } else {
                console.warn(`[Proxy] Default fetch returned empty/null`);
            }
        } catch (e) {
            console.warn(`[Proxy] Default fetch failed: ${e.message}`);

            // Try to parse available languages from error message
            // Error format often: "No transcripts are available in ... Available languages: en, fr"
            const availableLangsMatch = e.message.match(/Available languages: ([^)]+)/);
            if (availableLangsMatch) {
                const availableLangs = availableLangsMatch[1].split(',').map(s => s.trim());
                console.log(`[Proxy] Detected available languages: ${availableLangs.join(', ')}`);

                // Prioritize 'ja', then 'en', then others
                const sortedLangs = availableLangs.sort((a, b) => {
                    if (a === 'ja') return -1;
                    if (b === 'ja') return 1;
                    if (a === 'en') return -1;
                    if (b === 'en') return 1;
                    return 0;
                });

                for (const lang of sortedLangs) {
                    try {
                        console.log(`[Proxy] Trying detected available lang: ${lang}...`);
                        const items = await YoutubeTranscript.fetchTranscript(videoId, { lang });
                        if (items && items.length > 0) {
                            transcriptItems = items;
                            console.log(`[Proxy] Success with ${lang}: ${items.length} items`);
                            break;
                        } else {
                            console.warn(`[Proxy] Empty result for ${lang}`);
                        }
                    } catch (innerE) {
                        console.warn(`[Proxy] Failed for ${lang}: ${innerE.message}`);
                    }
                }
            } else {
                // If parsing failed, try manual fallback
                console.log('[Proxy] Could not parse available languages. Trying manual fallbacks (ja, en)...');
                const fallbackLangs = ['ja', 'en'];
                for (const lang of fallbackLangs) {
                    try {
                        const items = await YoutubeTranscript.fetchTranscript(videoId, { lang });
                        if (items && items.length > 0) {
                            transcriptItems = items;
                            break;
                        }
                    } catch (fallbackE) { }
                }
            }
        }

        if (!transcriptItems || transcriptItems.length === 0) {
            throw new Error('Could not retrieve transcript (empty or unavailable).');
        }

        const text = transcriptItems.map(item => item.text).join(' ');
        if (!text || text.trim().length === 0) {
            throw new Error('Transcript text is empty after join.');
        }

        console.log(`[Proxy] Returning transcript of length: ${text.length}`);
        res.json({ transcript: text });
    } catch (error) {
        console.error('[Proxy] Transcript fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch transcript', details: error.toString() });
    }
});

function extractVideoId(url) {
    // Regex to handle various YouTube URL formats (standard, short, embed)
    const pattern = /(?:v=|\/)([0-9A-Za-z_-]{11}).*/;
    const match = url.match(pattern);
    if (match) {
        return match[1];
    }
    // If input is just ID
    if (url.length === 11) {
        return url;
    }
    throw new Error('Invalid YouTube URL');
}

app.listen(port, () => {
    console.log(`Transcript proxy server running at http://localhost:${port}`);
});

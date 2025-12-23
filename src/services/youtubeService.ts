import { getCredential } from '../lib/credentials';
import { Channel } from '../types';



export const fetchChannelInfo = async (url: string): Promise<Partial<Channel> | null> => {
    const apiKey = getCredential('YOUTUBE_API_KEY');
    if (!apiKey) {
        console.warn('YouTube API Key is missing');
        return null;
    }

    let handle = '';

    // Extract handle from URL (supports @handle, channel/ID, user/User)
    try {
        const urlObj = new URL(url);
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);

        if (pathSegments[0] === 'channel') {
            // Direct ID search not heavily supported by this simple logic yet for "forUsername", 
            // but we'll try to use the ID directly if possible or search.
            // Actually, API 'id' parameter is best for 'channel/ID'.
            const channelId = pathSegments[1];
            return await fetchChannelById(channelId, apiKey);
        } else if (pathSegments[0].startsWith('@')) {
            handle = pathSegments[0]; // Keep the @ for api search if needed, strictly handle is without @ for 'forHandle' usually
        } else {
            // Fallback: use the last segment as a potential user or handle
            handle = pathSegments[pathSegments.length - 1];
        }
    } catch (e) {
        console.error('Invalid URL', e);
        return null;
    }

    // New API endpoint for handles is 'channels?forHandle'
    // But 'forHandle' parameter is somewhat tricky; searching via 'search' endpoint types=channel is often more robust for fuzzy,
    // but expensive. 'channels?part=snippet&forHandle=...' is the standard way now.

    // Clean handle
    const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(cleanHandle)}&key=${apiKey}`
        );

        if (!response.ok) throw new Error(`YouTube API Error: ${response.status}`);

        const data: any = await response.json();

        if (!data.items || data.items.length === 0) {
            // Fallback: If it was a channel ID that looked like a handle? 
            // Or maybe try search (costly)? Let's stick to efficient handle lookup first.
            console.warn('No channel found for handle:', cleanHandle);
            return null;
        }

        const snippet = data.items[0].snippet;
        const statistics = data.items[0].statistics;

        return {
            name: snippet.title,
            description: snippet.description.substring(0, 300) + (snippet.description.length > 300 ? '...' : ''),
            avatarUrl: snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url,
            subscriberCount: statistics?.subscriberCount,
            customUrl: snippet.customUrl,
            youtubeId: data.items[0].id
        };

    } catch (error) {
        console.error('Failed to fetch channel info:', error);
        return null;
    }
};

const fetchChannelById = async (id: string, apiKey: string): Promise<Partial<Channel> | null> => {
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${id}&key=${apiKey}`
        );

        if (!response.ok) throw new Error(`YouTube API Error: ${response.status}`);

        const data: any = await response.json();

        if (!data.items || data.items.length === 0) return null;

        const snippet = data.items[0].snippet;
        const statistics = data.items[0].statistics;

        return {
            name: snippet.title,
            description: snippet.description.substring(0, 300) + (snippet.description.length > 300 ? '...' : ''),
            avatarUrl: snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url,
            subscriberCount: statistics?.subscriberCount,
            customUrl: snippet.customUrl,
            youtubeId: data.items[0].id
        };
    } catch (error) {
        console.error('Failed to fetch channel by ID:', error);
        return null;
    }
}

const extractVideoId = (url: string): string | null => {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes('youtu.be')) {
            return urlObj.pathname.slice(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
            return urlObj.searchParams.get('v');
        }
    } catch {
        return null;
    }
    return null;
};

export const fetchVideoInfo = async (url: string): Promise<{ title: string; thumbnailUrl: string; channelTitle: string } | null> => {
    const videoId = extractVideoId(url);
    if (!videoId) return null;

    try {
        // 1. Try NoEmbed first for metadata (Title, Author)
        try {
            const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
            const data = await response.json();

            if (data && !data.error) {
                // Use high-res thumbnail by default
                const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

                return {
                    title: data.title,
                    thumbnailUrl: thumbnailUrl,
                    channelTitle: data.author_name
                };
            }
        } catch (e) {
            console.warn('NoEmbed failed, falling back to basic info', e);
        }

        // 2. Fallback: Return basic info with constructed thumbnail
        // Use hqdefault as it's more likely to exist if maxres doesn't
        return {
            title: `Video ${videoId}`,
            thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            channelTitle: 'Unknown Channel'
        };

    } catch (error) {
        console.error('Error fetching video info:', error);
        return null;
    }
};

export const fetchTranscript = async (url: string, allowFallback: boolean = true): Promise<{ transcript: string; method: string } | null> => {
    try {
        const apiKey = getCredential('GEMINI_API_KEY') || '';

        // Use environment variable for API URL (Render in production, localhost in dev)
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

        // Use local proxy server, pass fallback param
        const response = await fetch(`${apiBaseUrl}/transcript?url=${encodeURIComponent(url)}&fallback=${allowFallback}`, {
            headers: {
                'X-Gemini-API-Key': apiKey
            }
        });

        if (!response.ok) {
            // If fallback=false and 404, return null gracefully (or throw specific error)
            if (response.status === 404 && !allowFallback) {
                return null;
            }
            throw new Error(`Proxy error: ${response.status}`);
        }
        const data = await response.json();
        return { transcript: data.transcript, method: data.method || 'standard' };
    } catch (error) {
        console.error('Failed to fetch transcript via proxy:', error);
        return null;
    }
};

export const fetchTodaysVideosForChannel = async (channelId: string): Promise<Array<{ id: string; title: string; thumbnailUrl: string; date: string; durationSeconds: number }> | null> => {
    const apiKey = getCredential('YOUTUBE_API_KEY');
    if (!apiKey) return null;

    console.log(`[Auto-Update] Fetching for channel ${channelId}`);

    try {
        // 1. Get Uploads Playlist ID
        const channelResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
        );
        const channelData = await channelResponse.json();
        if (!channelData.items || channelData.items.length === 0) {
            console.warn(`[Auto-Update] No updated channel info found for ${channelId}`);
            return null;
        }

        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
        console.log(`[Auto-Update] Uploads Playlist ID: ${uploadsPlaylistId}`);

        // 2. Get recent videos from playlist (Fetch top 10 to cover the day)
        const playlistResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=10&key=${apiKey}`
        );
        const playlistData = await playlistResponse.json();

        if (!playlistData.items || playlistData.items.length === 0) {
            console.warn(`[Auto-Update] No items in playlist ${uploadsPlaylistId}`);
            return null;
        }

        console.log(`[Auto-Update] Fetched ${playlistData.items.length} recent videos. Fetching durations...`);

        // 3. Get video IDs and fetch their durations
        const videoIds = playlistData.items.map((item: any) => item.contentDetails.videoId).join(',');
        const videosResponse = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`
        );
        const videosData = await videosResponse.json();

        // Create a map of videoId -> duration in seconds
        const durationMap: { [key: string]: number } = {};
        if (videosData.items) {
            videosData.items.forEach((item: any) => {
                // Parse ISO 8601 duration (e.g., PT1H2M3S, PT5M30S, PT45S)
                const duration = item.contentDetails.duration;
                const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (match) {
                    const hours = parseInt(match[1] || '0');
                    const minutes = parseInt(match[2] || '0');
                    const seconds = parseInt(match[3] || '0');
                    durationMap[item.id] = hours * 3600 + minutes * 60 + seconds;
                }
            });
        }

        // 4. Return mapped items with duration
        const result = playlistData.items.map((item: any) => {
            const videoId = item.contentDetails.videoId;
            const durationSeconds = durationMap[videoId] || 0;
            console.log(` - ${item.snippet.title} (${item.snippet.publishedAt}) [${Math.floor(durationSeconds / 60)}:${(durationSeconds % 60).toString().padStart(2, '0')}]`);
            return {
                id: videoId,
                title: item.snippet.title,
                thumbnailUrl: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
                date: item.snippet.publishedAt,
                durationSeconds: durationSeconds
            };
        });

        return result;

    } catch (error) {
        console.error('Failed to fetch recent videos:', error);
        return null;
    }
};

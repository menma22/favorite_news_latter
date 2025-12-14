import { getCredential } from '../lib/credentials';
import { Channel } from '../types';

interface YouTubeChannelResponse {
    items: {
        id: string;
        snippet: {
            title: string;
            description: string;
            thumbnails: {
                default: { url: string };
                medium: { url: string };
                high: { url: string };
            };
            customUrl?: string;
        };
    }[];
}

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
            `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${encodeURIComponent(cleanHandle)}&key=${apiKey}`
        );

        if (!response.ok) throw new Error(`YouTube API Error: ${response.status}`);

        const data: YouTubeChannelResponse = await response.json();

        if (!data.items || data.items.length === 0) {
            // Fallback: If it was a channel ID that looked like a handle? 
            // Or maybe try search (costly)? Let's stick to efficient handle lookup first.
            console.warn('No channel found for handle:', cleanHandle);
            return null;
        }

        const snippet = data.items[0].snippet;

        return {
            name: snippet.title,
            description: snippet.description.substring(0, 300) + (snippet.description.length > 300 ? '...' : ''),
            avatarUrl: snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url
        };

    } catch (error) {
        console.error('Failed to fetch channel info:', error);
        return null;
    }
};

const fetchChannelById = async (id: string, apiKey: string): Promise<Partial<Channel> | null> => {
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${id}&key=${apiKey}`
        );

        if (!response.ok) throw new Error(`YouTube API Error: ${response.status}`);

        const data: YouTubeChannelResponse = await response.json();

        if (!data.items || data.items.length === 0) return null;

        const snippet = data.items[0].snippet;

        return {
            name: snippet.title,
            description: snippet.description.substring(0, 300) + (snippet.description.length > 300 ? '...' : ''),
            avatarUrl: snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url
        };
    } catch (error) {
        console.error('Failed to fetch channel by ID:', error);
        return null;
    }
}

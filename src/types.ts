// 型定義ファイル

export type Language = 'ja' | 'en';

export interface Channel {
    id: string;
    user_id: string;
    name: string;
    avatar_url: string;
    description: string;
    created_at: string;
}

export interface Letter {
    id: string;
    user_id: string;
    channel_id: string;
    channel_name?: string;
    channel_avatar?: string;
    title: string;
    video_url: string;
    thumbnail_url: string;
    summary: string;
    deep_dive_content: string | null;
    is_deep_dive_available: boolean;
    is_read: boolean;
    created_at: string;
}

export interface User {
    id: string;
    email: string;
}

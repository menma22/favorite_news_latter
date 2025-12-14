// 型定義ファイル

export type Language = 'ja' | 'en';
export type ViewMode = 'register' | 'inbox' | 'channel' | 'generator' | 'settings';

export interface Channel {
    id: string;
    name: string;
    avatarUrl?: string;
    description?: string;
}

export interface Letter {
    id: string;
    channelId: string;
    title: string;
    videoUrl: string;
    thumbnailUrl?: string;
    summary: string;
    date: string;
    isDeepDiveAvailable: boolean;
    isRead: boolean;
    deepDiveContent?: string;
}

export interface User {
    id: string;
    email: string;
}

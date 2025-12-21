// 型定義ファイル

export type Language = 'ja' | 'en';
export type ViewMode = 'inbox' | 'today' | 'channel' | 'register' | 'settings' | 'generator';

export interface Channel {
    id: string;
    name: string;
    avatarUrl?: string;
    description?: string;
    descriptionJa?: string; // Translated Japanese description (cached)
    subscriberCount?: string;
    customUrl?: string;
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

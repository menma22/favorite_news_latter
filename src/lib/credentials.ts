// 認証情報管理ファイル
// このファイルでは.envファイルから環境変数を読み込みます

// Viteでは import.meta.env を使用して環境変数にアクセスします
// .envファイルで VITE_ プレフィックスが付いた変数のみがフロントエンドで利用可能です

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
export const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';

// 設定が有効かどうかをチェック
export const isSupabaseConfigured = (): boolean => {
    return SUPABASE_URL !== '' &&
        SUPABASE_ANON_KEY !== '' &&
        SUPABASE_URL !== 'your_supabase_project_url_here' &&
        SUPABASE_ANON_KEY !== 'your_supabase_anon_key_here';
};

export const isGeminiConfigured = (): boolean => {
    return GEMINI_API_KEY !== '' &&
        GEMINI_API_KEY !== 'your_gemini_api_key_here';
};

// ローカルストレージキー
const STORAGE_KEY_GEMINI = 'briefly_gemini_api_key';

export const getStoredCredential = (key: string): string | null => {
    if (key === 'GEMINI_API_KEY') {
        const val = localStorage.getItem(STORAGE_KEY_GEMINI);
        return val && val.trim() !== '' ? val : null;
    }
    return null;
};

export const setStoredCredential = (key: string, value: string) => {
    if (key === 'GEMINI_API_KEY') {
        localStorage.setItem(STORAGE_KEY_GEMINI, value);
    }
};

// Get credential by key name
export const getCredential = (key: string): string | null => {
    // 1. Check LocalStorage first for user-provided keys for Gemini
    if (key === 'GEMINI_API_KEY') {
        const stored = getStoredCredential(key);
        if (stored) return stored;
    }

    // 2. Fallback to Environment Variables
    switch (key) {
        case 'GEMINI_API_KEY':
            return isGeminiConfigured() ? GEMINI_API_KEY : null;
        case 'YOUTUBE_API_KEY':
            return YOUTUBE_API_KEY !== '' && YOUTUBE_API_KEY !== 'your_youtube_api_key_here' ? YOUTUBE_API_KEY : null;
        case 'SUPABASE_URL':
            return isSupabaseConfigured() ? SUPABASE_URL : null;
        case 'SUPABASE_ANON_KEY':
            return isSupabaseConfigured() ? SUPABASE_ANON_KEY : null;
        default:
            return null;
    }
};

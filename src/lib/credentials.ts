// 認証情報管理ファイル
// このファイルでは.envファイルから環境変数を読み込みます

// Viteでは import.meta.env を使用して環境変数にアクセスします
// .envファイルで VITE_ プレフィックスが付いた変数のみがフロントエンドで利用可能です

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

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

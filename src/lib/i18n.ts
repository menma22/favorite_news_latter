// 国際化（i18n）モジュール
import type { Language } from '../types';

type TranslationKey =
    | 'appName'
    | 'tagline'
    | 'login'
    | 'signUp'
    | 'logout'
    | 'email'
    | 'password'
    | 'noAccount'
    | 'hasAccount'
    | 'registerChannel'
    | 'letterBox'
    | 'channels'
    | 'todayLetters'
    | 'pastLetters'
    | 'noLettersToday'
    | 'noLettersPast'
    | 'generateDeepDive'
    | 'generating'
    | 'readMore'
    | 'channelUrl'
    | 'register'
    | 'cancel'
    | 'delete'
    | 'viewLetters'
    | 'noChannels'
    | 'welcomeTitle'
    | 'welcomeSummary'
    | 'selectLanguage'
    | 'japanese'
    | 'english'
    | 'configError'
    | 'configErrorDesc'
    | 'loginError'
    | 'signUpSuccess'
    | 'allLetters'
    | 'loading';

const translations: Record<Language, Record<TranslationKey, string>> = {
    ja: {
        appName: 'Briefly.',
        tagline: 'あなたの毎日のYouTubeダイジェスト',
        login: 'ログイン',
        signUp: '新規登録',
        logout: 'ログアウト',
        email: 'メールアドレス',
        password: 'パスワード',
        noAccount: 'アカウントをお持ちでない方',
        hasAccount: 'すでにアカウントをお持ちの方',
        registerChannel: 'チャンネル登録',
        letterBox: 'レターボックス',
        channels: 'チャンネル一覧',
        todayLetters: '今日のレター',
        pastLetters: '過去のレター',
        noLettersToday: '今日のレターはまだありません',
        noLettersPast: '過去のレターはありません',
        generateDeepDive: '詳細レポートを生成',
        generating: '生成中...',
        readMore: '続きを読む',
        channelUrl: 'YouTubeチャンネルURL',
        register: '登録',
        cancel: 'キャンセル',
        delete: '削除',
        viewLetters: 'レター一覧',
        noChannels: '登録されているチャンネルはありません',
        welcomeTitle: 'ようこそ！チャンネルを登録しましょう',
        welcomeSummary: 'このアプリでは、お気に入りのYouTubeチャンネルの最新動画を毎日ダイジェスト形式でお届けします。',
        selectLanguage: '言語を選択してください',
        japanese: '日本語',
        english: 'English',
        configError: '設定エラー',
        configErrorDesc: 'Supabaseの設定が完了していません。.envファイルを確認してください。',
        loginError: 'ログインに失敗しました',
        signUpSuccess: '確認メールを送信しました。メールを確認してください。',
        allLetters: 'すべてのレター',
        loading: '読み込み中...',
    },
    en: {
        appName: 'Briefly.',
        tagline: 'Your Daily YouTube Digest',
        login: 'Login',
        signUp: 'Sign Up',
        logout: 'Logout',
        email: 'Email',
        password: 'Password',
        noAccount: "Don't have an account?",
        hasAccount: 'Already have an account?',
        registerChannel: 'Register Channel',
        letterBox: 'Letter Box',
        channels: 'Channels',
        todayLetters: "Today's Letters",
        pastLetters: 'Past Letters',
        noLettersToday: 'No letters today yet',
        noLettersPast: 'No past letters',
        generateDeepDive: 'Generate Deep Dive',
        generating: 'Generating...',
        readMore: 'Read More',
        channelUrl: 'YouTube Channel URL',
        register: 'Register',
        cancel: 'Cancel',
        delete: 'Delete',
        viewLetters: 'View Letters',
        noChannels: 'No channels registered',
        welcomeTitle: 'Welcome! Register a channel',
        welcomeSummary: 'This app delivers daily digests of your favorite YouTube channels.',
        selectLanguage: 'Select your language',
        japanese: '日本語',
        english: 'English',
        configError: 'Configuration Error',
        configErrorDesc: 'Supabase is not configured. Please check your .env file.',
        loginError: 'Login failed',
        signUpSuccess: 'Confirmation email sent. Please check your inbox.',
        allLetters: 'All Letters',
        loading: 'Loading...',
    },
};

export const t = (key: TranslationKey, lang: Language): string => {
    return translations[lang][key] || key;
};

export const getStoredLanguage = (): Language | null => {
    const stored = localStorage.getItem('briefly_language');
    if (stored === 'ja' || stored === 'en') {
        return stored;
    }
    return null;
};

export const setStoredLanguage = (lang: Language): void => {
    localStorage.setItem('briefly_language', lang);
};

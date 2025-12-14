// 国際化（i18n）モジュール

export type Language = 'ja' | 'en';

interface TranslationStrings {
    menu: string;
    today: string;
    registerChannel: string;
    letterBox: string;
    subscriptions: string;
    signOut: string;
    curateFeed: string;
    curateSubtitle: string;
    channelUrl: string;
    subscribe: string;
    supports: string;
    signInTitle: string;
    signInSubtitle: string;
    emailLabel: string;
    passwordLabel: string;
    loading: string;
    signInButton: string;
    signUpButton: string;
    dailyDigest: string;
    channelArchive: string;
    todaysEdition: string;
    previousEditions: string;
    noLetters: string;
    generateDeepDive: string;
    readReport: string;
    closeReport: string;
    apiKeyWarning: string;
    supabaseWarning: string;
    authError: string;
    checkEmail: string;
    goBack: string;
    accountSetup: string;
    showPassword: string;
    hidePassword: string;
    welcomeDescription: string;
    languageSelect: string;
    fetchingChannel: string;
    channelFound: string;
    channelNotFound: string;
    settings: string;
    geminiApiKey: string;
    saveSettings: string;
    generator: string;
    enterVideoUrl: string;
    generate: string;
    settingsSaved: string;
    apiKeyPlaceholder: string;
    apiKeyHelp: string;
}

export const translations: Record<Language, TranslationStrings> = {
    ja: {
        menu: 'メニュー',
        today: '今日のレター',
        registerChannel: 'チャンネル登録',
        letterBox: 'レターボックス',
        subscriptions: '登録チャンネル',
        signOut: 'ログアウト',
        curateFeed: 'フィードを編集',
        curateSubtitle: 'お気に入りのYouTubeチャンネルを登録して、AIによる要約を受け取りましょう。',
        channelUrl: 'チャンネルURL',
        subscribe: '登録する',
        supports: 'チャンネルURLと動画リンクに対応',
        signInTitle: 'Briefly.へようこそ',
        signInSubtitle: 'サインインして始めましょう',
        emailLabel: 'メールアドレス',
        passwordLabel: 'パスワード',
        loading: '読み込み中...',
        signInButton: 'サインイン',
        signUpButton: 'アカウント作成',
        dailyDigest: '今日の要約',
        channelArchive: 'チャンネルアーカイブ',
        todaysEdition: '本日のレター',
        previousEditions: '過去のレター',
        noLetters: 'まだレターがありません',
        generateDeepDive: '詳細レポートを生成',
        readReport: 'レポートを読む',
        closeReport: 'レポートを閉じる',
        apiKeyWarning: '注意: Gemini APIキーが設定されていません。lib/credentials.tsを確認してください。',
        supabaseWarning: '注意: Supabaseと連携されていません。lib/credentials.tsを確認してください。',
        authError: '認証エラーが発生しました',
        checkEmail: '確認メールを送信しました。メールをご確認ください。',
        goBack: '戻る',
        accountSetup: 'アカウント設定',
        showPassword: '表示',
        hidePassword: '非表示',
        welcomeDescription: 'Brieflyは、忙しいあなたのためのAIニュースリーダーです。お気に入りのYouTubeチャンネルから、重要な情報を短時間で効率的に収集しましょう。',
        languageSelect: '言語 / Language',
        fetchingChannel: 'チャンネル情報を取得中...',
        channelFound: 'チャンネルが見つかりました！',
        channelNotFound: 'チャンネルが見つかりませんでした。',
        settings: '設定',
        geminiApiKey: 'Gemini APIキー',
        saveSettings: '設定を保存',
        generator: 'レター生成',
        enterVideoUrl: '動画のURLを入力',
        generate: '生成する',
        settingsSaved: '設定を保存しました。',
        apiKeyPlaceholder: 'AIza...',
        apiKeyHelp: 'Google AI Studioで取得したキーを入力してください。',
    },
    en: {
        menu: 'Menu',
        today: 'Today\'s Letters',
        registerChannel: 'Register Channel',
        letterBox: 'Letter Box',
        subscriptions: 'Subscriptions',
        signOut: 'Sign Out',
        curateFeed: 'Curate Your Feed',
        curateSubtitle: 'Register your favorite YouTube channels and receive AI-powered summaries.',
        channelUrl: 'Channel URL',
        subscribe: 'Subscribe',
        supports: 'Supports channel URLs and video links',
        signInTitle: 'Welcome to Briefly.',
        signInSubtitle: 'Sign in to get started',
        emailLabel: 'Email',
        passwordLabel: 'Password',
        loading: 'Loading...',
        signInButton: 'Sign In',
        signUpButton: 'Create Account',
        dailyDigest: 'Daily Digest',
        channelArchive: 'Channel Archive',
        todaysEdition: "Today's Edition",
        previousEditions: 'Previous Editions',
        noLetters: 'No letters yet',
        generateDeepDive: 'Generate Deep Dive',
        readReport: 'Read Report',
        closeReport: 'Close Report',
        apiKeyWarning: 'Warning: Gemini API key not set. Please check lib/credentials.ts.',
        supabaseWarning: 'Warning: Not connected to Supabase. Please check lib/credentials.ts.',
        authError: 'An authentication error occurred',
        checkEmail: 'Confirmation email sent. Please check your inbox.',
        goBack: 'Back',
        accountSetup: 'Account Setup',
        showPassword: 'Show',
        hidePassword: 'Hide',
        welcomeDescription: 'Briefly is your AI news reader for the busy mind. Efficiently gather key insights from your favorite YouTube channels in less time.',
        languageSelect: 'Language / 言語',
        fetchingChannel: 'Fetching channel info...',
        channelFound: 'Channel found!',
        channelNotFound: 'Channel not found.',
        settings: 'Settings',
        geminiApiKey: 'Gemini API Key',
        saveSettings: 'Save Settings',
        generator: 'Generator',
        enterVideoUrl: 'Enter Video URL',
        generate: 'Generate',
        settingsSaved: 'Settings saved.',
        apiKeyPlaceholder: 'AIza...',
        apiKeyHelp: 'Enter your key from Google AI Studio.',
    },
};

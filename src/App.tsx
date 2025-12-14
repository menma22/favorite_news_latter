// メインアプリケーション
import React, { useState, useEffect } from 'react';
import type { Language, Channel, Letter, User } from './types';
import { t, getStoredLanguage, setStoredLanguage } from './lib/i18n';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import LetterCard from './components/LetterCard';

type Tab = 'register' | 'letterbox' | 'channels';
type AuthMode = 'login' | 'signup';

// デモデータ
const createDemoData = (lang: Language): { channels: Channel[]; letters: Letter[] } => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const channels: Channel[] = [
        {
            id: 'demo-1',
            user_id: 'demo',
            name: lang === 'ja' ? 'テック解説チャンネル' : 'Tech Explained',
            avatar_url: 'https://picsum.photos/seed/tech1/100/100',
            description: lang === 'ja' ? 'テクノロジーの最新情報をわかりやすく解説' : 'Making technology easy to understand',
            created_at: yesterday.toISOString(),
        },
        {
            id: 'demo-2',
            user_id: 'demo',
            name: lang === 'ja' ? 'サイエンス探求' : 'Science Quest',
            avatar_url: 'https://picsum.photos/seed/science1/100/100',
            description: lang === 'ja' ? '科学の不思議を一緒に探求' : 'Exploring the wonders of science',
            created_at: yesterday.toISOString(),
        },
    ];

    const letters: Letter[] = [
        {
            id: 'letter-1',
            user_id: 'demo',
            channel_id: 'demo-1',
            channel_name: channels[0].name,
            channel_avatar: channels[0].avatar_url,
            title: lang === 'ja' ? 'AIの未来: 2024年の最新トレンド' : 'The Future of AI: 2024 Trends',
            video_url: 'https://youtube.com/watch?v=demo1',
            thumbnail_url: 'https://picsum.photos/seed/ai2024/640/360',
            summary: lang === 'ja'
                ? 'AIの発展は驚くべき速さで進んでいます。この動画では、2024年に注目すべきAIトレンドを徹底解説。生成AI、マルチモーダルAI、エージェントAIなど、最前線の技術を紹介します。'
                : 'AI is advancing at an incredible pace. This video covers the key AI trends to watch in 2024, from generative AI to multimodal systems and autonomous agents.',
            deep_dive_content: null,
            is_deep_dive_available: false,
            is_read: false,
            created_at: now.toISOString(),
        },
        {
            id: 'letter-2',
            user_id: 'demo',
            channel_id: 'demo-2',
            channel_name: channels[1].name,
            channel_avatar: channels[1].avatar_url,
            title: lang === 'ja' ? '量子コンピューターが変える世界' : 'How Quantum Computers Will Change the World',
            video_url: 'https://youtube.com/watch?v=demo2',
            thumbnail_url: 'https://picsum.photos/seed/quantum1/640/360',
            summary: lang === 'ja'
                ? '量子コンピューターの仕組みから実用化までを解説。従来のコンピューターでは不可能だった計算が可能になる未来について考察します。'
                : 'From the basics of quantum computing to real-world applications. Explore how quantum computers will solve problems classical computers never could.',
            deep_dive_content: null,
            is_deep_dive_available: false,
            is_read: false,
            created_at: now.toISOString(),
        },
        {
            id: 'letter-3',
            user_id: 'demo',
            channel_id: 'demo-1',
            channel_name: channels[0].name,
            channel_avatar: channels[0].avatar_url,
            title: lang === 'ja' ? 'Web3とは何か？初心者向け完全ガイド' : 'What is Web3? A Complete Beginner\'s Guide',
            video_url: 'https://youtube.com/watch?v=demo3',
            thumbnail_url: 'https://picsum.photos/seed/web3/640/360',
            summary: lang === 'ja'
                ? 'Web3の基礎から応用まで、初心者にもわかりやすく解説。ブロックチェーン、分散型アプリケーション、トークンエコノミーの概念を学びましょう。'
                : 'Web3 explained from basics to advanced concepts. Learn about blockchain, decentralized applications, and the token economy.',
            deep_dive_content: null,
            is_deep_dive_available: false,
            is_read: false,
            created_at: yesterday.toISOString(),
        },
    ];

    return { channels, letters };
};

const App: React.FC = () => {
    // 状態管理
    const [language, setLanguage] = useState<Language | null>(getStoredLanguage());
    const [user, setUser] = useState<User | null>(null);
    const [authMode, setAuthMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState<string | null>(null);
    const [authSuccess, setAuthSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [activeTab, setActiveTab] = useState<Tab>('letterbox');
    const [channels, setChannels] = useState<Channel[]>([]);
    const [letters, setLetters] = useState<Letter[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

    // チャンネル登録フォーム
    const [channelUrl, setChannelUrl] = useState('');
    const [channelName, setChannelName] = useState('');

    // 初期化
    useEffect(() => {
        if (language) {
            // Demo mode: Supabase未設定の場合はデモデータを使用
            if (!isSupabaseConfigured()) {
                const demo = createDemoData(language);
                setChannels(demo.channels);
                setLetters(demo.letters);
            }
        }
    }, [language]);

    // Supabaseの認証状態を監視
    useEffect(() => {
        if (!supabase) return;

        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUser({ id: session.user.id, email: session.user.email || '' });
                loadUserData(session.user.id);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser({ id: session.user.id, email: session.user.email || '' });
                loadUserData(session.user.id);
            } else {
                setUser(null);
                setChannels([]);
                setLetters([]);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // ユーザーデータの読み込み
    const loadUserData = async (userId: string) => {
        if (!supabase) return;

        try {
            // チャンネルを取得
            const { data: channelsData } = await supabase
                .from('channels')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (channelsData) {
                setChannels(channelsData);
            }

            // レターを取得
            const { data: lettersData } = await supabase
                .from('letters')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (lettersData) {
                // チャンネル情報を付与
                const lettersWithChannels = lettersData.map((letter: Letter) => {
                    const channel = channelsData?.find((c: Channel) => c.id === letter.channel_id);
                    return {
                        ...letter,
                        channel_name: channel?.name || '',
                        channel_avatar: channel?.avatar_url || '',
                    };
                });
                setLetters(lettersWithChannels);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    };

    // 言語選択
    const handleLanguageSelect = (lang: Language) => {
        setLanguage(lang);
        setStoredLanguage(lang);
    };

    // ログイン処理
    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        setIsLoading(true);
        setAuthError(null);
        setAuthSuccess(null);

        try {
            if (authMode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setAuthSuccess(t('signUpSuccess', language!));
            }
        } catch (error) {
            setAuthError(error instanceof Error ? error.message : t('loginError', language!));
        } finally {
            setIsLoading(false);
        }
    };

    // ログアウト
    const handleLogout = async () => {
        if (supabase) {
            await supabase.auth.signOut();
        }
        // デモモードの場合はデータをクリア
        if (!isSupabaseConfigured()) {
            setChannels([]);
            setLetters([]);
        }
        setUser(null);
    };

    // チャンネル登録
    const handleRegisterChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!channelName.trim()) return;

        const newChannel: Channel = {
            id: `channel-${Date.now()}`,
            user_id: user?.id || 'demo',
            name: channelName,
            avatar_url: `https://picsum.photos/seed/${Date.now()}/100/100`,
            description: channelUrl || '',
            created_at: new Date().toISOString(),
        };

        // Supabaseに保存
        if (supabase && user) {
            const { data, error } = await supabase
                .from('channels')
                .insert([{
                    user_id: user.id,
                    name: channelName,
                    avatar_url: newChannel.avatar_url,
                    description: channelUrl,
                }])
                .select()
                .single();

            if (!error && data) {
                newChannel.id = data.id;
            }
        }

        setChannels([newChannel, ...channels]);

        // ウェルカムレターを作成
        const welcomeLetter: Letter = {
            id: `letter-${Date.now()}`,
            user_id: user?.id || 'demo',
            channel_id: newChannel.id,
            channel_name: newChannel.name,
            channel_avatar: newChannel.avatar_url,
            title: language === 'ja'
                ? `${newChannel.name}をフォローしました`
                : `Now following ${newChannel.name}`,
            video_url: channelUrl || '#',
            thumbnail_url: `https://picsum.photos/seed/${Date.now()}/640/360`,
            summary: language === 'ja'
                ? `${newChannel.name}の新しい動画が投稿されると、ここにレターが届きます。お楽しみに！`
                : `You'll receive letters here when ${newChannel.name} posts new videos. Stay tuned!`,
            deep_dive_content: null,
            is_deep_dive_available: false,
            is_read: false,
            created_at: new Date().toISOString(),
        };

        // Supabaseに保存
        if (supabase && user) {
            await supabase.from('letters').insert([{
                user_id: user.id,
                channel_id: newChannel.id,
                title: welcomeLetter.title,
                video_url: welcomeLetter.video_url,
                thumbnail_url: welcomeLetter.thumbnail_url,
                summary: welcomeLetter.summary,
            }]);
        }

        setLetters([welcomeLetter, ...letters]);
        setChannelName('');
        setChannelUrl('');
        setActiveTab('letterbox');
    };

    // チャンネル削除
    const handleDeleteChannel = async (channelId: string) => {
        if (supabase && user) {
            await supabase.from('channels').delete().eq('id', channelId);
        }
        setChannels(channels.filter((c) => c.id !== channelId));
        setLetters(letters.filter((l) => l.channel_id !== channelId));
    };

    // DeepDive生成完了時
    const handleDeepDiveGenerated = (letterId: string, content: string) => {
        setLetters(
            letters.map((l) =>
                l.id === letterId ? { ...l, deep_dive_content: content, is_deep_dive_available: true } : l
            )
        );
    };

    // 今日のレターと過去のレターを分離
    const today = new Date().toDateString();
    const todayLetters = letters.filter((l) => new Date(l.created_at).toDateString() === today);
    const pastLetters = letters.filter((l) => new Date(l.created_at).toDateString() !== today);

    // ========================================
    // レンダリング
    // ========================================

    // 言語未選択の場合
    if (!language) {
        return (
            <div className="language-selection">
                <h1>Briefly.</h1>
                <p>Select your language / 言語を選択してください</p>
                <div className="language-buttons">
                    <button className="language-btn" onClick={() => handleLanguageSelect('ja')}>
                        日本語
                    </button>
                    <button className="language-btn" onClick={() => handleLanguageSelect('en')}>
                        English
                    </button>
                </div>
            </div>
        );
    }

    // 未ログインの場合（Supabase設定時のみ）
    if (isSupabaseConfigured() && !user) {
        return (
            <div className="login-screen">
                <div className="login-container">
                    <h1 className="login-logo">{t('appName', language)}</h1>
                    <p className="login-tagline">{t('tagline', language)}</p>

                    <form className="login-form" onSubmit={handleAuth}>
                        <input
                            type="email"
                            className="login-input"
                            placeholder={t('email', language)}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            className="login-input"
                            placeholder={t('password', language)}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                        <button type="submit" className="login-btn" disabled={isLoading}>
                            {isLoading
                                ? t('loading', language)
                                : authMode === 'login'
                                    ? t('login', language)
                                    : t('signUp', language)}
                        </button>
                    </form>

                    {authError && <p className="login-error">{authError}</p>}
                    {authSuccess && <p className="login-success">{authSuccess}</p>}

                    <p className="login-switch">
                        {authMode === 'login' ? t('noAccount', language) : t('hasAccount', language)}{' '}
                        <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
                            {authMode === 'login' ? t('signUp', language) : t('login', language)}
                        </button>
                    </p>
                </div>
            </div>
        );
    }

    // Supabase未設定でもデモモードで表示
    // メインアプリ
    return (
        <div className="app-container">
            {/* ヘッダー */}
            <header className="app-header">
                <h1 className="app-logo">{t('appName', language)}</h1>
                <div className="header-actions">
                    <button
                        className="lang-toggle"
                        onClick={() => handleLanguageSelect(language === 'ja' ? 'en' : 'ja')}
                    >
                        {language === 'ja' ? 'EN' : 'JA'}
                    </button>
                    {(user || !isSupabaseConfigured()) && (
                        <button className="logout-btn" onClick={handleLogout}>
                            {t('logout', language)}
                        </button>
                    )}
                </div>
            </header>

            {/* タブナビゲーション */}
            <nav className="tab-nav">
                <button
                    className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('register');
                        setSelectedChannel(null);
                    }}
                >
                    {t('registerChannel', language)}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'letterbox' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('letterbox');
                        setSelectedChannel(null);
                    }}
                >
                    {t('letterBox', language)}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'channels' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('channels');
                        setSelectedChannel(null);
                    }}
                >
                    {t('channels', language)}
                </button>
            </nav>

            {/* メインコンテンツ */}
            <main className="main-content">
                {/* チャンネル登録タブ */}
                {activeTab === 'register' && (
                    <div>
                        <h2 className="section-title">{t('registerChannel', language)}</h2>
                        <form className="register-form" onSubmit={handleRegisterChannel}>
                            <input
                                type="text"
                                className="register-input"
                                placeholder={language === 'ja' ? 'チャンネル名' : 'Channel Name'}
                                value={channelName}
                                onChange={(e) => setChannelName(e.target.value)}
                                required
                            />
                            <input
                                type="url"
                                className="register-input"
                                placeholder={t('channelUrl', language)}
                                value={channelUrl}
                                onChange={(e) => setChannelUrl(e.target.value)}
                            />
                            <button type="submit" className="register-btn">
                                {t('register', language)}
                            </button>
                        </form>
                    </div>
                )}

                {/* レターボックスタブ */}
                {activeTab === 'letterbox' && (
                    <div>
                        {/* 今日のレター */}
                        <section className="letters-section">
                            <h2 className="section-title">{t('todayLetters', language)}</h2>
                            {todayLetters.length > 0 ? (
                                <div className="letters-grid">
                                    {todayLetters.map((letter) => (
                                        <LetterCard
                                            key={letter.id}
                                            letter={letter}
                                            lang={language}
                                            onDeepDiveGenerated={handleDeepDiveGenerated}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="empty-state">{t('noLettersToday', language)}</p>
                            )}
                        </section>

                        {/* 過去のレター */}
                        <section className="letters-section">
                            <h2 className="section-title">{t('pastLetters', language)}</h2>
                            {pastLetters.length > 0 ? (
                                <div className="letters-grid">
                                    {pastLetters.map((letter) => (
                                        <LetterCard
                                            key={letter.id}
                                            letter={letter}
                                            lang={language}
                                            onDeepDiveGenerated={handleDeepDiveGenerated}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="empty-state">{t('noLettersPast', language)}</p>
                            )}
                        </section>
                    </div>
                )}

                {/* チャンネル一覧タブ */}
                {activeTab === 'channels' && !selectedChannel && (
                    <div>
                        <h2 className="section-title">{t('channels', language)}</h2>
                        {channels.length > 0 ? (
                            <div className="channels-grid">
                                {channels.map((channel) => (
                                    <div key={channel.id} className="channel-card">
                                        <div className="channel-header">
                                            <img src={channel.avatar_url} alt={channel.name} className="channel-avatar" />
                                            <div className="channel-info">
                                                <h3>{channel.name}</h3>
                                                {channel.description && <p>{channel.description}</p>}
                                            </div>
                                        </div>
                                        <div className="channel-actions">
                                            <button
                                                className="channel-btn"
                                                onClick={() => setSelectedChannel(channel)}
                                            >
                                                {t('viewLetters', language)}
                                            </button>
                                            <button
                                                className="channel-btn delete"
                                                onClick={() => handleDeleteChannel(channel.id)}
                                            >
                                                {t('delete', language)}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="empty-state">{t('noChannels', language)}</p>
                        )}
                    </div>
                )}

                {/* 選択したチャンネルのレター一覧 */}
                {activeTab === 'channels' && selectedChannel && (
                    <div className="channel-letters-view">
                        <button className="back-btn" onClick={() => setSelectedChannel(null)}>
                            ← {t('channels', language)}
                        </button>
                        <h2 className="section-title">{selectedChannel.name}</h2>
                        <p className="section-subtitle">{t('allLetters', language)}</p>
                        {letters.filter((l) => l.channel_id === selectedChannel.id).length > 0 ? (
                            <div className="letters-grid">
                                {letters
                                    .filter((l) => l.channel_id === selectedChannel.id)
                                    .map((letter) => (
                                        <LetterCard
                                            key={letter.id}
                                            letter={letter}
                                            lang={language}
                                            onDeepDiveGenerated={handleDeepDiveGenerated}
                                        />
                                    ))}
                            </div>
                        ) : (
                            <p className="empty-state">{t('noLettersPast', language)}</p>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;

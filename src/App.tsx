import React, { useState, useEffect } from 'react';
import { Channel, Letter, ViewMode } from './types';
import LetterCard from './components/LetterCard';
import { Plus, Inbox, Search, Youtube, Bell, LogOut, Globe, AlertCircle, CheckCircle2, Eye, EyeOff, ArrowLeft, Settings, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { translations, Language } from './lib/i18n';
import { getCredential, setStoredCredential, getStoredCredential } from './lib/credentials';
import { fetchChannelInfo, fetchVideoInfo } from './services/youtubeService';

// --- MOCK DATA FOR FALLBACK ---
const MOCK_CHANNELS_JA: Channel[] = [
    { id: 'c1', name: 'Veritasium', avatarUrl: 'https://picsum.photos/seed/veritasium/100/100', description: '真実の要素を探求するサイエンスチャンネル。' },
    { id: 'c2', name: 'Lex Fridman', avatarUrl: 'https://picsum.photos/seed/lex/100/100', description: 'AI、意識、愛、そして権力についての深い対話。' },
];

const MOCK_LETTERS_JA: Letter[] = [
    { id: 'l1', channelId: 'c1', title: 'AIの非線形性がもたらす潜在的な危険性', videoUrl: 'https://www.youtube.com/watch?v=1', thumbnailUrl: 'https://picsum.photos/seed/ai-danger/600/340', summary: 'AIパラメータのわずかな変化が、どのように予期せぬ劇的な振る舞いにつながるかを探求します。', date: new Date().toISOString(), isDeepDiveAvailable: false, isRead: false },
];

const MOCK_CHANNELS_EN: Channel[] = [
    { id: 'c1', name: 'Veritasium', avatarUrl: 'https://picsum.photos/seed/veritasium/100/100', description: 'The element of truth.' },
    { id: 'c2', name: 'Lex Fridman', avatarUrl: 'https://picsum.photos/seed/lex/100/100', description: 'Conversations about the nature of intelligence.' },
];

const MOCK_LETTERS_EN: Letter[] = [
    { id: 'l1', channelId: 'c1', title: 'The Potentially Dangerous Non-Linearity of AI', videoUrl: 'https://www.youtube.com/watch?v=1', thumbnailUrl: 'https://picsum.photos/seed/ai-danger/600/340', summary: 'An exploration into how small changes in AI parameters can lead to drastically unexpected behaviors.', date: new Date().toISOString(), isDeepDiveAvailable: false, isRead: false },
];

// --- COMPONENTS ---

// 0. Language Selection View
const LanguageSelectionView = ({ onSelect }: { onSelect: (lang: Language) => void }) => {
    return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-4 animate-in fade-in duration-700">
            <div className="bg-white p-10 md:p-16 shadow-sharp max-w-lg w-full border border-ink text-center">
                <div className="w-16 h-16 bg-ink text-white flex items-center justify-center font-serif font-bold text-3xl rounded-sm mx-auto mb-8">B.</div>
                <h1 className="font-serif text-2xl font-bold text-ink mb-2">Welcome to Briefly.</h1>
                <p className="text-stone-500 mb-10">Select your preferred language / 言語を選択してください</p>

                <div className="space-y-4">
                    <button
                        onClick={() => onSelect('ja')}
                        className="w-full py-5 border-2 border-stone-200 hover:border-ink hover:bg-stone-50 transition-all group flex items-center justify-between px-8"
                    >
                        <span className="font-bold text-lg text-ink">日本語</span>
                        <span className="text-stone-400 group-hover:text-accent font-serif italic">Japanese</span>
                    </button>

                    <button
                        onClick={() => onSelect('en')}
                        className="w-full py-5 border-2 border-stone-200 hover:border-ink hover:bg-stone-50 transition-all group flex items-center justify-between px-8"
                    >
                        <span className="font-bold text-lg text-ink">English</span>
                        <span className="text-stone-400 group-hover:text-accent font-serif italic">English</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// 1. Sidebar Component
const Sidebar = ({
    channels, activeView, setActiveView, selectedChannelId, setSelectedChannelId, language, setLanguage, onSignOut
}: {
    channels: Channel[], activeView: ViewMode, setActiveView: (v: ViewMode) => void, selectedChannelId: string | null, setSelectedChannelId: (id: string | null) => void, language: Language, setLanguage: (l: Language) => void, onSignOut: () => void
}) => {
    const t = translations[language];
    return (
        <aside className="w-full md:w-72 bg-white border-r border-stone-200 h-auto md:h-screen flex flex-col flex-shrink-0 sticky top-0 z-20">
            <div className="p-6 md:p-8 border-b border-stone-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-ink text-white flex items-center justify-center font-serif font-bold text-xl rounded-sm">B.</div>
                    <h1 className="font-serif text-xl font-bold tracking-tight text-ink">BRIEFLY.</h1>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
                <div>
                    <h2 className="px-4 text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">{t.menu}</h2>
                    <nav className="space-y-1">
                        <button onClick={() => { setActiveView('inbox'); setSelectedChannelId(null); }} className={clsx("w-full flex items-center space-x-3 px-4 py-2.5 rounded-md transition-all text-sm font-medium", activeView === 'inbox' ? "bg-paper text-accent" : "text-stone-600 hover:bg-stone-50")}>
                            <Inbox size={18} /><span>{t.letterBox}</span>
                        </button>
                        <button onClick={() => { setActiveView('generator'); setSelectedChannelId(null); }} className={clsx("w-full flex items-center space-x-3 px-4 py-2.5 rounded-md transition-all text-sm font-medium", activeView === 'generator' ? "bg-paper text-accent" : "text-stone-600 hover:bg-stone-50")}>
                            <Sparkles size={18} /><span>{t.generator}</span>
                        </button>
                        <button onClick={() => { setActiveView('register'); setSelectedChannelId(null); }} className={clsx("w-full flex items-center space-x-3 px-4 py-2.5 rounded-md transition-all text-sm font-medium", activeView === 'register' ? "bg-paper text-accent" : "text-stone-600 hover:bg-stone-50")}>
                            <Plus size={18} /><span>{t.registerChannel}</span>
                        </button>
                    </nav>
                </div>
                <div>
                    <div className="flex items-center justify-between px-4 mb-4">
                        <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest">{t.subscriptions}</h2>
                        <span className="text-xs text-stone-300 font-mono">{channels.length}</span>
                    </div>
                    <div className="space-y-1">
                        {channels.map(channel => (
                            <button key={channel.id} onClick={() => { setSelectedChannelId(channel.id); setActiveView('channel'); }} className={clsx("w-full flex items-center space-x-3 px-4 py-2 rounded-md transition-all group", selectedChannelId === channel.id ? "bg-paper" : "hover:bg-stone-50")}>
                                {channel.avatarUrl ? <img src={channel.avatarUrl} alt={channel.name} className="w-6 h-6 rounded-full border border-stone-200" /> : <div className="w-6 h-6 rounded-full border border-stone-200 bg-stone-100"></div>}
                                <span className={clsx("text-sm font-medium truncate", selectedChannelId === channel.id ? "text-ink" : "text-stone-500 group-hover:text-stone-700")}>{channel.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-6 border-t border-stone-100 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <button onClick={() => { setActiveView('settings'); setSelectedChannelId(null); }} className={clsx("flex items-center space-x-2 text-xs font-bold transition-colors", activeView === 'settings' ? "text-ink" : "text-stone-400 hover:text-ink")}>
                        <Settings size={14} /><span>{t.settings}</span>
                    </button>
                    <button onClick={() => {
                        const newLang = language === 'en' ? 'ja' : 'en';
                        setLanguage(newLang);
                        localStorage.setItem('briefly_language', newLang);
                    }} className="flex items-center space-x-2 text-xs font-bold text-stone-500 hover:text-ink transition-colors">
                        <Globe size={14} /><span>{language === 'en' ? 'ENGLISH' : '日本語'}</span>
                    </button>
                </div>
                <button onClick={onSignOut} className="w-full flex items-center justify-center space-x-2 text-xs font-bold text-stone-400 hover:text-accent transition-colors py-2">
                    <LogOut size={14} /><span>{t.signOut}</span>
                </button>
            </div>
        </aside>
    );
}

// 2. Channel Register Component
const RegisterView = ({ onRegister, language }: { onRegister: (url: string) => void, language: Language }) => {
    const [url, setUrl] = useState('');
    const t = translations[language];
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (url) onRegister(url); };

    return (
        <div className="max-w-2xl mx-auto py-12 px-6 fade-in">
            <div className="mb-10 text-center">
                <h2 className="font-serif text-4xl text-ink font-bold mb-4">{t.curateFeed}</h2>
                <p className="text-stone-500 text-lg">{t.curateSubtitle}</p>
            </div>
            <form onSubmit={handleSubmit} className="bg-white p-8 md:p-12 shadow-soft rounded-sm border border-stone-100">
                <div className="relative">
                    <label htmlFor="url" className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">{t.channelUrl}</label>
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="text-stone-300" size={20} /></div>
                            <input type="text" id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/@channelname" className="block w-full pl-10 pr-3 py-4 border border-stone-200 rounded-none bg-stone-50 text-ink placeholder-stone-300 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all font-medium" />
                        </div>
                        <button type="submit" className="px-8 py-4 bg-ink text-white font-bold tracking-wide uppercase text-sm hover:bg-accent transition-colors duration-300">{t.subscribe}</button>
                    </div>
                    <p className="mt-4 text-xs text-stone-400 flex items-center"><Youtube size={12} className="mr-1" />{t.supports}</p>
                </div>
            </form>
        </div>
    );
};

// 2.5 Generator View
const GeneratorView = ({ language }: { language: Language }) => {
    const [url, setUrl] = useState('');
    const [resultLetter, setResultLetter] = useState<Letter | null>(null);
    const t = translations[language];

    // In a real implementation this would call logic similar to handleRegister but only for one-off generation
    // For MVP we can reuse the LetterCard if we construct a temporary letter object.
    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        let videoInfo = { title: `Report for: ${url}`, thumbnailUrl: '', channelTitle: 'Unknown Channel' };
        try {
            const info = await fetchVideoInfo(url);
            if (info) videoInfo = info;
        } catch (e) {
            console.error('Failed to fetch video info', e);
        }

        const tempId = crypto.randomUUID();
        const newLetter: Letter = {
            id: tempId,
            channelId: 'temp',
            title: videoInfo.title,
            videoUrl: url,
            thumbnailUrl: videoInfo.thumbnailUrl,
            summary: language === 'ja' ? 'レポートを生成するには「詳細レポート」をクリックしてください。' : 'Click "Read Report" to generate the content.',
            date: new Date().toISOString(),
            isDeepDiveAvailable: false,
            isRead: false
        };
        setResultLetter(newLetter);
    };

    return (
        <div className="max-w-2xl mx-auto py-12 px-6 fade-in">
            <div className="mb-10 text-center">
                <h2 className="font-serif text-4xl text-ink font-bold mb-4">{t.generator}</h2>
                <div className="w-12 h-1 bg-accent mx-auto"></div>
            </div>

            <form onSubmit={handleGenerate} className="bg-white p-8 md:p-12 shadow-soft rounded-sm border border-stone-100 mb-12">
                <div className="relative">
                    <label htmlFor="gen-url" className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">{t.enterVideoUrl}</label>
                    <div className="flex gap-4">
                        <input type="text" id="gen-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="block w-full px-4 py-4 border border-stone-200 rounded-none bg-stone-50 text-ink placeholder-stone-300 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all font-medium" />
                        <button type="submit" className="px-8 py-4 bg-ink text-white font-bold tracking-wide uppercase text-sm hover:bg-accent transition-colors duration-300">{t.generate}</button>
                    </div>
                </div>
            </form>

            {resultLetter && (
                <div className="animate-in slide-in-from-bottom-4 duration-700">
                    <LetterCard letter={resultLetter} language={language} onUpdateLetter={(l) => setResultLetter(l)} />
                </div>
            )}
        </div>
    )
}

// 2.6 Settings View
const SettingsView = ({ language }: { language: Language }) => {
    const [apiKey, setApiKey] = useState(getStoredCredential('GEMINI_API_KEY') || '');
    const [saved, setSaved] = useState(false);
    const t = translations[language];

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setStoredCredential('GEMINI_API_KEY', apiKey);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="max-w-lg mx-auto py-12 px-6 fade-in">
            <div className="mb-10 text-center">
                <h2 className="font-serif text-3xl text-ink font-bold mb-4">{t.settings}</h2>
            </div>
            <form onSubmit={handleSave} className="bg-white p-8 shadow-soft rounded-sm border border-stone-100">
                <div className="mb-6">
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">{t.geminiApiKey}</label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={t.apiKeyPlaceholder}
                        className="w-full p-4 border border-stone-200 bg-stone-50 focus:outline-none focus:border-ink transition-colors font-mono text-sm"
                    />
                    <p className="mt-2 text-xs text-stone-400">{t.apiKeyHelp}</p>
                </div>

                {saved && (
                    <div className="mb-4 text-green-600 text-sm flex items-center bg-green-50 p-3 rounded-sm">
                        <CheckCircle2 size={16} className="mr-2" /> {t.settingsSaved}
                    </div>
                )}

                <button type="submit" className="w-full py-4 bg-ink text-white font-bold tracking-widest uppercase text-sm hover:bg-stone-800 transition-colors">
                    {t.saveSettings}
                </button>
            </form>
        </div>
    );
};

// 3. Login Component
const AuthView = ({ language, setLanguage }: { language: Language, setLanguage: (l: Language) => void }) => {
    const [view, setView] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);
    const t = translations[language];

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) {
            setError(t.supabaseWarning);
            return;
        }

        setLoading(true);
        setError(null);
        setInfoMessage(null);

        try {
            if (view === 'signup') {
                const { error, data } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                if (data.user && !data.session) {
                    setInfoMessage(t.checkEmail);
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            }
        } catch (err: any) {
            setError(err.message || t.authError);
        } finally {
            setLoading(false);
        }
    };

    const toggleLanguage = () => {
        const newLang = language === 'en' ? 'ja' : 'en';
        setLanguage(newLang);
        localStorage.setItem('briefly_language', newLang);
    };

    return (
        <div className="min-h-screen bg-paper flex flex-col md:flex-row animate-in fade-in duration-700">
            {/* Left Column: Brand & Info (Visible on Desktop) */}
            <div className="hidden md:flex flex-1 bg-ink text-white p-12 md:p-20 flex-col justify-between relative overflow-hidden">
                <div className="relative z-10">
                    <div className="w-16 h-16 bg-white text-ink flex items-center justify-center font-serif font-bold text-3xl rounded-sm mb-8">B.</div>
                    <h1 className="font-serif text-5xl font-bold mb-6">Briefly.</h1>
                    <p className="text-stone-300 text-xl leading-relaxed max-w-md font-light">
                        {t.welcomeDescription}
                    </p>
                </div>

                {/* Decorative circle */}
                <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full border-[30px] border-stone-800 opacity-50"></div>

                <div className="relative z-10 text-stone-400 text-sm">
                    © 2024 Briefly. AI Reader.
                </div>
            </div>

            {/* Right Column: Auth Forms */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-20 bg-white relative">
                <button
                    onClick={toggleLanguage}
                    className="absolute top-8 right-8 flex items-center space-x-2 text-sm font-bold text-stone-400 hover:text-ink transition-colors"
                >
                    <Globe size={16} />
                    <span>{language === 'en' ? '日本語' : 'English'}</span>
                </button>

                <div className="w-full max-w-md">
                    {/* Mobile Logo (Visible only on mobile) */}
                    <div className="md:hidden text-center mb-10">
                        <div className="w-12 h-12 bg-ink text-white flex items-center justify-center font-serif font-bold text-2xl rounded-sm mx-auto mb-4">B.</div>
                        <h1 className="font-serif text-3xl font-bold text-ink">Briefly.</h1>
                    </div>

                    <div className="mb-8">
                        {view === 'signup' && (
                            <button onClick={() => setView('signin')} className="flex items-center text-stone-400 hover:text-ink mb-4 text-sm font-bold transition-colors">
                                <ArrowLeft size={16} className="mr-1" /> {t.goBack}
                            </button>
                        )}
                        <h2 className="font-serif text-3xl font-bold text-ink mb-2">
                            {view === 'signin' ? t.signInTitle : t.accountSetup}
                        </h2>
                        <p className="text-stone-500">
                            {view === 'signin' ? t.signInSubtitle : t.welcomeDescription}
                        </p>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">{t.emailLabel}</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-4 border border-stone-200 bg-stone-50 focus:outline-none focus:border-ink transition-colors font-medium"
                            />
                        </div>
                        <div className="relative">
                            <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">{t.passwordLabel}</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-4 border border-stone-200 bg-stone-50 focus:outline-none focus:border-ink transition-colors font-medium"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-[38px] text-stone-400 hover:text-ink transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 text-sm border border-red-100">
                                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        {infoMessage && (
                            <div className="flex items-start gap-2 text-green-700 bg-green-50 p-3 text-sm border border-green-100">
                                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                                <p>{infoMessage}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-ink text-white font-bold tracking-widest uppercase text-sm hover:bg-stone-800 transition-colors disabled:opacity-50 mt-4 shadow-lg shadow-stone-200"
                        >
                            {loading ? t.loading : (view === 'signin' ? t.signInButton : t.signUpButton)}
                        </button>
                    </form>

                    {view === 'signin' && (
                        <div className="mt-8 text-center pt-6 border-t border-stone-100">
                            <button
                                onClick={() => setView('signup')}
                                className="text-stone-500 hover:text-accent font-medium text-sm transition-colors"
                            >
                                {t.signUpButton}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// 4. Main App Container
export default function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [activeView, setActiveView] = useState<ViewMode>('inbox');
    const [language, setLanguage] = useState<Language | null>(null);

    // Data State
    const [channels, setChannels] = useState<Channel[]>([]);
    const [letters, setLetters] = useState<Letter[]>([]);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize Language from LocalStorage
    useEffect(() => {
        const savedLang = localStorage.getItem('briefly_language') as Language;
        if (savedLang) {
            setLanguage(savedLang);
        }
    }, []);

    // Initialize Auth & Data
    useEffect(() => {
        if (!supabase) {
            setIsLoading(false);
            // If no Supabase, load mock data immediately for demo
            if (language) {
                setChannels(language === 'ja' ? MOCK_CHANNELS_JA : MOCK_CHANNELS_EN);
                setLetters(language === 'ja' ? MOCK_LETTERS_JA : MOCK_LETTERS_EN);
            }
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, [language]);

    // Data Fetching Effect (Only runs if authenticated and language is set)
    useEffect(() => {
        if (!session || !supabase || !language) return;

        const fetchData = async () => {
            if (!supabase) return;
            const { data: channelsData } = await supabase.from('channels').select('*');
            if (channelsData && channelsData.length > 0) {
                setChannels(channelsData);
            } else {
                setChannels([]);
            }

            const { data: lettersData } = await supabase.from('letters').select('*');
            if (lettersData && lettersData.length > 0) {
                setLetters(lettersData);
            } else {
                setLetters([]);
            }
        };
        fetchData();
    }, [session, language]);

    const handleUpdateLetter = async (updatedLetter: Letter) => {
        setLetters(prev => prev.map(l => l.id === updatedLetter.id ? updatedLetter : l));
        if (session && supabase) {
            const { error } = await supabase.from('letters').update({
                deep_dive_content: updatedLetter.deepDiveContent,
                is_deep_dive_available: updatedLetter.isDeepDiveAvailable
            }).eq('id', updatedLetter.id);
            if (error) console.error('Error saving deep dive:', error);
        }
    };

    const handleRegister = async (url: string) => {
        const newId = crypto.randomUUID();

        // Fetch channel info from YouTube API
        let channelInfo: Partial<Channel> | null = null;
        try {
            channelInfo = await fetchChannelInfo(url);
        } catch (e) {
            console.error(e);
        }

        const newChannel: Channel = {
            id: newId,
            name: channelInfo?.name || `Channel from ${url.substring(0, 15)}...`,
            avatarUrl: channelInfo?.avatarUrl || `https://picsum.photos/seed/${newId}/100/100`,
            description: channelInfo?.description || 'Added via Briefly.'
        };

        setChannels(prev => [...prev, newChannel]);
        setActiveView('inbox');
        setSelectedChannelId(newId);

        if (session && supabase) {
            const { error } = await supabase.from('channels').insert({
                id: newId,
                user_id: session.user.id,
                name: newChannel.name,
                avatar_url: newChannel.avatarUrl,
                description: newChannel.description
            });
            if (error) console.error("Error saving channel:", error);

            const newLetterId = crypto.randomUUID();
            const newLetter: Letter = {
                id: newLetterId,
                channelId: newId,
                title: 'Subscription Confirmed',
                videoUrl: url,
                thumbnailUrl: 'https://picsum.photos/seed/welcome/600/340',
                summary: language === 'ja' ? '新しいチャンネルを登録しました。次回の更新をお待ちください。' : 'Channel subscribed successfully. Updates will appear here.',
                date: new Date().toISOString(),
                isDeepDiveAvailable: false,
                isRead: false
            };
            setLetters(prev => [newLetter, ...prev]);

            await supabase.from('letters').insert({ ...newLetter, user_id: session.user.id });
        }
    };

    const handleSignOut = () => {
        if (supabase) supabase.auth.signOut();
    };

    // Helper to get letters based on view
    const getFilteredLetters = () => {
        let filtered = letters;
        if (selectedChannelId) {
            filtered = letters.filter(l => l.channelId === selectedChannelId);
        }
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    // RENDER LOGIC FLOW

    // 1. Language Not Selected -> Show Picker
    if (!language) {
        return <LanguageSelectionView onSelect={(l) => {
            setLanguage(l);
            localStorage.setItem('briefly_language', l);
        }} />;
    }

    const t = translations[language];

    // 2. Loading State
    if (isLoading) {
        return <div className="h-screen w-full flex items-center justify-center bg-paper text-ink font-serif">{t.loading}</div>;
    }

    // 3. Not Authenticated (and Supabase is configured) -> Show Auth
    if (!session && supabase) {
        return <AuthView language={language} setLanguage={setLanguage} />;
    }

    // 4. Main App (Authenticated OR Demo Mode if Supabase missing)
    const filteredLetters = getFilteredLetters();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysLetters = filteredLetters.filter(l => new Date(l.date) >= today);
    const pastLetters = filteredLetters.filter(l => new Date(l.date) < today);

    const renderContent = () => {
        if (activeView === 'register') return <RegisterView onRegister={handleRegister} language={language} />;
        if (activeView === 'generator') return <GeneratorView language={language} />;
        if (activeView === 'settings') return <SettingsView language={language} />;

        const isChannelView = activeView === 'channel' && selectedChannelId;
        const currentChannel = isChannelView ? channels.find(c => c.id === selectedChannelId) : null;

        return (
            <div className="max-w-4xl mx-auto py-8 px-4 md:px-8">
                <div className="mb-12 border-b-2 border-ink pb-6 flex items-end justify-between">
                    <div>
                        <span className="block text-xs font-bold text-accent uppercase tracking-widest mb-2">
                            {isChannelView ? t.channelArchive : t.dailyDigest}
                        </span>
                        <h2 className="font-serif text-4xl md:text-5xl font-bold text-ink">
                            {isChannelView ? currentChannel?.name : t.letterBox}
                        </h2>
                    </div>
                    <div className="text-stone-400 text-sm font-medium">
                        {language === 'ja'
                            ? new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).replace(/ /g, '')
                            : new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                        }
                    </div>
                </div>

                {todaysLetters.length > 0 && (
                    <div className="mb-16">
                        <div className="flex items-center space-x-4 mb-8">
                            <h3 className="font-display text-xl font-bold text-stone-800">{t.todaysEdition}</h3>
                            <div className="h-px bg-stone-300 flex-1"></div>
                        </div>
                        <div className="space-y-8">
                            {todaysLetters.map(letter => (
                                <LetterCard key={letter.id} letter={letter} channel={channels.find(c => c.id === letter.channelId)} onUpdateLetter={handleUpdateLetter} language={language} />
                            ))}
                        </div>
                    </div>
                )}

                {(pastLetters.length > 0 || (todaysLetters.length === 0 && pastLetters.length === 0)) && (
                    <div>
                        <div className="flex items-center space-x-4 mb-8">
                            <h3 className="font-display text-xl font-bold text-stone-400">{t.previousEditions}</h3>
                            <div className="h-px bg-stone-200 flex-1"></div>
                        </div>
                        {pastLetters.length === 0 && todaysLetters.length === 0 ? (
                            <div className="text-center py-20 bg-white border border-dashed border-stone-300">
                                <Bell className="mx-auto text-stone-300 mb-4" size={48} />
                                <p className="text-stone-500 font-medium">{t.noLetters}</p>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {pastLetters.map(letter => (
                                    <LetterCard key={letter.id} letter={letter} channel={channels.find(c => c.id === letter.channelId)} onUpdateLetter={handleUpdateLetter} language={language} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-paper font-sans">
            <Sidebar channels={channels} activeView={activeView} setActiveView={setActiveView} selectedChannelId={selectedChannelId} setSelectedChannelId={setSelectedChannelId} language={language} setLanguage={setLanguage} onSignOut={handleSignOut} />
            <main className="flex-1 overflow-y-auto h-screen relative scroll-smooth">
                {!getCredential('GEMINI_API_KEY') && <div className="bg-accent text-white px-4 py-2 text-center text-sm font-medium sticky top-0 z-50">{t.apiKeyWarning}</div>}
                {!supabase && <div className="bg-stone-800 text-white px-4 py-2 text-center text-sm font-medium sticky top-0 z-40">{t.supabaseWarning}</div>}
                {renderContent()}
            </main>
        </div>
    );
}

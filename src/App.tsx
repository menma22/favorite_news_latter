import React, { useState, useEffect, useRef } from 'react';
import { Channel, Letter, ViewMode } from './types';
import LetterCard from './components/LetterCard';
import { Plus, Inbox, Search, Youtube, Bell, LogOut, Globe, AlertCircle, CheckCircle2, Eye, EyeOff, ArrowLeft, Settings, Sparkles, Loader2, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import { translations, Language } from './lib/i18n';
import { getCredential, setStoredCredential, getStoredCredential } from './lib/credentials';
import { fetchChannelInfo, fetchVideoInfo, fetchTranscript, fetchTodaysVideosForChannel } from './services/youtubeService';
import { generateQuickSummary, translateText } from './services/geminiService';

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
    channels, activeView, setActiveView, selectedChannelId, setSelectedChannelId, language, setLanguage, onSignOut, onDeleteChannel
}: {
    channels: Channel[], activeView: ViewMode, setActiveView: (v: ViewMode) => void, selectedChannelId: string | null, setSelectedChannelId: (id: string | null) => void, language: Language, setLanguage: (l: Language) => void, onSignOut: () => void, onDeleteChannel: (id: string) => void
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
                        <button onClick={() => { setActiveView('today'); setSelectedChannelId(null); }} className={clsx("w-full flex items-center space-x-3 px-4 py-2.5 rounded-md transition-all text-sm font-medium", activeView === 'today' ? "bg-paper text-accent" : "text-stone-600 hover:bg-stone-50")}>
                            <Bell size={18} /><span>{t.today}</span>
                        </button>
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
                            <div key={channel.id} className="relative group">
                                <button onClick={() => { setSelectedChannelId(channel.id); setActiveView('channel'); }} className={clsx("w-full flex items-center space-x-3 px-4 py-2 rounded-md transition-all", selectedChannelId === channel.id ? "bg-paper" : "hover:bg-stone-50")}>
                                    {channel.avatarUrl ? <img src={channel.avatarUrl} alt={channel.name} className="w-6 h-6 rounded-full border border-stone-200" /> : <div className="w-6 h-6 rounded-full border border-stone-200 bg-stone-100"></div>}
                                    <span className={clsx("text-sm font-medium truncate flex-1 text-left", selectedChannelId === channel.id ? "text-ink" : "text-stone-500 group-hover:text-stone-700")}>{channel.name}</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(language === 'ja' ? 'このチャンネルを削除しますか？' : 'Delete this channel?')) {
                                            onDeleteChannel(channel.id);
                                        }
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-500 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
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

// 2.5 Generator View WITH HISTORY SIDEBAR
const GeneratorView = ({
    language,
    history,
    onNewLetter,
    onUpdateLetter,
    onDeleteLetter
}: {
    language: Language,
    history: Letter[],
    onNewLetter: (l: Letter) => void,
    onUpdateLetter: (l: Letter) => void,
    onDeleteLetter?: (id: string) => void
}) => {
    const [url, setUrl] = useState('');
    const [activeLetter, setActiveLetter] = useState<Letter | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [transcriptMethod, setTranscriptMethod] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const t = translations[language];

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url || isGenerating) return;

        setIsGenerating(true);
        setActiveLetter(null);
        setTranscriptMethod(null); // Reset transcript method

        try {
            // 1. Fetch Video Info
            let videoInfo = { title: `Report for: ${url}`, thumbnailUrl: '', channelTitle: 'Unknown Channel' };
            try {
                const info = await fetchVideoInfo(url);
                if (info) videoInfo = info;
            } catch (e) {
                console.error('Failed to fetch video info', e);
            }

            // 2. Fetch Transcript (for summary)
            let transcript: string | null = null;
            let currentTranscriptMethod: string | null = null; // Local variable for this generation
            try {
                // Step 1: Try standard fetch (fast)
                setStatusMessage(language === 'ja' ? '字幕データを検索中...' : 'Searching for transcript...');
                let transcriptResult = await fetchTranscript(url, false); // fallback=false

                // Step 2: If failed, try fallback (slow, with UI feedback)
                if (!transcriptResult) {
                    console.log('Standard transcript failed. Switching to audio download fallback...');
                    setStatusMessage(language === 'ja' ? '字幕が見つかりません。音声をダウンロードして文字起こし中... (数分かかる場合があります)' : 'No transcript found. Downloading and transcribing audio... (This may take a few minutes)');
                    transcriptResult = await fetchTranscript(url, true); // fallback=true
                }

                if (transcriptResult) {
                    transcript = transcriptResult.transcript;
                    currentTranscriptMethod = transcriptResult.method;
                }
            } catch (e) {
                console.warn('Failed to fetch transcript for summary', e);
            }
            setTranscriptMethod(currentTranscriptMethod); // Update state with the method used
            setStatusMessage(null); // Clear status message

            // 3. Generate Quick Summary
            let summaryText = language === 'ja'
                ? '要約を生成できませんでした。詳細レポートを作成してください。'
                : 'Could not generate summary. Please create a detailed report.';

            try {
                const generatedSummary = await generateQuickSummary(videoInfo.title, language, transcript || undefined);
                if (generatedSummary) {
                    summaryText = generatedSummary;
                }
            } catch (e) {
                console.warn('Failed to generate quick summary', e);
            }

            const tempId = crypto.randomUUID();
            const newLetter: Letter = {
                id: tempId,
                channelId: 'temp', // Marked as temp/one-off
                title: videoInfo.title,
                videoUrl: url,
                thumbnailUrl: videoInfo.thumbnailUrl,
                summary: summaryText,
                date: new Date().toISOString(),
                isDeepDiveAvailable: false,
                isRead: false
            };

            // Save to DB if authenticated
            if (supabase) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const { error } = await supabase.from('letters').insert({
                        user_id: session.user.id,
                        channel_id: null,
                        title: newLetter.title,
                        video_url: newLetter.videoUrl,
                        thumbnail_url: newLetter.thumbnailUrl,
                        summary: newLetter.summary,
                        date: newLetter.date,
                        is_deep_dive_available: newLetter.isDeepDiveAvailable,
                        is_read: newLetter.isRead,
                        deep_dive_content: newLetter.deepDiveContent
                    });

                    if (error) {
                        console.error('Supabase Save Error:', error);
                    }
                }
            }

            // Update local state and parent history
            setActiveLetter(newLetter);
            onNewLetter(newLetter);
            setUrl(''); // Clear input on success

        } catch (error) {
            console.error('Error in generation flow', error);
        } finally {
            setIsGenerating(false);
        }
    };

    // Filter history to show only 'one-off' letters (where channelId is 'temp' or null, though we store null in DB, types might have 'temp')
    // Actually, simply showing ALL letters sorted by date might be better for "History", OR just the ones generated here.
    // For now, let's show all letters as "History" because "Generator" is just a way to create them.
    const sortedHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="max-w-6xl mx-auto py-8 px-4 md:px-8 fade-in h-[calc(100vh-80px)]">

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">

                {/* LEFT COLUMN: Input & Result View (8 cols) */}
                <div className="lg:col-span-8 flex flex-col h-full overflow-y-auto pr-2">
                    <div className="mb-8 text-center lg:text-left">
                        <h2 className="font-serif text-4xl text-ink font-bold mb-2">{t.generator}</h2>
                        <p className="text-stone-500">{language === 'ja' ? '動画URLから瞬時にレポートを作成' : 'Generate instant reports from video URLs'}</p>
                    </div>

                    <form onSubmit={handleGenerate} className="bg-white p-6 shadow-soft rounded-sm border border-stone-100 mb-8 flex-shrink-0">
                        <div className="relative">
                            <label htmlFor="gen-url" className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">{t.enterVideoUrl}</label>
                            <div className="flex gap-4">
                                <input
                                    type="text"
                                    id="gen-url"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    className="block w-full px-4 py-4 border border-stone-200 rounded-none bg-stone-50 text-ink placeholder-stone-300 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all font-medium"
                                    disabled={isGenerating}
                                />
                                <button
                                    type="submit"
                                    disabled={!url || isGenerating}
                                    className="w-full bg-slate-900 text-white p-3 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            {statusMessage || (language === 'ja' ? '生成中...' : 'Generating...')}
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={20} />
                                            {language === 'ja' ? 'レターを生成' : 'Generate Letter'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>

                    {activeLetter ? (
                        <div className="animate-in slide-in-from-bottom-4 duration-700 pb-10">
                            {transcriptMethod === 'audio_fallback' && (
                                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-sm flex items-start gap-3">
                                    <Sparkles className="flex-shrink-0 mt-0.5" size={16} />
                                    <div>
                                        <p className="font-bold">{language === 'ja' ? '音声データから生成しました' : 'Generated from Audio Data'}</p>
                                        <p>{language === 'ja' ? '字幕がなかったため、AIが音声を直接聞き取って文字起こしを行いました。' : 'No subtitles found. AI transcribed the audio directly.'}</p>
                                    </div>
                                </div>
                            )}
                            <LetterCard
                                letter={activeLetter}
                                language={language}
                                onUpdateLetter={(l) => {
                                    setActiveLetter(l);
                                    // Use onUpdateLetter to ensure persistence
                                    onUpdateLetter(l);
                                }}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-stone-300 border-2 border-dashed border-stone-100 rounded-sm min-h-[300px]">
                            <Sparkles size={48} className="mb-4 opacity-50" />
                            <p className="font-medium text-lg">{language === 'ja' ? 'URLを入力してレポートを生成' : 'Enter a URL to generate a report'}</p>
                            <p className="text-sm mt-2">{language === 'ja' ? '生成された履歴は右側に表示されます' : 'Generated history will appear on the right'}</p>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: History Sidebar (4 cols) */}
                <div className="lg:col-span-4 bg-white border border-stone-100 shadow-soft flex flex-col h-full max-h-[calc(100vh-100px)] sticky top-0">
                    <div className="p-4 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
                        <h3 className="font-bold text-ink uppercase tracking-wider text-sm flex items-center gap-2">
                            <Inbox size={16} /> {language === 'ja' ? '生成履歴' : 'History'}
                        </h3>
                        <span className="text-xs font-mono text-stone-400">{sortedHistory.length}</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {sortedHistory.length === 0 ? (
                            <div className="p-8 text-center text-stone-400 text-sm italic">
                                {language === 'ja' ? '履歴はありません' : 'No history yet'}
                            </div>
                        ) : (
                            sortedHistory.map(item => (
                                <div key={item.id} className="relative group">
                                    <button
                                        onClick={() => setActiveLetter(item)}
                                        className={clsx(
                                            "w-full text-left p-3 rounded-sm transition-all border",
                                            activeLetter?.id === item.id
                                                ? "bg-stone-800 border-stone-800"
                                                : "bg-white border-stone-100 hover:border-stone-300 hover:shadow-sm"
                                        )}
                                    >
                                        <div className="flex gap-3">
                                            <div className={clsx(
                                                "w-16 h-12 bg-stone-200 flex-shrink-0 bg-cover bg-center rounded-sm",
                                                activeLetter?.id === item.id ? "opacity-80" : "opacity-100"
                                            )} style={{ backgroundImage: item.thumbnailUrl ? `url("${item.thumbnailUrl}")` : undefined }}></div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={clsx(
                                                    "font-bold text-xs leading-snug mb-1 truncate",
                                                    activeLetter?.id === item.id ? "text-white" : "text-ink hover:text-accent"
                                                )}>
                                                    {item.title}
                                                </h4>
                                                <p className={clsx(
                                                    "text-[10px] truncate",
                                                    activeLetter?.id === item.id ? "text-stone-400" : "text-stone-400"
                                                )}>
                                                    {new Date(item.date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(language === 'ja' ? '削除しますか？' : 'Delete?')) {
                                                onDeleteLetter?.(item.id);
                                            }
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 bg-white/90 rounded-full shadow-sm text-stone-400 hover:text-red-500 transition-all border border-stone-100"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div >
        </div >
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
    const processingVideoIds = useRef<Set<string>>(new Set()); // Track in-flight/processed videos
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
                // Map snake_case to camelCase
                const mappedChannels: Channel[] = channelsData.map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    avatarUrl: c.avatar_url,
                    description: c.description,
                    descriptionJa: c.description_ja, // Map cached translation
                    subscriberCount: c.subscriber_count, // Ideally added to DB
                    customUrl: c.custom_url, // Ideally added to DB
                    youtubeId: c.youtube_id // Real YouTube ID
                }));
                setChannels(mappedChannels);
            } else {
                setChannels([]);
            }

            const { data: lettersData } = await supabase.from('letters').select('*');
            if (lettersData && lettersData.length > 0) {
                // Map snake_case to camelCase
                const mappedLetters: Letter[] = lettersData.map((l: any) => ({
                    id: l.id,
                    channelId: l.channel_id,
                    title: l.title,
                    videoUrl: l.video_url,
                    thumbnailUrl: l.thumbnail_url,
                    summary: l.summary,
                    date: l.date,
                    isDeepDiveAvailable: l.is_deep_dive_available,
                    isRead: l.is_read,
                    deepDiveContent: l.deep_dive_content
                }));
                setLetters(mappedLetters);
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

    const handleDeleteLetter = async (letterId: string) => {
        setLetters(prev => prev.filter(l => l.id !== letterId));
        if (session && supabase) {
            const { error } = await supabase.from('letters').delete().eq('id', letterId);
            if (error) console.error('Error deleting letter:', error);
        }
    };

    const handleDeleteChannel = async (channelId: string) => {
        setChannels(prev => prev.filter(c => c.id !== channelId));
        setLetters(prev => prev.filter(l => l.channelId !== channelId)); // Cascade local
        if (selectedChannelId === channelId) setSelectedChannelId(null);

        if (session && supabase) {
            // Cascade delete in DB handles letters, we just delete channel
            const { error } = await supabase.from('channels').delete().eq('id', channelId);
            if (error) console.error('Error deleting channel:', error);
        }
    };

    // --- HELPERS ---

    const saveLetter = async (letter: Letter) => {
        setLetters(prev => [letter, ...prev]);
        if (session && supabase) {
            await supabase.from('letters').insert({
                id: letter.id,
                channel_id: letter.channelId,
                title: letter.title,
                video_url: letter.videoUrl,
                thumbnail_url: letter.thumbnailUrl,
                summary: letter.summary,
                date: letter.date,
                is_deep_dive_available: letter.isDeepDiveAvailable,
                is_read: letter.isRead,
                deep_dive_content: undefined,
                user_id: session.user.id
            });
        }
    };

    const checkForUpdates = async () => {
        if (!channels || channels.length === 0 || !supabase) return;

        // Don't show global loading for background update, 
        // maybe add a small indicator or just let it pop in.
        console.log("Checking for updates...");

        for (const channel of channels) {
            try {
                // Use youtubeId for API call if available, otherwise fallback (which likely fails for UUIDs)
                const apiChannelId = channel.youtubeId || channel.customUrl;
                if (!apiChannelId) {
                    console.warn(`[Auto-Update] Missing YouTube ID for channel ${channel.name} (${channel.id}). Skipping.`);
                    continue;
                }

                const recentVideos = await fetchTodaysVideosForChannel(apiChannelId);
                if (recentVideos && recentVideos.length > 0) {
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);

                    // Also check yesterday
                    const yesterdayStart = new Date(todayStart);
                    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

                    // Filter for today's and yesterday's videos
                    const recentVideosFiltered = recentVideos.filter(v => new Date(v.date) >= yesterdayStart);

                    for (const video of recentVideosFiltered) {
                        // 1. In-flight check
                        if (processingVideoIds.current.has(video.id)) {
                            console.log(`[Auto-Update] Video ${video.id} already processed/processing. Skipping.`);
                            continue;
                        }

                        // 2. State/DB Check (Check local letters state first for speed, but rely on DB ideally if state is stale)
                        // However, since state might be stale in this closure, we should fetch from DB for critical check or assume letters is somewhat updated.
                        // Better: Use a reliable check.

                        // Let's check DB for this specific video to be absolutely sure
                        const { data: existingDBLetters } = await supabase
                            .from('letters')
                            .select('id')
                            .eq('video_url', `https://www.youtube.com/watch?v=${video.id}`)
                            .eq('channel_id', channel.id);

                        const existsInDB = existingDBLetters && existingDBLetters.length > 0;
                        const existsInState = letters.some(l => l.videoUrl.includes(video.id) && l.channelId === channel.id);

                        if (!existsInDB && !existsInState) {
                            // Mark as processing immediately
                            processingVideoIds.current.add(video.id);

                            try {
                                const transcriptData = await fetchTranscript(video.id);
                                const transcriptText = transcriptData ? transcriptData.transcript : undefined;

                                if (transcriptData?.method === 'audio_fallback') {
                                    console.log(`[Auto-Update] Video ${video.title} required audio download fallback.`);
                                    // Could add a toast here if we had one
                                }

                                const summary = await generateQuickSummary(video.title, language || 'ja', transcriptText);

                                const newLetter: Letter = {
                                    id: crypto.randomUUID(),
                                    channelId: channel.id,
                                    title: video.title,
                                    videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
                                    thumbnailUrl: video.thumbnailUrl,
                                    summary: summary,
                                    date: video.date,
                                    isDeepDiveAvailable: false,
                                    isRead: false
                                };

                                await saveLetter(newLetter);
                                console.log(`Generated new letter for ${channel.name}: ${video.title}`);

                                // RATE LIMIT PROTECTION: Wait 5 seconds before next request
                                await new Promise(resolve => setTimeout(resolve, 5000));

                            } catch (err) {
                                console.error(`Failed to generate letter for ${video.id}. Likely missing transcript or API limit.`, err);
                                // Optional: remove from processing ref if failed to allow retry? 
                                // For now, keep it to prevent infinite error loops.
                            }
                        } else {
                            console.log(`[Auto-Update] Letter for ${video.title} already exists. Skipping.`);
                            // Add to processed set to skip strictly next time
                            processingVideoIds.current.add(video.id);
                        }
                    }
                }
            } catch (e) {
                console.error(`Error updating channel ${channel.id}`, e);
            }
        }
    };

    // Initial Auto-Check
    useEffect(() => {
        if (channels.length > 0 && session) {
            checkForUpdates();
        }
    }, [channels.length, session]); // Check when channels loaded

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
            // Ensure we have fallbacks for required fields
            name: channelInfo?.name || `Channel from ${url.substring(0, 15)}...`,
            avatarUrl: channelInfo?.avatarUrl || `https://picsum.photos/seed/${newId}/100/100`, // Ensure not null
            description: channelInfo?.description || 'Added via Briefly.',
            descriptionJa: undefined, // Will be set below after translation
            subscriberCount: channelInfo?.subscriberCount,
            customUrl: channelInfo?.customUrl,
            youtubeId: channelInfo?.youtubeId
        };

        // Translate description to Japanese if it's in English
        if (newChannel.description) {
            const hasJapanese = /[\u3040-\u30ff\u4e00-\u9fff]/.test(newChannel.description);
            if (!hasJapanese) {
                try {
                    const translatedDesc = await translateText(newChannel.description, 'ja');
                    newChannel.descriptionJa = translatedDesc;
                } catch (e) {
                    console.warn('Description translation failed:', e);
                }
            }
        }

        setChannels(prev => [...prev, newChannel]);
        setActiveView('inbox');
        setSelectedChannelId(newId);

        if (session && supabase) {
            const { error } = await supabase.from('channels').insert({
                id: newId,
                user_id: session.user.id,
                name: newChannel.name,
                avatar_url: newChannel.avatarUrl,
                description: newChannel.description,
                description_ja: newChannel.descriptionJa,
                subscriber_count: newChannel.subscriberCount,
                custom_url: newChannel.customUrl,
                youtube_id: newChannel.youtubeId
            });
            if (error) console.error("Error saving channel:", error);
        }

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
        // setLetters call removed as saveLetter handles it

        if (session && supabase) {
            // Use saveLetter helper
            await saveLetter(newLetter);
        }
    };

    const handleSignOut = () => {
        if (supabase) supabase.auth.signOut();
    };

    // Helper to get letters based on view
    const getFilteredLetters = () => {
        let filtered = letters;

        // 1. FILTER OUT TEMP LETTERS from standard views (Inbox, Today, Channel) (Generator handles its own history)
        if (activeView !== 'generator') {
            filtered = filtered.filter(l => l.channelId && l.channelId !== 'temp');
        }

        // 2. Filter by Channel if selected
        if (selectedChannelId) {
            filtered = filtered.filter(l => l.channelId === selectedChannelId);
        }

        // 3. Filter for Today View (Now Recent Letters: Today + Yesterday)
        if (activeView === 'today') {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const yesterdayStart = new Date(todayStart);
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);

            filtered = filtered.filter(l => new Date(l.date) >= yesterdayStart);
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


    const renderContent = () => {
        if (activeView === 'register') return <RegisterView onRegister={handleRegister} language={language} />;
        if (activeView === 'generator') return (
            <GeneratorView
                language={language}
                history={letters}
                onNewLetter={(newLetter) => {
                    // Check if it already exists to update instead of add
                    setLetters(prev => {
                        const exists = prev.find(l => l.id === newLetter.id);
                        if (exists) {
                            return prev.map(l => l.id === newLetter.id ? newLetter : l);
                        }
                        return [newLetter, ...prev];
                    });
                }}
                onUpdateLetter={handleUpdateLetter}
                onDeleteLetter={handleDeleteLetter}
            />
        );
        if (activeView === 'settings') return <SettingsView language={language} />;

        const isChannelView = activeView === 'channel' && selectedChannelId;
        const isTodayView = activeView === 'today';
        const currentChannel = isChannelView ? channels.find(c => c.id === selectedChannelId) : null;

        const getViewTitle = () => {
            if (isTodayView) return t.today;
            if (isChannelView) return currentChannel?.name || 'Unknown Channel';
            return t.letterBox;
        };

        const getViewSubtitle = () => {
            if (isTodayView) return t.todaysEdition;
            if (isChannelView) return t.channelArchive;
            return t.dailyDigest;
        };

        return (
            <div className="max-w-4xl mx-auto py-8 px-4 md:px-8">
                <div className="mb-12 border-b-2 border-ink pb-6 flex items-end justify-between">
                    <div>
                        <span className="block text-xs font-bold text-accent uppercase tracking-widest mb-2">
                            {getViewSubtitle()}
                        </span>
                        <h2 className="font-serif text-4xl md:text-5xl font-bold text-ink">
                            {getViewTitle()}
                        </h2>
                    </div>
                    <div className="text-stone-400 text-sm font-medium">
                        {language === 'ja'
                            ? new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).replace(/ /g, '')
                            : new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                        }
                    </div>
                </div>

                {/* SHOW LETTERS (Usually just Todays for Today View, or All mixed for Inbox) */}
                {/* Re-using existing sorting logic but filtered by view */}

                {/* Channel Header (Only for Channel View) */}
                {isChannelView && currentChannel && (
                    <div className="bg-white p-8 rounded-sm shadow-soft border border-stone-100 mb-8 animate-in slide-in-from-bottom-4 duration-700">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="w-24 h-24 rounded-full border-2 border-stone-100 p-1 flex-shrink-0">
                                {currentChannel.avatarUrl ?
                                    <img src={currentChannel.avatarUrl} alt={currentChannel.name} className="w-full h-full rounded-full object-cover" />
                                    : <div className="w-full h-full rounded-full bg-stone-100 flex items-center justify-center text-stone-300"><Inbox size={32} /></div>
                                }
                            </div>
                            <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-4 mb-2">
                                    <h1 className="font-serif text-3xl font-bold text-ink leading-tight">{currentChannel.name}</h1>
                                </div>
                                <div className="flex items-center gap-4 mb-4">
                                    {currentChannel.customUrl && (
                                        <a
                                            href={`https://youtube.com/${currentChannel.customUrl}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-accent text-sm font-bold hover:underline flex items-center"
                                        >
                                            <Youtube size={16} className="mr-1" /> {currentChannel.customUrl}
                                        </a>
                                    )}
                                    {currentChannel.subscriberCount && (
                                        <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                                            {(() => {
                                                const count = parseInt(currentChannel.subscriberCount);
                                                if (language === 'ja') {
                                                    if (count >= 100000000) return `チャンネル登録者数 ${(count / 100000000).toFixed(1).replace(/\.0$/, '')}億人`;
                                                    if (count >= 10000) return `チャンネル登録者数 ${(count / 10000).toFixed(1).replace(/\.0$/, '')}万人`;
                                                    return `チャンネル登録者数 ${count.toLocaleString()}人`;
                                                } else {
                                                    if (count >= 1000000) return `${(count / 1000000).toFixed(1).replace(/\.0$/, '')}M subscribers`;
                                                    if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K subscribers`;
                                                    return `${count.toLocaleString()} subscribers`;
                                                }
                                            })()}
                                        </span>
                                    )}
                                </div>
                                <p className="text-stone-600 text-sm leading-relaxed max-w-2xl">
                                    {(language === 'ja' && currentChannel.descriptionJa)
                                        ? currentChannel.descriptionJa
                                        : (currentChannel.description || 'No description available.')}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {filteredLetters.length > 0 ? (
                    <div className="space-y-8">
                        {filteredLetters.map(letter => (
                            <LetterCard key={letter.id} letter={letter} channel={channels.find(c => c.id === letter.channelId)} onUpdateLetter={handleUpdateLetter} onDelete={handleDeleteLetter} language={language} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white border border-dashed border-stone-300">
                        <Bell className="mx-auto text-stone-300 mb-4" size={48} />
                        <p className="text-stone-500 font-medium">{t.noLetters}</p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-paper font-sans">
            <Sidebar
                channels={channels}
                activeView={activeView}
                setActiveView={setActiveView}
                selectedChannelId={selectedChannelId}
                setSelectedChannelId={setSelectedChannelId}
                language={language}
                setLanguage={setLanguage}
                onSignOut={handleSignOut}
                onDeleteChannel={handleDeleteChannel}
            />
            <main className="flex-1 overflow-y-auto h-screen relative scroll-smooth">
                {!getCredential('GEMINI_API_KEY') && <div className="bg-accent text-white px-4 py-2 text-center text-sm font-medium sticky top-0 z-50">{t.apiKeyWarning}</div>}
                {!supabase && <div className="bg-stone-800 text-white px-4 py-2 text-center text-sm font-medium sticky top-0 z-40">{t.supabaseWarning}</div>}
                {renderContent()}
            </main>
        </div>
    );
}

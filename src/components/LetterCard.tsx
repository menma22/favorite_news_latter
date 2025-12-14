// LetterCard コンポーネント
import React, { useState } from 'react';
import type { Letter, Language } from '../types';
import { t } from '../lib/i18n';
import { generateDeepDive } from '../services/geminiService';
import { supabase } from '../lib/supabase';

interface LetterCardProps {
    letter: Letter;
    lang: Language;
    onDeepDiveGenerated: (letterId: string, content: string) => void;
}

const LetterCard: React.FC<LetterCardProps> = ({ letter, lang, onDeepDiveGenerated }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [deepDiveContent, setDeepDiveContent] = useState(letter.deep_dive_content || '');
    const [error, setError] = useState<string | null>(null);

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return lang === 'ja'
            ? date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
            : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const handleDeepDive = async () => {
        if (letter.is_deep_dive_available && deepDiveContent) {
            setShowModal(true);
            return;
        }

        setIsGenerating(true);
        setError(null);

        const result = await generateDeepDive(letter.video_url, letter.title, lang);

        if (result.success) {
            setDeepDiveContent(result.content);
            setShowModal(true);
            onDeepDiveGenerated(letter.id, result.content);

            // Supabaseに保存
            if (supabase) {
                await supabase
                    .from('letters')
                    .update({
                        deep_dive_content: result.content,
                        is_deep_dive_available: true,
                    })
                    .eq('id', letter.id);
            }
        } else {
            setError(result.error || 'Unknown error');
        }

        setIsGenerating(false);
    };

    const renderMarkdown = (content: string): React.ReactNode => {
        // 最低限のMarkdown変換
        const lines = content.split('\n');
        return lines.map((line, index) => {
            // 見出し
            if (line.startsWith('# ')) {
                return <h1 key={index}>{line.substring(2)}</h1>;
            }
            if (line.startsWith('## ')) {
                return <h2 key={index}>{line.substring(3)}</h2>;
            }
            if (line.startsWith('### ')) {
                return <h3 key={index}>{line.substring(4)}</h3>;
            }
            // 水平線
            if (line.trim() === '---') {
                return <hr key={index} />;
            }
            // リスト
            if (line.startsWith('- ')) {
                return <li key={index}>{line.substring(2)}</li>;
            }
            // 太字
            if (line.includes('**')) {
                const parts = line.split(/\*\*(.*?)\*\*/g);
                return (
                    <p key={index}>
                        {parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}
                    </p>
                );
            }
            // 通常のテキスト
            if (line.trim()) {
                return <p key={index}>{line}</p>;
            }
            return null;
        });
    };

    return (
        <>
            <article className="letter-card">
                <img
                    src={letter.thumbnail_url || `https://picsum.photos/seed/${letter.id}/640/360`}
                    alt={letter.title}
                    className="letter-thumbnail"
                />
                <div className="letter-content">
                    <div className="letter-channel">
                        <img
                            src={letter.channel_avatar || `https://picsum.photos/seed/${letter.channel_id}/48/48`}
                            alt={letter.channel_name || 'Channel'}
                            className="letter-channel-avatar"
                        />
                        <span className="letter-channel-name">{letter.channel_name || 'Channel'}</span>
                    </div>
                    <h3 className="letter-title">
                        <a href={letter.video_url} target="_blank" rel="noopener noreferrer">
                            {letter.title}
                        </a>
                    </h3>
                    <p className="letter-summary">{letter.summary}</p>
                    <p className="letter-date">{formatDate(letter.created_at)}</p>
                    {error && <p className="login-error">{error}</p>}
                    <div className="letter-actions">
                        <button
                            className={`deep-dive-btn ${isGenerating ? 'generating' : ''}`}
                            onClick={handleDeepDive}
                            disabled={isGenerating}
                        >
                            {isGenerating
                                ? t('generating', lang)
                                : letter.is_deep_dive_available && deepDiveContent
                                    ? t('readMore', lang)
                                    : t('generateDeepDive', lang)}
                        </button>
                    </div>
                </div>
            </article>

            {/* Deep Dive Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">{letter.title}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="deep-dive-content">{renderMarkdown(deepDiveContent)}</div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default LetterCard;

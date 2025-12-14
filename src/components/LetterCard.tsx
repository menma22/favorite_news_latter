import React, { useState } from 'react';
import { Letter, Channel } from '../types';
import { generateDeepDive } from '../services/geminiService';
import { FileText, Loader2, PlayCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Language, translations } from '../lib/i18n';

interface LetterCardProps {
    letter: Letter;
    channel?: Channel;
    language: Language;
    onUpdateLetter: (updatedLetter: Letter) => void;
}

const LetterCard: React.FC<LetterCardProps> = ({ letter, channel, language, onUpdateLetter }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const t = translations[language];

    const handleDeepDive = async () => {
        if (letter.deepDiveContent) {
            setIsExpanded(!isExpanded);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const content = await generateDeepDive(letter.videoUrl, language);
            onUpdateLetter({
                ...letter,
                deepDiveContent: content,
                isDeepDiveAvailable: true,
            });
            setIsExpanded(true);
        } catch (err) {
            setError(language === 'ja' ? "レポートの生成に失敗しました。" : "Failed to generate detailed report. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const formattedDate = new Date(letter.date).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className="bg-surface rounded-none border border-stone-200 shadow-soft overflow-hidden transition-all duration-300 hover:shadow-md mb-8 group">
            {/* Header Section */}
            <div className="p-6 md:p-8 relative">


                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                        {channel && (
                            <img src={channel.avatarUrl} alt={channel.name} className="w-8 h-8 rounded-full border border-stone-100 object-cover" />
                        )}
                        <div className="flex flex-col">
                            <span className="text-xs font-bold tracking-wider text-stone-500 uppercase">{channel?.name || 'Unknown Channel'}</span>
                            <span className="text-xs text-stone-400 font-medium">{formattedDate}</span>
                        </div>
                    </div>
                    <a href={letter.videoUrl} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-accent transition-colors">
                        <ExternalLink size={18} />
                    </a>
                </div>

                <h3 className="font-serif text-2xl md:text-3xl text-ink font-bold leading-tight mb-4">
                    {letter.title}
                </h3>

                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-1/3 flex-shrink-0">
                        <div className="relative aspect-video bg-stone-100 rounded-sm overflow-hidden group/image cursor-pointer">
                            {letter.thumbnailUrl ? (
                                <img src={letter.thumbnailUrl} alt={letter.title} className="w-full h-full object-cover transition-transform duration-700 group-hover/image:scale-105" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-stone-200 text-stone-400">
                                    <PlayCircle size={48} />
                                </div>
                            )}
                            <a href={letter.videoUrl} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover/image:bg-black/20 transition-colors">
                                <PlayCircle className="text-white opacity-90 group-hover/image:scale-110 transition-all duration-300" strokeWidth={1.5} size={56} />
                            </a>
                        </div>
                    </div>

                    <div className="w-full md:w-2/3 flex flex-col justify-between">
                        <p className="text-stone-600 leading-relaxed font-sans text-sm md:text-base mb-4">
                            {letter.summary}
                        </p>

                        <div className="flex items-center justify-between mt-4">
                            <button
                                onClick={handleDeepDive}
                                disabled={isLoading}
                                className="flex items-center space-x-2 text-ink hover:text-accent transition-colors disabled:opacity-50 group/btn"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <FileText size={18} />
                                )}
                                <span className="font-semibold text-sm tracking-wide">
                                    {letter.deepDiveContent ? (isExpanded ? t.closeReport : t.readReport) : t.generateDeepDive}
                                </span>
                                {letter.deepDiveContent && (
                                    isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100">
                        {error}
                    </div>
                )}
            </div>

            {/* Expanded Deep Dive Content */}
            {isExpanded && letter.deepDiveContent && (
                <div className="border-t border-stone-200 bg-[#FAFAFA] px-6 py-8 md:px-12 md:py-10 animate-in slide-in-from-top-4 duration-500">
                    <div className="prose prose-stone max-w-none markdown-content">
                        <ReactMarkdown>
                            {letter.deepDiveContent}
                        </ReactMarkdown>
                    </div>
                    <div className="mt-8 pt-6 border-t border-stone-200 flex justify-center">
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="text-stone-400 hover:text-ink text-sm font-medium tracking-widest uppercase transition-colors"
                        >
                            {t.closeReport}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LetterCard;

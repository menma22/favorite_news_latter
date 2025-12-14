// Gemini APIサービス
import { getCredential } from '../lib/credentials';
import type { Language } from '../types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateDeepDive = async (
    videoUrl: string,
    lang: Language,
    transcript?: string
): Promise<string> => {
    const apiKey = getCredential('GEMINI_API_KEY');

    if (!apiKey) {
        throw new Error(lang === 'ja'
            ? 'Gemini APIが設定されていません。.envファイルを確認してください。'
            : 'Gemini API is not configured. Please check your .env file.');
    }

    const transcriptContext = transcript 
        ? (lang === 'ja' ? `以下は動画の文字起こし（字幕）データです。これを基に記事を作成してください。\n\n${transcript.substring(0, 30000)}` : `Here is the transcript of the video. Please base your article on this.\n\n${transcript.substring(0, 30000)}`)
        : (lang === 'ja' ? '文字起こしデータが取得できませんでした。タイトルから推測して記事を作成してください。' : 'Transcript unavailable. Please infer from the title.');

    const prompt = lang === 'ja'
        ? `
以下のYouTube動画について、詳細な記事を作成してください。
URL: ${videoUrl}

${transcriptContext}

指示：
動画の内容を詳細に分析し、目次付きで、見やすい記事にしてください。
ハルシネーション（嘘の情報）を含まないよう、提供された文字起こしデータの内容を重視してください。

##出力の構造##

# 記事の目次

# 要約
動画の内容を要約して、動画の重要な所を瞬時に理解できるセクション

# 動画の全内容を含む記事部分
（内容を詳細に記述）
`
        : `
Please create a detailed article based on the following YouTube video.
URL: ${videoUrl}

${transcriptContext}

Instructions:
Analyze the video content in detail and create a readable article with a table of contents.
Prioritize the provided transcript data to avoid hallucinations.

## Output Structure ##

# Table of Contents using Article Links

# 🎯 Summary
A section summarizing the video content for instant understanding of the key points.

# 📖 Full Article Section containing Video Content
(Describe in detail)
`;

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: prompt,
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 8192,
                    },
                }),
            });

            if (response.status === 429) {
                retries++;
                const delay = Math.pow(2, retries) * 1000; // Exponential backoff: 2s, 4s, 8s
                console.warn(`Rate limit hit (429). Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`);
                await wait(delay);
                continue;
            }

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

            if (!generatedText) {
                throw new Error('Empty response from API');
            }

            return generatedText;
        } catch (error: any) {
            // RETHROW immediately if it's not a fetch error or check for network errors if needed
            // For now, if we exhausted retries or caught a non-429 error that we don't want to retry:
            if (retries >= maxRetries || (error.message && !error.message.includes('429'))) {
                throw error;
            }
        }
    }
    throw new Error('Failed to generate report after retries.');
};

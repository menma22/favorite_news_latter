// Gemini APIサービス
import { getCredential } from '../lib/credentials';
import type { Language } from '../types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-pro:generateContent';

export const generateDeepDive = async (
    videoUrl: string,
    lang: Language
): Promise<string> => {
    const apiKey = getCredential('GEMINI_API_KEY');

    if (!apiKey) {
        throw new Error(lang === 'ja'
            ? 'Gemini APIが設定されていません。.envファイルを確認してください。'
            : 'Gemini API is not configured. Please check your .env file.');
    }

    const prompt = lang === 'ja'
        ? `
以下のYouTube動画について、詳細な記事を作成してください。
URL: ${videoUrl}

与えられたURLの動画を文字起こしし、全文の内容を漏らさず含んだうえで、目次付きで、見やすい記事にして
タイムスタンプもつけて

##出力の構造##

# 記事の目次

# 要約
動画の内容を要約して、動画の重要な所を瞬時に理解できるセクション

# 動画の全内容を含む記事部分
（全文の内容を漏らさず、タイムスタンプ付きで詳細に記述）
`
        : `
Please create a detailed article based on the following YouTube video.
URL: ${videoUrl}

Transcribe the video from the given URL, include the full content without omissions, and create a readable article with a table of contents and timestamps.

## Output Structure ##

# Table of Contents using Article Links

# 🎯 Summary
A section summarizing the video content for instant understanding of the key points.

# 📖 Full Article Section containing Video Content
(Describe in detail with timestamps, ensuring no content is omitted)
`;

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
                maxOutputTokens: 4096,
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!generatedText) {
        throw new Error('Empty response from API');
    }

    return generatedText;
};

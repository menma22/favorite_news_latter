// Gemini APIサービス
import { GEMINI_API_KEY, isGeminiConfigured } from '../lib/credentials';
import type { Language } from '../types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export interface DeepDiveResult {
    success: boolean;
    content: string;
    error?: string;
}

export const generateDeepDive = async (
    videoUrl: string,
    videoTitle: string,
    lang: Language
): Promise<DeepDiveResult> => {
    if (!isGeminiConfigured()) {
        return {
            success: false,
            content: '',
            error: lang === 'ja'
                ? 'Gemini APIが設定されていません。.envファイルを確認してください。'
                : 'Gemini API is not configured. Please check your .env file.',
        };
    }

    const prompt = lang === 'ja'
        ? `
以下のYouTube動画について、詳細なレポートを作成してください。

動画URL: ${videoUrl}
動画タイトル: ${videoTitle}

以下の形式で出力してください：

# 📋 目次

（各セクションへのリンク）

---

# 🎯 要約

動画の重要なポイントを簡潔にまとめてください。箇条書きで3-5点程度。

---

# 📖 詳細レポート

## セクション1: [タイトル]
**⏱️ タイムスタンプ: 0:00 - X:XX**

詳細な内容...

## セクション2: [タイトル]
**⏱️ タイムスタンプ: X:XX - Y:YY**

詳細な内容...

（セクションは動画の内容に応じて適切な数で区切ってください）

---

# 💡 まとめ

動画全体の結論や学びをまとめてください。
`
        : `
Please create a detailed report about the following YouTube video.

Video URL: ${videoUrl}
Video Title: ${videoTitle}

Please output in the following format:

# 📋 Table of Contents

(Links to each section)

---

# 🎯 Summary

Summarize the key points of the video concisely. About 3-5 bullet points.

---

# 📖 Detailed Report

## Section 1: [Title]
**⏱️ Timestamp: 0:00 - X:XX**

Detailed content...

## Section 2: [Title]
**⏱️ Timestamp: X:XX - Y:YY**

Detailed content...

(Divide sections appropriately based on the video content)

---

# 💡 Conclusion

Summarize the overall conclusion and learnings from the video.
`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
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

        return {
            success: true,
            content: generatedText,
        };
    } catch (error) {
        console.error('Gemini API error:', error);
        return {
            success: false,
            content: '',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
    }
};

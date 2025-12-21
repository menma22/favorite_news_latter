// Gemini APIサービス
import { getCredential } from '../lib/credentials';
import type { Language } from '../types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Common request logic
const callGemini = async (prompt: string, apiKey: string, retries = 0): Promise<string> => {
    const maxRetries = 3;
    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
            }),
        });

        if (response.status === 429) {
            retries++;
            const delay = Math.pow(2, retries) * 1000;
            console.warn(`Rate limit hit (429). Retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`);
            await wait(delay);
            return callGemini(prompt, apiKey, retries);
        }

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!text) throw new Error('Empty response from API');
        return text;

    } catch (error: any) {
        if (retries < maxRetries && (!error.message || !error.message.includes('429'))) {
            // Optional: retry logic for other errors if needed, for now just rethrow
            throw error;
        }
        throw error;
    }
};

export const generateQuickSummary = async (
    title: string,
    lang: Language,
    transcript?: string
): Promise<string> => {
    const apiKey = getCredential('GEMINI_API_KEY');
    if (!apiKey) return lang === 'ja' ? 'APIキーが設定されていません。' : 'API Key missing.';

    const inputData = transcript ? transcript.substring(0, 5000) : `Title: ${title}`;

    const prompt = lang === 'ja'
        ? `
        以下の動画内容（またはタイトル）を基に、200文字以内で簡潔に要約してください。
        重要なポイントを箇条書きではなく、文章でまとめてください。
        
        入力データ:
        ${inputData}
        `
        : `
        Summarize the following video content (or title) concisely in under 200 characters.
        Do not use bullet points; write as a cohesive sentence or two.
        
        Input Data:
        ${inputData}
        `;

    return callGemini(prompt, apiKey);
};

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
動画の内容を詳細に分析し、**目次（リンク付き）**を含めた、見やすいMarkdownフォーマットの要約ではない完全な内容を含む構造化された記事にしてください。
目次は \`[タイトル](#id)\` そのものではなく、Markdownの標準的な見出し構成を作れば、表示側で自動的にリンクされます。
ただし、必ず「# 目次」というセクションを冒頭に作成し、記事内の各見出し（##）へのリンクリストを作成してください。
記述リンク例: \`- [内容](#内容)\`

ハルシネーション（嘘の情報）を含まないよう、提供された文字起こしデータの内容のみを忠実に再現してください。
また、この指示に対する記事とは関係のない返答はなしで、いきなり記事から始まる文章を出力してください。
## 出力の構造 ##

# 目次
-ここに記事内の各見出しへのリンクを記載

# （動画のテーマごとの見出し）
内容を詳細に記述...
`
        : `
Please create a detailed article based on the following YouTube video.
URL: ${videoUrl}

${transcriptContext}

Instructions:
Analyze the video content in detail and create a readable Markdown article.
Include a **Table of Contents** at the beginning.
Strictly adhere to the provided transcript data.

## Output Structure ##

# Table of Contents
(List links to the sections below, e.g., \`- [Summary](#summary)\`)

# Summary
A section summarizing the video content for instant understanding.

# (Thematic Headings)
Describe in detail...
`;

    return callGemini(prompt, apiKey);
};

/**
 * Translates text to the target language using Gemini API.
 * Used for translating channel descriptions etc.
 */
export const translateText = async (
    text: string,
    targetLang: Language
): Promise<string> => {
    const apiKey = getCredential('GEMINI_API_KEY');
    if (!apiKey) return text; // Return original if no API key

    // Skip translation if text is empty or already in target language patterns
    if (!text || text.trim().length === 0) return text;

    const prompt = targetLang === 'ja'
        ? `
以下の英語テキストを自然な日本語に翻訳してください。
絵文字はそのまま残してください。
メールアドレスやURLはそのまま残してください。
翻訳のみを出力し、余計な説明を加えないでください。

テキスト:
${text}
        `
        : `
Translate the following text to natural English.
Keep emojis as-is.
Keep email addresses and URLs as-is.
Output only the translation, no extra explanation.

Text:
${text}
        `;

    try {
        return await callGemini(prompt, apiKey);
    } catch (error) {
        console.error('Translation failed:', error);
        return text; // Return original on error
    }
};

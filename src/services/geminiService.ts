// Gemini APIサービス
import { getCredential } from '../lib/credentials';
import type { Language } from '../types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Throttling configuration
const MIN_INTERVAL = 4000; // 4 seconds between calls
let lastCallTime = 0;
let requestQueue = Promise.resolve();

// Helper: Common request logic
const callGemini = (prompt: string, apiKey: string, retries = 0): Promise<string> => {
    // Wrap in queue to serialize requests
    return new Promise((resolve, reject) => {
        requestQueue = requestQueue.then(async () => {
            const now = Date.now();
            const timeSinceLast = now - lastCallTime;

            if (timeSinceLast < MIN_INTERVAL) {
                const waitTime = MIN_INTERVAL - timeSinceLast;
                console.log(`[Gemini] Throttling: Waiting ${waitTime}ms...`);
                await wait(waitTime);
            }

            try {
                const result = await executeCallGemini(prompt, apiKey, retries);
                lastCallTime = Date.now(); // Update timestamp AFTER execution starts (or finishes?)
                // Updating after finish is safer for rate limits that count "in-flight" or "per minute".
                // But strict "interval between starts" is often what RPM implies.
                // Let's update `lastCallTime` here to ensure *spacing*.
                // Actually, if we update it after, the gap is "End of A" to "Start of B".
                // If we update it before, the gap is "Start of A" to "Start of B".
                // Let's do "End of A" to "Start of B" to be safer.
                lastCallTime = Date.now();
                resolve(result);
            } catch (error) {
                lastCallTime = Date.now(); // Ensure we still cooldown after error
                reject(error);
            }
        }).catch(err => {
            // Catch queue errors if any, though the inner try/catch handles the logical ones
            reject(err);
        });
    });
};

const executeCallGemini = async (prompt: string, apiKey: string, retries = 0): Promise<string> => {
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
            return executeCallGemini(prompt, apiKey, retries);
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
内容は細かな部分まで動画の文字起こしの内容を反映させ、絶対に省略したりしないでください。動画を見ているときと同じ情報量を得られることが目的だからです。

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

// --- NEW Single-Pass Generation ---
export const generateFullContent = async (
    videoUrl: string,
    title: string,
    lang: Language,
    transcript?: string
): Promise<{ summary: string; deepDive: string }> => {
    const apiKey = getCredential('GEMINI_API_KEY');
    if (!apiKey) throw new Error('API Key missing');

    const inputData = transcript
        ? (lang === 'ja' ? `以下は動画の文字起こし（字幕）データです。\n\n${transcript.substring(0, 50000)}` : `Here is the transcript of the video.\n\n${transcript.substring(0, 50000)}`)
        : `Title: ${title}\nURL: ${videoUrl}\n(No transcript available, infer from title)`;

    const systemInstruction = lang === 'ja'
        ? `
        あなたは優秀な編集者です。また、JSONのみを出力するAPIでもあります。
        提供された動画データ（字幕またはタイトル）を分析し、以下の2つを生成してください。
        
        1. **summary**: 200文字以内の簡潔な要約（箇条書き不可）。
        2. **deepDive**: 詳細なブログ記事（Markdown形式）。目次を含み、見出し構成をしっかり作る。

        出力は**必ず以下のJSON形式**で、それ以外の文字列（マークダウンの囲み \`\`\`json 等）は極力含めないでください（含んでも良いが、パース可能なこと）。

        Format:
        {
            "summary": "要約テキスト...",
            "deepDive": "# 目次\\n- [項目](#id)...\\n\\n# 見出し..."
        }
        `
        : `
        You are an expert editor and a JSON API.
        Analyze the provided video data and generate two items:
        1. **summary**: Concise summary under 200 characters (no bullet points).
        2. **deepDive**: Detailed blog post in Markdown format with Table of Contents.

        Output **ONLY valid JSON** in the following format:
        {
            "summary": "Summary text...",
            "deepDive": "# Table of Contents\\n..."
        }
        `;

    const prompt = `
    ${systemInstruction}

    [Input Data]
    ${inputData}
    `;

    const jsonString = await callGemini(prompt, apiKey);

    // Parse JSON (handle potential markdown code blocks)
    try {
        const cleanJson = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("JSON Parse Error", e);
        console.log("Raw Output:", jsonString);
        // Fallback: If parsing fails, try to return raw text as summary, empty deep dive
        return { summary: jsonString.substring(0, 200) + '...', deepDive: jsonString };
    }
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

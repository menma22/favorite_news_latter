VagabondsCamp
---

## AI Agent Guidelines (AIエージェントへの指示)

このプロジェクトでの開発支援を行う際は、以下のルールを厳守してください：

1. **言語設定:** Implementation Plan（実装計画）、Task List、および解説コメントは、**必ず日本語で**記述してください。
2. **コード:** 変数名や関数名は英語で構いませんが、コメントアウトによる説明が必要な場合は日本語を使用してください。




### Code Modification Guidelines (コード変更指針)

新機能を追加する際は、以下の優先順位に従ってください：

1. **新規コンポーネントの作成を優先:**
   既存のファイルが肥大化・複雑化するのを防ぐため、新しい機能は可能な限り新しいファイル/コンポーネントとして作成してください。
   
2. **既存コードの変更:**
   新しいコンポーネントを統合するため（例: 親コンポーネントでのimportや配置）、あるいは共通ロジックの修正が必要な場合は、既存のコードを変更しても構いません。

目標は、**「疎結合で管理しやすい構成」**を維持することです。




### Documentation & Reporting Standards (報告品質ガイドライン)

タスク完了時やプルリクエスト作成時の説明（Walkthrough）には、以下の構成を必ず含めてください：

1. **Detailed Technical Explanation (技術的・概念的な詳細解説):**
   単なる変更点の羅列ではなく、以下の観点を含めた深い解説を行ってください。
   - **概念 (Concept):** なぜこのアプローチを採用したのか？アーキテクチャ上の意図は何か？
   - **技術詳細 (Technical):** データフローはどう変化したか？主要な関数やロジックは具体的にどう動作するか？既存コンポーネントとどう連携しているか？

2. **New Files Manifest (新規作成ファイル一覧):**
   今回新しく作成されたファイルを、以下の形式でリストアップしてください。
   - `src/components/NewFeature.tsx`: [ファイルの役割を一言で]
   - `src/hooks/useNewLogic.ts`: [ファイルの役割を一言で]


## 🤖 AI Agent Guidelines (Commit Strategy)

このプロジェクトでは、AIによるコード編集のたびに**Atomic Commit（微細な変更ごとのコミット）**を求めています。

**ルール:**
1. **変更即コミット**: コードの修正、リファクタリング、機能追加を行ったら、タスクが完全に完了していなくても、論理的な区切りごとに必ず `git commit` を行ってください。
2. **コミットメッセージ**: 変更内容が具体的にわかるメッセージを記述してください（例: `fix: handle null case in auth`）。
3. **溜め込まない**: 複数の異なる変更を1つのコミットにまとめないでください。

---
**For AI Assistant:**
Please git commit immediately after every single change or logical step. Do not batch multiple changes into one commit.


# Supabase Database Setup & Maintenance Guide

This document outlines the database schema for the Briefly application and provides guidelines for maintaining it as the application evolves.

## 🚨 Critical Philosophy
**"Code and Database must grow together."**
Whenever you add a new field to `src/types.ts` or expect new data to be saved in the application, **you MUST update the Supabase database schema.** If you don't, the data will simply vanish without an error, or the application will crash.

### Workflow for adding new data
1.  **Update Frontend Code**: Add the field to `types.ts` (e.g., `new_feature_flag: boolean`).
2.  **Write SQL Migration**: Create a SQL command to update the database.
    ```sql
    ALTER TABLE letters ADD COLUMN new_feature_flag BOOLEAN DEFAULT FALSE;
    ```
3.  **Execute in Supabase**: Run the SQL in the Supabase SQL Editor.

---

## 🛠️ Current Schema (Setup Script)

Copy and run this entire script in the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql) to set up or repair your database.

> **Note**: If you see a warning "Destructive operation", it is expected because this script uses `DROP POLICY` to ensure permissions are reset correctly. **Please proceed.**

```sql
-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create/Update Tables

-- Channels Table
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    avatar_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Letters Table
CREATE TABLE IF NOT EXISTS letters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    summary TEXT,
    date TIMESTAMP WITH TIME ZONE, -- Critical for sorting/display
    is_deep_dive_available BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    deep_dive_content TEXT, -- Markown content for reports
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Safety: Add columns if they are missing (Idempotent)
ALTER TABLE letters ADD COLUMN IF NOT EXISTS date TIMESTAMP WITH TIME ZONE;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS deep_dive_content TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE letters ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

-- 5. Reset Policies (Fixes "Policy already exists" errors)
-- We drop all policies first to ensure a clean slate.

DROP POLICY IF EXISTS "Users can view their own channels" ON channels;
DROP POLICY IF EXISTS "Users can insert their own channels" ON channels;
DROP POLICY IF EXISTS "Users can update their own channels" ON channels;
DROP POLICY IF EXISTS "Users can delete their own channels" ON channels;
DROP POLICY IF EXISTS "Users can select their own channels" ON channels;

DROP POLICY IF EXISTS "Users can view their own letters" ON letters;
DROP POLICY IF EXISTS "Users can insert their own letters" ON letters;
DROP POLICY IF EXISTS "Users can update their own letters" ON letters;
DROP POLICY IF EXISTS "Users can delete their own letters" ON letters;
DROP POLICY IF EXISTS "Users can select their own letters" ON letters;

-- 6. Create Policies (Users can only access their own data)

-- Channels Policies
CREATE POLICY "Users can select their own channels" ON channels FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own channels" ON channels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own channels" ON channels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own channels" ON channels FOR DELETE USING (auth.uid() = user_id);

-- Letters Policies
CREATE POLICY "Users can select their own letters" ON letters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own letters" ON letters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own letters" ON letters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own letters" ON letters FOR DELETE USING (auth.uid() = user_id);
```

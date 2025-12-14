import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './credentials';

// Supabaseクライアントを作成
// 設定が無効な場合でもエラーを出さないようにダミー値で初期化
let supabase: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export { supabase, isSupabaseConfigured };

// ========================================
// Supabaseセットアップ用SQLスクリプト
// ========================================
// 以下のSQLをSupabaseのSQL Editorで実行してください：
/*

-- UUIDの有効化
create extension if not exists "uuid-ossp";

-- チャンネルテーブルの作成
create table channels (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  avatar_url text,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- レターテーブルの作成
create table letters (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  channel_id uuid references channels(id) on delete cascade,
  title text not null,
  video_url text not null,
  thumbnail_url text,
  summary text,
  deep_dive_content text,
  is_deep_dive_available boolean default false,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) の有効化
alter table channels enable row level security;
alter table letters enable row level security;

-- ポリシーの作成
create policy "Users can view their own channels" on channels
  for select using (auth.uid() = user_id);
create policy "Users can insert their own channels" on channels
  for insert with check (auth.uid() = user_id);
create policy "Users can delete their own channels" on channels
  for delete using (auth.uid() = user_id);

create policy "Users can view their own letters" on letters
  for select using (auth.uid() = user_id);
create policy "Users can insert their own letters" on letters
  for insert with check (auth.uid() = user_id);
create policy "Users can update their own letters" on letters
  for update using (auth.uid() = user_id);
create policy "Users can delete their own letters" on letters
  for delete using (auth.uid() = user_id);

*/

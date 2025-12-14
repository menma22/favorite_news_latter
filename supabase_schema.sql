-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create channels table
create table channels (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  avatar_url text,
  description text,
  created_at timestamp with time zone default now()
);

-- Create letters table
create table letters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  channel_id uuid references channels(id) on delete cascade not null,
  title text not null,
  video_url text not null,
  thumbnail_url text,
  summary text,
  deep_dive_content text,
  is_deep_dive_available boolean default false,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
alter table channels enable row level security;
alter table letters enable row level security;

-- Create policies for channels
create policy "Users can translate their own channels"
  on channels for all
  using (auth.uid() = user_id);

-- Create policies for letters
create policy "Users can translate their own letters"
  on letters for all
  using (auth.uid() = user_id);

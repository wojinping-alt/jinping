create table if not exists public.course_episodes (
  id bigserial primary key,
  course_id bigint not null,
  episode_number integer not null,
  title text not null,
  video_url text not null,
  vod_file_id text,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create unique index if not exists course_episodes_course_id_episode_number_key
  on public.course_episodes (course_id, episode_number);

create index if not exists course_episodes_course_id_idx
  on public.course_episodes (course_id);

alter table public.courses
  add column if not exists cover_url text;

insert into public.courses (id, title, description, price, video_url, is_free_preview)
values
  (
    101,
    '一字千金——文字构形与书法造型Q1',
    '一字千金——文字构形与书法造型Q1 付费视频合集，购买后可观看全部集数。',
    0.01,
    '',
    false
  ),
  (
    102,
    '一字千金——文字构形与书法造型Q2',
    '一字千金——文字构形与书法造型Q2 付费视频合集，购买后可观看全部集数。',
    0.01,
    '',
    false
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  price = excluded.price,
  is_free_preview = excluded.is_free_preview;

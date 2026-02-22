-- Run this in Supabase SQL editor
create table if not exists caregiver_users (
  username text primary key,
  created_at timestamptz default now()
);

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  shared_by text not null references caregiver_users(username),
  created_at timestamptz default now()
);

create table if not exists child_access (
  child_id uuid not null references children(id) on delete cascade,
  username text not null references caregiver_users(username) on delete cascade,
  created_at timestamptz default now(),
  primary key (child_id, username)
);

create table if not exists schedules (
  child_id uuid not null references children(id) on delete cascade,
  schedule_date date not null,
  data jsonb not null,
  updated_at timestamptz default now(),
  primary key (child_id, schedule_date)
);

create table if not exists edit_logs (
  id bigint generated always as identity primary key,
  child_id uuid not null references children(id) on delete cascade,
  schedule_date date not null,
  username text not null references caregiver_users(username),
  message text not null,
  created_at timestamptz default now()
);

create index if not exists idx_edit_logs_child_date on edit_logs(child_id, schedule_date, created_at desc);

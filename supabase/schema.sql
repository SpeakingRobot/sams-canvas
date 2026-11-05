-- Run once in your Supabase SQL Editor. No public access to workspace records.
create table if not exists public.creator_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  revision uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);
alter table public.creator_workspaces enable row level security;
revoke all on public.creator_workspaces from anon;
grant select, insert, update, delete on public.creator_workspaces to authenticated;
drop policy if exists "Read own workspace" on public.creator_workspaces;
create policy "Read own workspace" on public.creator_workspaces for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Insert own workspace" on public.creator_workspaces;
create policy "Insert own workspace" on public.creator_workspaces for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Update own workspace" on public.creator_workspaces;
create policy "Update own workspace" on public.creator_workspaces for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Delete own workspace" on public.creator_workspaces;
create policy "Delete own workspace" on public.creator_workspaces for delete to authenticated using ((select auth.uid()) = user_id);
create or replace function public.touch_creator_workspace() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists creator_workspace_updated on public.creator_workspaces;
create trigger creator_workspace_updated before update on public.creator_workspaces for each row execute function public.touch_creator_workspace();

-- Run after collaboration.sql. Links grant edit access to signed-in accounts.
begin;
create table if not exists public.canvas_invite_links (
 room_id uuid primary key references public.canvas_rooms(id) on delete cascade,
 token_hash text not null unique,
 expires_at timestamptz not null
);
alter table public.canvas_invite_links enable row level security;
revoke all on public.canvas_invite_links from public,anon,authenticated;

create or replace function public.create_canvas_invite(target uuid)
returns text language plpgsql security definer set search_path='' as $$
declare token text;
begin
 if not exists(select 1 from public.canvas_rooms where id=target and owner_id=auth.uid()) then raise exception 'Only the owner can create invite links'; end if;
 token:=replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
 insert into public.canvas_invite_links values(target,encode(sha256(convert_to(token,'UTF8')),'hex'),now()+interval '7 days')
 on conflict(room_id) do update set token_hash=excluded.token_hash,expires_at=excluded.expires_at;
 return token;
end; $$;
create or replace function public.disable_canvas_invite(target uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.canvas_rooms where id=target and owner_id=auth.uid()) then raise exception 'Only the owner can disable invite links'; end if;
 delete from public.canvas_invite_links where room_id=target;
end; $$;
create or replace function public.join_canvas_invite(invite_token text)
returns setof public.canvas_rooms language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if auth.uid() is null then raise exception 'Sign in to join a shared canvas'; end if;
 if invite_token !~ '^[a-f0-9]{64}$' then raise exception 'This invite link is invalid or expired'; end if;
 select room_id into target from public.canvas_invite_links where token_hash=encode(sha256(convert_to(invite_token,'UTF8')),'hex') and expires_at>now() for share;
 if target is null then raise exception 'This invite link is invalid or expired'; end if;
 insert into public.canvas_members values(target,auth.uid()) on conflict do nothing;
 return query select * from public.canvas_rooms where id=target;
end; $$;
revoke all on function public.create_canvas_invite(uuid),public.disable_canvas_invite(uuid),public.join_canvas_invite(text) from public,anon;
grant execute on function public.create_canvas_invite(uuid),public.disable_canvas_invite(uuid),public.join_canvas_invite(text) to authenticated;
commit;

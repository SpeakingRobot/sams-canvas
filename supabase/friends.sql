-- Run once after collaboration-setup.sql. Friends do not grant access to any canvas.
begin;
create table if not exists public.canvas_friends (
  low_id uuid references auth.users(id) on delete cascade,
  high_id uuid references auth.users(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','accepted')),
  primary key(low_id, high_id), check(low_id < high_id),
  check(requested_by in (low_id,high_id))
);
alter table public.canvas_friends enable row level security;
revoke all on public.canvas_friends from anon, authenticated;

create or replace function public.list_canvas_friends()
returns table(peer_id uuid,peer_name text,status text,incoming boolean)
language sql stable security definer set search_path='' as $$
  select u.id,coalesce(nullif(u.raw_user_meta_data->>'display_name',''),split_part(u.email,'@',1),'Creator'),f.status,f.requested_by<>auth.uid()
  from public.canvas_friends f join auth.users u on u.id=case when f.low_id=auth.uid() then f.high_id else f.low_id end
  where auth.uid() in(f.low_id,f.high_id);
$$;

create or replace function public.manage_canvas_friend(action text,peer uuid,canvas uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); low uuid:=least(me,peer); high uuid:=greatest(me,peer);
begin
  if me is null or peer is null or peer=me then raise exception 'Choose another signed-in collaborator'; end if;
  if action='request' then
    if not public.can_access_canvas(canvas) or not (
      exists(select 1 from public.canvas_rooms where id=canvas and owner_id=peer) or
      exists(select 1 from public.canvas_members where room_id=canvas and user_id=peer)
    ) then raise exception 'Add friends from a canvas you both share'; end if;
    insert into public.canvas_friends(low_id,high_id,requested_by) values(low,high,me) on conflict do nothing;
  elsif action='accept' then
    update public.canvas_friends set status='accepted' where low_id=low and high_id=high and requested_by<>me;
    if not found then raise exception 'No incoming friend request'; end if;
  elsif action='remove' then
    delete from public.canvas_friends where low_id=low and high_id=high;
  else raise exception 'Unknown friend action'; end if;
end; $$;

create or replace function public.can_use_friend_presence(topic text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare low uuid; high uuid;
begin
  if topic !~ '^friends:[0-9a-f-]{36}:[0-9a-f-]{36}$' then return false; end if;
  begin low:=split_part(topic,':',2)::uuid; high:=split_part(topic,':',3)::uuid;
  exception when invalid_text_representation then return false; end;
  return auth.uid() in(low,high) and exists(select 1 from public.canvas_friends where low_id=low and high_id=high and status='accepted');
end; $$;
revoke all on function public.list_canvas_friends(),public.manage_canvas_friend(text,uuid,uuid),public.can_use_friend_presence(text) from public,anon;
grant execute on function public.list_canvas_friends(),public.manage_canvas_friend(text,uuid,uuid),public.can_use_friend_presence(text) to authenticated;
drop policy if exists "Friend presence read" on realtime.messages;
create policy "Friend presence read" on realtime.messages for select to authenticated using(public.can_use_friend_presence(realtime.topic()));
drop policy if exists "Friend presence write" on realtime.messages;
create policy "Friend presence write" on realtime.messages for insert to authenticated with check(public.can_use_friend_presence(realtime.topic()));
commit;

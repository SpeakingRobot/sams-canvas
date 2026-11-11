-- Run once in the Supabase SQL editor after schema.sql.
-- Shared boards are separate from private account workspaces.
begin;
create table if not exists public.canvas_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  payload jsonb not null,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.canvas_members (
  room_id uuid references public.canvas_rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  primary key (room_id,user_id)
);
create table if not exists public.canvas_receipts (
  room_id uuid references public.canvas_rooms(id) on delete cascade,
  operation_id uuid not null,
  primary key (room_id,operation_id)
);
alter table public.canvas_rooms enable row level security;
alter table public.canvas_members enable row level security;
alter table public.canvas_receipts enable row level security;
revoke all on public.canvas_rooms,public.canvas_members,public.canvas_receipts from anon,authenticated;
grant select on public.canvas_rooms,public.canvas_members to authenticated;

create or replace function public.can_access_canvas(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.canvas_rooms r where r.id=target and r.owner_id=auth.uid())
    or exists(select 1 from public.canvas_members m where m.room_id=target and m.user_id=auth.uid());
$$;
revoke all on function public.can_access_canvas(uuid) from public,anon;
grant execute on function public.can_access_canvas(uuid) to authenticated;
drop policy if exists "Read shared canvas" on public.canvas_rooms;
create policy "Read shared canvas" on public.canvas_rooms for select to authenticated using(public.can_access_canvas(id));
drop policy if exists "Read canvas members" on public.canvas_members;
create policy "Read canvas members" on public.canvas_members for select to authenticated using(public.can_access_canvas(room_id));

create or replace function public.create_canvas_room(board_title text, initial_payload jsonb)
returns setof public.canvas_rooms language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to share a canvas'; end if;
  if jsonb_typeof(initial_payload) <> 'object' or initial_payload->'board'->>'id' is null
    or jsonb_typeof(initial_payload->'nodes') <> 'array' then raise exception 'Invalid canvas'; end if;
  if octet_length(initial_payload::text)>20000000 then raise exception 'Canvas exceeds the 20 MB sharing limit'; end if;
  return query insert into public.canvas_rooms(title,payload) values(left(board_title,120),initial_payload) returning *;
end; $$;

create or replace function public.invite_canvas_member(target uuid, member_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare member_id uuid;
begin
  if not exists(select 1 from public.canvas_rooms where id=target and owner_id=auth.uid()) then raise exception 'Only the owner can invite collaborators'; end if;
  select id into member_id from auth.users where lower(email)=lower(trim(member_email));
  if member_id is null then raise exception 'Ask this person to create a Sam''s Canvas account first'; end if;
  insert into public.canvas_members(room_id,user_id) values(target,member_id) on conflict do nothing;
end; $$;

create or replace function public.remove_canvas_member(target uuid, member_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.canvas_rooms where id=target and owner_id=auth.uid()) and member_id<>auth.uid() then raise exception 'Only the owner can remove another collaborator'; end if;
  delete from public.canvas_members where room_id=target and user_id=member_id;
end; $$;

-- Apply changes to individual properties, rather than replacing the whole board.
-- The row lock orders writes; operation receipts make retried requests idempotent.
create or replace function public.edit_canvas_room(target uuid, operation_id uuid, changes jsonb)
returns setof public.canvas_rooms language plpgsql security definer set search_path = '' as $$
declare doc jsonb; op jsonb; kind text; item jsonb; updated jsonb; found_item boolean; props jsonb;
begin
  if not public.can_access_canvas(target) then raise exception 'You no longer have access to this canvas'; end if;
  if jsonb_typeof(changes)<>'array' or jsonb_array_length(changes)>3000 or octet_length(changes::text)>20000000 then raise exception 'Invalid canvas changes'; end if;
  select payload into doc from public.canvas_rooms where id=target for update;
  if exists(select 1 from public.canvas_receipts c where c.room_id=target and c.operation_id=edit_canvas_room.operation_id) then
    return query select * from public.canvas_rooms where id=target; return;
  end if;
  for op in select * from jsonb_array_elements(changes) loop
    kind:=op->>'collection';
    if kind not in ('board','nodes','edges','strokes','topics','sequences') then raise exception 'Unknown canvas collection'; end if;
    props:=coalesce(op->'props','{}'::jsonb);
    if jsonb_typeof(props)<>'object' then raise exception 'Invalid properties'; end if;
    if kind='board' then doc:=jsonb_set(doc,'{board}',(doc->'board') || (props-'id'-'sharedRoom'));
    else
      updated:='[]'::jsonb; found_item:=false;
      for item in select * from jsonb_array_elements(coalesce(doc->kind,'[]'::jsonb)) loop
        if item->>'id'=op->>'id' then
          found_item:=true;
          if coalesce((op->>'remove')::boolean,false) then continue; end if;
          item:=item || (props-'id');
          if op ? 'unset' then item:=item-ARRAY(select jsonb_array_elements_text(op->'unset')); end if;
        end if;
        updated:=updated || jsonb_build_array(item);
      end loop;
      if not found_item and not coalesce((op->>'remove')::boolean,false) and op ? 'create' then
        updated:=updated || jsonb_build_array((op->'create') || jsonb_build_object('id',op->>'id'));
      end if;
      doc:=jsonb_set(doc,ARRAY[kind],updated);
    end if;
  end loop;
  if octet_length(doc::text)>20000000 then raise exception 'Canvas exceeds the 20 MB sharing limit'; end if;
  insert into public.canvas_receipts values(target,operation_id);
  return query update public.canvas_rooms set payload=doc,title=left(doc->'board'->>'title',120),revision=revision+1,updated_at=now() where id=target returning *;
end; $$;

revoke all on function public.create_canvas_room(text,jsonb),public.invite_canvas_member(uuid,text),public.remove_canvas_member(uuid,uuid),public.edit_canvas_room(uuid,uuid,jsonb) from public,anon;
grant execute on function public.create_canvas_room(text,jsonb),public.invite_canvas_member(uuid,text),public.remove_canvas_member(uuid,uuid),public.edit_canvas_room(uuid,uuid,jsonb) to authenticated;

-- Private Presence and Broadcast channels. No anonymous room subscriptions.
drop policy if exists "Canvas realtime read" on realtime.messages;
create policy "Canvas realtime read" on realtime.messages for select to authenticated using (
  case when realtime.topic() ~ '^canvas:[0-9a-f-]{36}$' then public.can_access_canvas(substring(realtime.topic() from 8)::uuid) else false end
);
drop policy if exists "Canvas realtime write" on realtime.messages;
create policy "Canvas realtime write" on realtime.messages for insert to authenticated with check (
  case when realtime.topic() ~ '^canvas:[0-9a-f-]{36}$' then public.can_access_canvas(substring(realtime.topic() from 8)::uuid) else false end
);
commit;

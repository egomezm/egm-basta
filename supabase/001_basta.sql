-- Basta: schema, row level security and RPC functions.
-- Apply once in the Supabase SQL editor (or `psql`) on the existing project.
-- Safe to re-run: tables use IF NOT EXISTS, functions use CREATE OR REPLACE.
--
-- Security model: RLS is enabled on every table and no policy is created, so the
-- anon key can NOT read or write tables directly. The app only calls the
-- SECURITY DEFINER functions below (via /rest/v1/rpc/<name>), which authenticate
-- the player with a secret token kept in the browser (stored hashed).

-- ---------------------------------------------------------------- tables
create table if not exists basta_session (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  creator_player_id uuid,
  status text not null default 'playing' check (status in ('lobby', 'playing', 'closed')),
  categories jsonb not null,
  settings jsonb not null,
  used_letters text[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create table if not exists basta_player (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references basta_session (id) on delete cascade,
  token_hash text not null,
  name text not null,
  join_seq int not null,
  first_round int not null default 1,
  is_creator boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (session_id, token_hash),
  unique (session_id, join_seq)
);

create table if not exists basta_round (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references basta_session (id) on delete cascade,
  number int not null,
  letter text,
  pool text not null,
  spinner_id uuid references basta_player (id) on delete set null,
  stopper_id uuid references basta_player (id) on delete set null,
  status text not null default 'picking' check (status in ('picking', 'writing', 'countdown', 'locked')),
  spin_started_at timestamptz,
  stopped_at timestamptz,
  basta_by uuid references basta_player (id) on delete set null,
  basta_at timestamptz,
  created_at timestamptz not null default now(),
  unique (session_id, number)
);

create table if not exists basta_answer (
  round_id uuid not null references basta_round (id) on delete cascade,
  player_id uuid not null references basta_player (id) on delete cascade,
  category_idx int not null,
  text text not null,
  normalized text not null,
  primary key (round_id, player_id, category_idx)
);

create table if not exists basta_vote (
  round_id uuid not null references basta_round (id) on delete cascade,
  target_player_id uuid not null references basta_player (id) on delete cascade,
  category_idx int not null,
  voter_id uuid not null references basta_player (id) on delete cascade,
  valid boolean not null,
  primary key (round_id, target_player_id, category_idx, voter_id)
);

create index if not exists basta_player_session_idx on basta_player (session_id);
create index if not exists basta_round_session_idx on basta_round (session_id);
create index if not exists basta_session_expires_idx on basta_session (expires_at);

alter table basta_session enable row level security;
alter table basta_player enable row level security;
alter table basta_round enable row level security;
alter table basta_answer enable row level security;
alter table basta_vote enable row level security;

revoke all on basta_session, basta_player, basta_round, basta_answer, basta_vote from anon, authenticated;

-- ------------------------------------------------------- internal helpers
create or replace function basta_hash(p_token text) returns text
language sql immutable as $$
  select encode(sha256(convert_to(p_token, 'utf8')), 'hex')
$$;

create or replace function basta_ms(p_ts timestamptz) returns bigint
language sql immutable as $$
  select (extract(epoch from p_ts) * 1000)::bigint
$$;

-- Same formula as letterAt() in src/logic/letters.ts: one letter every 10 ms.
create or replace function basta_letter_at(p_pool text, p_elapsed_ms bigint) returns text
language sql immutable as $$
  select substr(p_pool, ((greatest(p_elapsed_ms, 0) / 10) % length(p_pool))::int + 1, 1)
$$;

-- Same normalization as normalize() in src/logic/normalize.ts.
create or replace function basta_normalize(p_text text) returns text
language sql immutable as $$
  select regexp_replace(
    trim(translate(lower(p_text), 'áàäâãåéèëêíìïîóòöôõúùüûñç', 'aaaaaaeeeeiiiiooooouuuunc')),
    '\s+', ' ', 'g')
$$;

create or replace function basta_gen_code() returns text
language plpgsql as $$
declare
  chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v text;
  i int;
begin
  loop
    v := '';
    for i in 1..6 loop
      v := v || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from basta_session where code = v);
  end loop;
  return v;
end $$;

create or replace function basta_session_by_code(p_code text) returns basta_session
language plpgsql as $$
declare s basta_session;
begin
  select * into s from basta_session where code = upper(trim(p_code));
  if s.id is null then raise exception 'not_found'; end if;
  if s.expires_at < now() then raise exception 'expired'; end if;
  return s;
end $$;

create or replace function basta_player_by_token(p_session uuid, p_token text) returns basta_player
language plpgsql as $$
declare p basta_player;
begin
  select * into p from basta_player
   where session_id = p_session and token_hash = basta_hash(coalesce(p_token, ''));
  if p.id is null then raise exception 'not_member'; end if;
  return p;
end $$;

-- Next player in join order starting at p_from_seq (wrapping around), skipping
-- disconnected players unless nobody else is available.
create or replace function basta_pick(p_session uuid, p_from_seq int, p_exclude uuid) returns basta_player
language plpgsql as $$
declare p basta_player;
begin
  select * into p from basta_player
   where session_id = p_session and (p_exclude is null or id <> p_exclude)
   order by (last_seen < now() - interval '20 seconds'), (join_seq < p_from_seq), join_seq
   limit 1;
  return p;
end $$;

-- Creates the next round. Spinner = previous stopper, stopper = next player in
-- join order. Closes the game (returns null) when all 26 letters were played.
create or replace function basta_new_round(p_session uuid) returns uuid
language plpgsql as $$
declare
  s basta_session;
  prev basta_round;
  base int;
  sp basta_player;
  st basta_player;
  n int;
  v_pool text;
  rid uuid;
begin
  select * into s from basta_session where id = p_session;
  select coalesce(string_agg(l, '' order by l), '') into v_pool
    from unnest(string_to_array('ABCDEFGHIJKLMNOPQRSTUVWXYZ', null)) as t(l)
   where not (l = any (s.used_letters));
  if v_pool = '' then
    update basta_session set status = 'closed' where id = p_session;
    return null;
  end if;

  select coalesce(max(number), 0) + 1 into n from basta_round where session_id = p_session;
  select * into prev from basta_round where session_id = p_session order by number desc limit 1;
  if prev.id is null then
    base := 1;
  else
    select join_seq into base from basta_player where id = prev.stopper_id;
    if base is null then
      select join_seq + 1 into base from basta_player where id = prev.spinner_id;
    end if;
  end if;

  sp := basta_pick(p_session, coalesce(base, 1), null);
  if sp.id is not null then
    st := basta_pick(p_session, sp.join_seq + 1, sp.id);
  end if;

  insert into basta_round (session_id, number, pool, spinner_id, stopper_id)
  values (p_session, n, v_pool, sp.id, st.id)
  returning id into rid;
  return rid;
end $$;

-- Moves a countdown round to "locked" once the countdown is over and everybody
-- connected has sent their answers (or after a short grace period).
create or replace function basta_tick(p_session uuid) returns void
language plpgsql as $$
declare
  secs int;
  ncat int;
begin
  select (settings ->> 'basta_seconds')::int, jsonb_array_length(categories)
    into secs, ncat from basta_session where id = p_session;

  update basta_round r set status = 'locked'
   where r.session_id = p_session and r.status = 'countdown'
     and clock_timestamp() >= r.basta_at + make_interval(secs => secs)
     and (
       clock_timestamp() > r.basta_at + make_interval(secs => secs) + interval '4 seconds'
       or not exists (
         select 1 from basta_player p
          where p.session_id = p_session and p.first_round <= r.number
            and p.last_seen > now() - interval '20 seconds'
            and (select count(*) from basta_answer a
                  where a.round_id = r.id and a.player_id = p.id) < ncat)
     );
end $$;

create or replace function basta_store_answers(p_round uuid, p_player uuid, p_answers jsonb, p_ncat int) returns void
language plpgsql as $$
begin
  delete from basta_answer where round_id = p_round and player_id = p_player;
  insert into basta_answer (round_id, player_id, category_idx, text, normalized)
  select p_round, p_player, g.i,
         left(trim(coalesce(a.txt, '')), 80),
         left(basta_normalize(coalesce(a.txt, '')), 80)
    from generate_series(0, p_ncat - 1) as g(i)
    left join (
      select (e ->> 'idx')::int as idx, e ->> 'text' as txt from jsonb_array_elements(p_answers) e
    ) a on a.idx = g.i;
end $$;

-- ------------------------------------------------------------ public RPCs
create or replace function basta_create_session(
  p_token text, p_player_name text, p_name text, p_categories jsonb, p_settings jsonb
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_sid uuid;
  v_pid uuid;
  v_cats jsonb;
  v_settings jsonb;
begin
  if length(coalesce(p_token, '')) < 16 then raise exception 'bad_token'; end if;
  delete from basta_session where expires_at < now();

  select coalesce(jsonb_agg(left(trim(c), 40) order by i), '[]'::jsonb) into v_cats
    from jsonb_array_elements_text(p_categories) with ordinality as e(c, i)
   where trim(c) <> '';
  if jsonb_array_length(v_cats) not between 1 and 20 then raise exception 'bad_categories'; end if;

  v_settings := jsonb_build_object(
    'basta_seconds', least(60, greatest(3, coalesce((p_settings ->> 'basta_seconds')::int, 10))),
    'pts_unique', least(1000, greatest(0, coalesce((p_settings ->> 'pts_unique')::int, 100))),
    'pts_shared', least(1000, greatest(0, coalesce((p_settings ->> 'pts_shared')::int, 50)))
  );

  v_code := basta_gen_code();
  insert into basta_session (code, name, categories, settings)
  values (v_code, coalesce(nullif(left(trim(p_name), 60), ''), 'Basta'), v_cats, v_settings)
  returning id into v_sid;

  insert into basta_player (session_id, token_hash, name, join_seq, first_round, is_creator)
  values (v_sid, basta_hash(p_token), coalesce(nullif(left(trim(p_player_name), 30), ''), 'Player'), 1, 1, true)
  returning id into v_pid;

  update basta_session set creator_player_id = v_pid where id = v_sid;
  perform basta_new_round(v_sid);
  return v_code;
end $$;

create or replace function basta_join_session(p_code text, p_token text, p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare
  s basta_session;
  me basta_player;
  r basta_round;
  v_name text := coalesce(nullif(left(trim(p_name), 30), ''), 'Player');
begin
  if length(coalesce(p_token, '')) < 16 then raise exception 'bad_token'; end if;
  s := basta_session_by_code(p_code);
  perform 1 from basta_session where id = s.id for update;

  select * into me from basta_player where session_id = s.id and token_hash = basta_hash(p_token);
  if me.id is not null then
    update basta_player set name = v_name, last_seen = now() where id = me.id;
    return s.code;
  end if;

  if s.status = 'closed' then raise exception 'closed'; end if;
  select * into r from basta_round where session_id = s.id order by number desc limit 1;
  insert into basta_player (session_id, token_hash, name, join_seq, first_round)
  values (
    s.id, basta_hash(p_token), v_name,
    (select coalesce(max(join_seq), 0) + 1 from basta_player where session_id = s.id),
    case when r.status = 'picking' then r.number else r.number + 1 end
  );
  return s.code;
end $$;

create or replace function basta_get_state(p_code text, p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  s basta_session;
  me basta_player;
begin
  s := basta_session_by_code(p_code);
  me := basta_player_by_token(s.id, p_token);
  update basta_player set last_seen = now() where id = me.id;
  perform basta_tick(s.id);

  return jsonb_build_object(
    'now', basta_ms(clock_timestamp()),
    'me', me.id,
    'session', jsonb_build_object(
      'id', s.id, 'code', s.code, 'name', s.name, 'status', s.status,
      'categories', s.categories, 'settings', s.settings,
      'used_letters', to_jsonb(s.used_letters),
      'creator_player_id', s.creator_player_id, 'expires_at', basta_ms(s.expires_at)),
    'players', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'join_seq', p.join_seq, 'first_round', p.first_round,
        'is_creator', p.is_creator,
        'connected', p.last_seen > now() - interval '20 seconds') order by p.join_seq), '[]'::jsonb)
        from basta_player p where p.session_id = s.id),
    'rounds', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id, 'number', r.number, 'letter', r.letter, 'pool', r.pool,
        'spinner_id', r.spinner_id, 'stopper_id', r.stopper_id, 'status', r.status,
        'spin_started_at', basta_ms(r.spin_started_at), 'stopped_at', basta_ms(r.stopped_at),
        'basta_by', r.basta_by, 'basta_at', basta_ms(r.basta_at)) order by r.number), '[]'::jsonb)
        from basta_round r where r.session_id = s.id),
    -- other players' answers stay hidden until the round is locked
    'answers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'round_id', a.round_id, 'player_id', a.player_id, 'category_idx', a.category_idx,
        'text', a.text, 'normalized', a.normalized)), '[]'::jsonb)
        from basta_answer a join basta_round r on r.id = a.round_id
       where r.session_id = s.id and (r.status = 'locked' or a.player_id = me.id)),
    'votes', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'round_id', v.round_id, 'target_player_id', v.target_player_id,
        'category_idx', v.category_idx, 'voter_id', v.voter_id, 'valid', v.valid)), '[]'::jsonb)
        from basta_vote v join basta_round r on r.id = v.round_id where r.session_id = s.id)
  );
end $$;

create or replace function basta_start_spin(p_code text, p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare
  s basta_session;
  me basta_player;
  r basta_round;
  st basta_player;
begin
  s := basta_session_by_code(p_code);
  me := basta_player_by_token(s.id, p_token);
  if s.status <> 'playing' then raise exception 'closed'; end if;
  select * into r from basta_round where session_id = s.id order by number desc limit 1 for update;
  if r.status <> 'picking' or r.spin_started_at is not null then raise exception 'bad_state'; end if;

  if me.id is distinct from r.spinner_id then
    -- the host can take over when the designated spinner is away
    if not (me.is_creator and not exists (
      select 1 from basta_player where id = r.spinner_id and last_seen > now() - interval '20 seconds')) then
      raise exception 'not_your_turn';
    end if;
    r.spinner_id := me.id;
  end if;

  if r.stopper_id is null or r.stopper_id = me.id or not exists (
    select 1 from basta_player where id = r.stopper_id and last_seen > now() - interval '20 seconds') then
    st := basta_pick(s.id, me.join_seq + 1, me.id);
    r.stopper_id := st.id;
  end if;

  update basta_round
     set spinner_id = r.spinner_id, stopper_id = r.stopper_id, spin_started_at = clock_timestamp()
   where id = r.id;
end $$;

create or replace function basta_stop_spin(p_code text, p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare
  s basta_session;
  me basta_player;
  r basta_round;
  v_letter text;
begin
  s := basta_session_by_code(p_code);
  me := basta_player_by_token(s.id, p_token);
  select * into r from basta_round where session_id = s.id order by number desc limit 1 for update;
  if r.status <> 'picking' or r.spin_started_at is null then raise exception 'bad_state'; end if;

  if not (me.id = r.stopper_id or (me.id = r.spinner_id and (r.stopper_id is null or not exists (
    select 1 from basta_player where id = r.stopper_id and last_seen > now() - interval '20 seconds')))) then
    raise exception 'not_your_turn';
  end if;

  v_letter := basta_letter_at(
    r.pool, floor(extract(epoch from clock_timestamp() - r.spin_started_at) * 1000)::bigint);
  update basta_round
     set letter = v_letter, stopped_at = clock_timestamp(), status = 'writing'
   where id = r.id;
  update basta_session set used_letters = array_append(used_letters, v_letter) where id = s.id;
end $$;

create or replace function basta_press_basta(p_code text, p_token text, p_answers jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  s basta_session;
  me basta_player;
  r basta_round;
  ncat int;
begin
  s := basta_session_by_code(p_code);
  me := basta_player_by_token(s.id, p_token);
  select * into r from basta_round where session_id = s.id order by number desc limit 1 for update;
  if r.status <> 'writing' then raise exception 'bad_state'; end if;
  if me.first_round > r.number then raise exception 'not_playing'; end if;

  ncat := jsonb_array_length(s.categories);
  if (select count(distinct (e ->> 'idx')::int) from jsonb_array_elements(p_answers) e
       where (e ->> 'idx')::int between 0 and ncat - 1 and trim(coalesce(e ->> 'text', '')) <> '') <> ncat then
    raise exception 'not_all_filled';
  end if;

  perform basta_store_answers(r.id, me.id, p_answers, ncat);
  update basta_round set status = 'countdown', basta_by = me.id, basta_at = clock_timestamp() where id = r.id;
end $$;

create or replace function basta_submit_answers(p_code text, p_token text, p_answers jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  s basta_session;
  me basta_player;
  r basta_round;
begin
  s := basta_session_by_code(p_code);
  me := basta_player_by_token(s.id, p_token);
  perform basta_tick(s.id);
  select * into r from basta_round where session_id = s.id order by number desc limit 1 for update;
  if r.status not in ('writing', 'countdown') then raise exception 'too_late'; end if;
  if me.first_round > r.number then raise exception 'not_playing'; end if;
  if r.status = 'countdown' and clock_timestamp() > r.basta_at
       + make_interval(secs => (s.settings ->> 'basta_seconds')::int) + interval '4 seconds' then
    raise exception 'too_late';
  end if;
  perform basta_store_answers(r.id, me.id, p_answers, jsonb_array_length(s.categories));
end $$;

-- p_valid = true/false casts or changes a vote, null retracts it.
create or replace function basta_vote(
  p_code text, p_token text, p_round uuid, p_target uuid, p_idx int, p_valid boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare
  s basta_session;
  me basta_player;
  r basta_round;
begin
  s := basta_session_by_code(p_code);
  me := basta_player_by_token(s.id, p_token);
  select * into r from basta_round where id = p_round and session_id = s.id;
  if r.id is null or r.status <> 'locked' then raise exception 'bad_state'; end if;
  if me.first_round > r.number or me.id = p_target then raise exception 'not_allowed'; end if;
  if not exists (select 1 from basta_answer
                  where round_id = r.id and player_id = p_target and category_idx = p_idx and text <> '') then
    raise exception 'not_allowed';
  end if;

  if p_valid is null then
    delete from basta_vote
     where round_id = r.id and target_player_id = p_target and category_idx = p_idx and voter_id = me.id;
  else
    insert into basta_vote (round_id, target_player_id, category_idx, voter_id, valid)
    values (r.id, p_target, p_idx, me.id, p_valid)
    on conflict (round_id, target_player_id, category_idx, voter_id) do update set valid = excluded.valid;
  end if;
end $$;

create or replace function basta_next_round(p_code text, p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare
  s basta_session;
  me basta_player;
  r basta_round;
begin
  s := basta_session_by_code(p_code);
  me := basta_player_by_token(s.id, p_token);
  if not me.is_creator then raise exception 'not_allowed'; end if;
  if s.status <> 'playing' then raise exception 'closed'; end if;
  perform basta_tick(s.id);
  select * into r from basta_round where session_id = s.id order by number desc limit 1 for update;
  if r.status <> 'locked' then raise exception 'bad_state'; end if;
  perform basta_new_round(s.id);
end $$;

create or replace function basta_close_session(p_code text, p_token text) returns void
language plpgsql security definer set search_path = public as $$
declare
  s basta_session;
  me basta_player;
begin
  s := basta_session_by_code(p_code);
  me := basta_player_by_token(s.id, p_token);
  if not me.is_creator then raise exception 'not_allowed'; end if;
  update basta_round set status = 'locked' where session_id = s.id and status = 'countdown';
  update basta_session set status = 'closed' where id = s.id;
end $$;

-- Optional housekeeping: schedule with pg_cron, e.g.
--   select cron.schedule('basta-purge', '0 * * * *', 'select basta_purge_expired()');
-- (create_session also purges expired games opportunistically.)
create or replace function basta_purge_expired() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from basta_session where expires_at < now();
  get diagnostics n = row_count;
  return n;
end $$;

-- ------------------------------------------------------------- privileges
revoke execute on function
  basta_hash(text), basta_ms(timestamptz), basta_letter_at(text, bigint), basta_normalize(text),
  basta_gen_code(), basta_session_by_code(text), basta_player_by_token(uuid, text),
  basta_pick(uuid, int, uuid), basta_new_round(uuid), basta_tick(uuid),
  basta_store_answers(uuid, uuid, jsonb, int), basta_purge_expired()
  from public, anon, authenticated;

grant execute on function
  basta_create_session(text, text, text, jsonb, jsonb),
  basta_join_session(text, text, text),
  basta_get_state(text, text),
  basta_start_spin(text, text),
  basta_stop_spin(text, text),
  basta_press_basta(text, text, jsonb),
  basta_submit_answers(text, text, jsonb),
  basta_vote(text, text, uuid, uuid, int, boolean),
  basta_next_round(text, text),
  basta_close_session(text, text)
  to anon, authenticated;

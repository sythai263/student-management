-- =============================================================
-- Step 13: Realtime quiz (Kahoot-like)
--   Tables: quizzes, quizQuestions, quizSessions, quizSessionResults
--   Strict RLS: teachers own everything; anonymous students reach
--   sessions only through SECURITY DEFINER RPCs that expose safe
--   fields (never correctIndex, never quiz internals).
--   Individual answers are NEVER stored — the teacher's browser
--   aggregates scores over Broadcast and batch-inserts results.
-- =============================================================

-- -------------------------------------------------------------
-- 1. Table: quizzes — reusable question bank owned by a teacher
-- -------------------------------------------------------------
create table if not exists public.quizzes (
  "id"          uuid primary key default gen_random_uuid(),
  "teacherId"   uuid not null references auth.users(id) on delete cascade,
  "title"       text not null,
  "description" text,
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz not null default now()
);

create index if not exists "idx_quizzes_teacherId" on public.quizzes ("teacherId");

-- -------------------------------------------------------------
-- 2. Table: quizQuestions
--    options: jsonb array of 2-6 answer strings.
-- -------------------------------------------------------------
create table if not exists public."quizQuestions" (
  "id"           uuid primary key default gen_random_uuid(),
  "quizId"       uuid not null references public.quizzes(id) on delete cascade,
  "orderIndex"   smallint not null,
  "text"         text not null,
  "options"      jsonb not null,
  "correctIndex" smallint not null,
  "timeLimit"    smallint not null default 20,
  constraint "quizQuestions_quizId_orderIndex_key" unique ("quizId", "orderIndex"),
  constraint "quizQuestions_options_check"
    check (jsonb_typeof("options") = 'array' and jsonb_array_length("options") between 2 and 6),
  constraint "quizQuestions_correctIndex_check"
    check ("correctIndex" >= 0 and "correctIndex" < jsonb_array_length("options")),
  constraint "quizQuestions_timeLimit_check" check ("timeLimit" between 5 and 120)
);

create index if not exists "idx_quizQuestions_quizId" on public."quizQuestions" ("quizId");

-- -------------------------------------------------------------
-- 3. Table: quizSessions — one live room per quiz run.
--    hostPublicKey: JWK of the ephemeral ECDSA key the host
--    generates in-browser; students use it to verify signed
--    Broadcast commands (anti-spoofing).
-- -------------------------------------------------------------
create table if not exists public."quizSessions" (
  "id"                   uuid primary key default gen_random_uuid(),
  "quizId"               uuid not null references public.quizzes(id) on delete cascade,
  "pinCode"              text not null,
  "status"               text not null default 'waiting'
                         check ("status" in ('waiting','playing','finished')),
  "hostPublicKey"        jsonb,
  "currentQuestionIndex" int not null default -1,
  "questionEndsAt"       timestamptz,
  "createdAt"            timestamptz not null default now(),
  "closedAt"             timestamptz
);

-- A PIN identifies one live room — only one active session per PIN.
create unique index if not exists "quizSessions_active_pin_idx"
  on public."quizSessions" ("pinCode")
  where "status" in ('waiting','playing');

create index if not exists "idx_quizSessions_quizId" on public."quizSessions" ("quizId");

-- -------------------------------------------------------------
-- 4. Table: quizSessionResults — final scoreboard rows, written
--    once per player by the teacher at the end of a session.
-- -------------------------------------------------------------
create table if not exists public."quizSessionResults" (
  "id"           uuid primary key default gen_random_uuid(),
  "sessionId"    uuid not null references public."quizSessions"(id) on delete cascade,
  "playerId"     uuid not null,
  "playerName"   text not null,
  "totalScore"   int not null default 0,
  "correctCount" int not null default 0,
  "createdAt"    timestamptz not null default now(),
  constraint "quizSessionResults_sessionId_playerId_key" unique ("sessionId", "playerId")
);

create index if not exists "idx_quizSessionResults_sessionId"
  on public."quizSessionResults" ("sessionId");

comment on column public."quizSessions"."pinCode" is 'Ma PIN 6 so hoc sinh nhap de vao phong.';
comment on column public."quizSessions"."hostPublicKey" is 'Khoa cong khai ECDSA (JWK) cua host, dung de xac thuc broadcast.';
comment on column public."quizSessions"."currentQuestionIndex" is 'Cau hoi dang chieu, -1 = chua bat dau.';
comment on column public."quizSessionResults"."playerId" is 'UUID client-side cua nguoi choi (sessionStorage), khong phai auth user.';

-- -------------------------------------------------------------
-- 5. RLS — quizzes: teacher owns everything
-- -------------------------------------------------------------
alter table public.quizzes enable row level security;

create policy "quizzes_select_own" on public.quizzes
  for select using ("teacherId" = auth.uid());

create policy "quizzes_insert_own" on public.quizzes
  for insert with check ("teacherId" = auth.uid());

create policy "quizzes_update_own" on public.quizzes
  for update using ("teacherId" = auth.uid())
  with check ("teacherId" = auth.uid());

create policy "quizzes_delete_own" on public.quizzes
  for delete using ("teacherId" = auth.uid());

-- -------------------------------------------------------------
-- 6. RLS — quizQuestions: via quiz ownership
-- -------------------------------------------------------------
alter table public."quizQuestions" enable row level security;

create policy "quizQuestions_select_own" on public."quizQuestions"
  for select using (
    exists (
      select 1 from public.quizzes q
      where q."id" = "quizId" and q."teacherId" = auth.uid()
    )
  );

create policy "quizQuestions_insert_own" on public."quizQuestions"
  for insert with check (
    exists (
      select 1 from public.quizzes q
      where q."id" = "quizId" and q."teacherId" = auth.uid()
    )
  );

create policy "quizQuestions_update_own" on public."quizQuestions"
  for update using (
    exists (
      select 1 from public.quizzes q
      where q."id" = "quizId" and q."teacherId" = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.quizzes q
      where q."id" = "quizId" and q."teacherId" = auth.uid()
    )
  );

create policy "quizQuestions_delete_own" on public."quizQuestions"
  for delete using (
    exists (
      select 1 from public.quizzes q
      where q."id" = "quizId" and q."teacherId" = auth.uid()
    )
  );

-- -------------------------------------------------------------
-- 7. RLS — quizSessions: teacher manages sessions of own quizzes.
--    NO anon policy: students read session state exclusively via
--    the join_quiz_session / get_quiz_session_state RPCs below.
-- -------------------------------------------------------------
alter table public."quizSessions" enable row level security;

create policy "quizSessions_select_own" on public."quizSessions"
  for select using (
    exists (
      select 1 from public.quizzes q
      where q."id" = "quizId" and q."teacherId" = auth.uid()
    )
  );

create policy "quizSessions_insert_own" on public."quizSessions"
  for insert with check (
    exists (
      select 1 from public.quizzes q
      where q."id" = "quizId" and q."teacherId" = auth.uid()
    )
  );

create policy "quizSessions_update_own" on public."quizSessions"
  for update using (
    exists (
      select 1 from public.quizzes q
      where q."id" = "quizId" and q."teacherId" = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.quizzes q
      where q."id" = "quizId" and q."teacherId" = auth.uid()
    )
  );

create policy "quizSessions_delete_own" on public."quizSessions"
  for delete using (
    exists (
      select 1 from public.quizzes q
      where q."id" = "quizId" and q."teacherId" = auth.uid()
    )
  );

-- -------------------------------------------------------------
-- 8. RLS — quizSessionResults: teacher reads/writes results for
--    sessions of own quizzes. No UPDATE: results are immutable.
--    Students never touch this table (scores arrive via Broadcast).
-- -------------------------------------------------------------
alter table public."quizSessionResults" enable row level security;

create policy "quizSessionResults_select_own" on public."quizSessionResults"
  for select using (
    exists (
      select 1 from public."quizSessions" s
      join public.quizzes q on q."id" = s."quizId"
      where s."id" = "sessionId" and q."teacherId" = auth.uid()
    )
  );

create policy "quizSessionResults_insert_own" on public."quizSessionResults"
  for insert with check (
    exists (
      select 1 from public."quizSessions" s
      join public.quizzes q on q."id" = s."quizId"
      where s."id" = "sessionId" and q."teacherId" = auth.uid()
    )
  );

create policy "quizSessionResults_delete_own" on public."quizSessionResults"
  for delete using (
    exists (
      select 1 from public."quizSessions" s
      join public.quizzes q on q."id" = s."quizId"
      where s."id" = "sessionId" and q."teacherId" = auth.uid()
    )
  );

-- -------------------------------------------------------------
-- 9. RPC: join_quiz_session(p_pin)
--    Anonymous players resolve a PIN -> safe session info.
--    Rejects finished/closed sessions and rooms older than 24h
--    (backstop for rooms the teacher forgot to close).
-- -------------------------------------------------------------
create or replace function public.join_quiz_session(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public."quizSessions"%rowtype;
  v_quiz_title text;
  v_question_count int;
begin
  select * into v_session
  from public."quizSessions"
  where "pinCode" = p_pin
    and "status" in ('waiting','playing')
    and "closedAt" is null
    and "createdAt" > now() - interval '24 hours'
  limit 1;

  if not found then
    return null;
  end if;

  select q."title" into v_quiz_title
  from public.quizzes q
  where q."id" = v_session."quizId";

  select count(*) into v_question_count
  from public."quizQuestions" qq
  where qq."quizId" = v_session."quizId";

  return jsonb_build_object(
    'sessionId', v_session."id",
    'status', v_session."status",
    'quizTitle', v_quiz_title,
    'questionCount', v_question_count,
    'hostPublicKey', v_session."hostPublicKey",
    'currentQuestionIndex', v_session."currentQuestionIndex"
  );
end;
$$;

-- -------------------------------------------------------------
-- 10. RPC: get_quiz_session_state(p_session_id)
--     Reconnect-safe state lookup for players who already hold a
--     sessionId (page refresh mid-game). When the session is
--     playing, also returns the current question WITHOUT
--     correctIndex so the player can resume mid-question.
-- -------------------------------------------------------------
create or replace function public.get_quiz_session_state(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public."quizSessions"%rowtype;
  v_quiz_title text;
  v_question_count int;
  v_question jsonb;
begin
  select * into v_session
  from public."quizSessions"
  where "id" = p_session_id
    and "status" in ('waiting','playing')
    and "closedAt" is null
    and "createdAt" > now() - interval '24 hours';

  if not found then
    return null;
  end if;

  select q."title" into v_quiz_title
  from public.quizzes q
  where q."id" = v_session."quizId";

  select count(*) into v_question_count
  from public."quizQuestions" qq
  where qq."quizId" = v_session."quizId";

  if v_session."status" = 'playing' and v_session."currentQuestionIndex" >= 0 then
    select jsonb_build_object(
      'index', qq."orderIndex",
      'text', qq."text",
      'options', qq."options",
      'timeLimit', qq."timeLimit",
      'endsAt', v_session."questionEndsAt"
    ) into v_question
    from public."quizQuestions" qq
    where qq."quizId" = v_session."quizId"
      and qq."orderIndex" = v_session."currentQuestionIndex";
  end if;

  return jsonb_build_object(
    'sessionId', v_session."id",
    'status', v_session."status",
    'quizTitle', v_quiz_title,
    'questionCount', v_question_count,
    'hostPublicKey', v_session."hostPublicKey",
    'currentQuestionIndex', v_session."currentQuestionIndex",
    'question', v_question
  );
end;
$$;

-- Functions default to EXECUTE for PUBLIC — lock that down, then
-- grant only to the API roles that actually call them.
revoke all on function public.join_quiz_session(text) from public;
revoke all on function public.get_quiz_session_state(uuid) from public;
grant execute on function public.join_quiz_session(text) to anon, authenticated;
grant execute on function public.get_quiz_session_state(uuid) to anon, authenticated;

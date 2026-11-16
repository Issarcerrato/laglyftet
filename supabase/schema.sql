-- Laglyftet: databas för piloten.
-- Kör hela filen en gång i Supabase → SQL Editor → New query → Run.
-- Kör sedan filerna i migrations/ i nummerordning.
--
-- Principer:
--   * Appen hanterar aldrig pengar. Den sparar bara mål och "Jag har swishat"-rapporter.
--   * Alla kan läsa publicerade mål och skicka en rapport.
--   * Bara admins kan se rapporter, bekräfta dem och skapa mål.
--   * Belopp per givare visas aldrig publikt, bara summor och valda visningsnamn.

-- Tabeller -------------------------------------------------------------------

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  crest text not null default '' check (char_length(crest) <= 4),            -- initialer i emblemet, t.ex. SIF
  color text not null default '#1f6b45' check (color ~ '^#[0-9a-fA-F]{6}$'),
  swish_number text not null check (swish_number ~ '^123[0-9]{7}$'),          -- Swish för föreningar, bara siffror
  city text not null default '',
  created_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  club_id uuid not null references public.clubs(id) on delete cascade,
  team text not null check (char_length(team) between 1 and 40),
  title text not null check (char_length(title) between 3 and 60),
  description text not null default '' check (char_length(description) <= 600),
  target integer not null check (target >= 500),
  deadline date not null,
  swish_message text not null check (char_length(swish_message) between 1 and 50),
  kak_thing text check (char_length(kak_thing) <= 30),
  kak_items integer check (kak_items > 0),
  kak_profit integer check (kak_profit > 0),
  update_text text not null default '' check (char_length(update_text) <= 280),
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  display_name text not null default 'En supporter' check (char_length(display_name) between 1 and 40),
  amount integer not null check (amount between 20 and 100000),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now()
);

create index reports_goal_id_idx on public.reports (goal_id);

-- club_id null = superadmin (ser och hanterar allt)
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete cascade,
  name text check (char_length(name) <= 60)                                  -- visas i stället för e-posten
);

-- Hjälpfunktioner ------------------------------------------------------------

create function public.is_admin_for(club uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admins a
    where a.user_id = auth.uid() and (a.club_id is null or a.club_id = club)
  );
$$;

-- Summor per publicerat mål. Visar aldrig belopp per givare.
create function public.all_progress()
returns table (goal_id uuid, confirmed integer, pending integer, supporters integer)
language sql stable security definer set search_path = public as $$
  select g.id,
    coalesce(sum(r.amount) filter (where r.status = 'confirmed'), 0)::integer,
    coalesce(sum(r.amount) filter (where r.status = 'pending'), 0)::integer,
    count(r.id) filter (where r.status <> 'rejected')::integer
  from goals g
  left join reports r on r.goal_id = g.id
  where g.published
  group by g.id;
$$;

create function public.goal_progress(goal uuid)
returns table (confirmed integer, pending integer, supporters integer, recent text[])
language sql stable security definer set search_path = public as $$
  select p.confirmed, p.pending, p.supporters,
    array(
      select r.display_name from reports r
      where r.goal_id = goal and r.status <> 'rejected'
      order by r.created_at desc limit 5
    )
  from all_progress() p
  where p.goal_id = goal;
$$;

-- Säkerhetsregler (row level security) ----------------------------------------

alter table public.clubs enable row level security;
alter table public.goals enable row level security;
alter table public.reports enable row level security;
alter table public.admins enable row level security;

create policy "Alla kan se föreningar" on public.clubs
  for select using (true);
create policy "Superadmin hanterar föreningar" on public.clubs
  for all to authenticated using (public.is_admin_for(null)) with check (public.is_admin_for(null));

create policy "Alla kan se publicerade mål" on public.goals
  for select using (published or public.is_admin_for(club_id));
create policy "Admins hanterar sina mål" on public.goals
  for all to authenticated using (public.is_admin_for(club_id)) with check (public.is_admin_for(club_id));

create policy "Alla kan rapportera en swish" on public.reports
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and exists (select 1 from public.goals g where g.id = goal_id and g.published)
  );
create policy "Admins ser rapporter för sina mål" on public.reports
  for select to authenticated
  using (exists (select 1 from public.goals g where g.id = goal_id and public.is_admin_for(g.club_id)));
create policy "Admins stämmer av rapporter" on public.reports
  for update to authenticated
  using (exists (select 1 from public.goals g where g.id = goal_id and public.is_admin_for(g.club_id)))
  with check (exists (select 1 from public.goals g where g.id = goal_id and public.is_admin_for(g.club_id)));

create policy "Se sin egen adminrad" on public.admins
  for select to authenticated using (user_id = auth.uid());

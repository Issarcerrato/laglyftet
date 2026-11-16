-- Laglyftet 002: demolag, plats för föreningar och tio demolag.
-- Kör en gång i Supabase → SQL Editor, efter schema.sql.
--
-- Demolag visar besökare hur appen ser ut. De har inget Swish-nummer,
-- går inte att swisha till och visas med märket "Demo".

-- Kolumner -------------------------------------------------------------------

alter table public.clubs add column if not exists demo boolean not null default false;
alter table public.clubs add column if not exists lat double precision check (lat between 54 and 70);
alter table public.clubs add column if not exists lng double precision check (lng between 10 and 25);
alter table public.clubs alter column swish_number drop not null;
alter table public.clubs add constraint clubs_swish_required check (demo or swish_number is not null);

-- Påhittade summor som bara används för demolag
alter table public.goals add column if not exists demo_confirmed integer not null default 0 check (demo_confirmed >= 0);
alter table public.goals add column if not exists demo_supporters integer not null default 0 check (demo_supporters >= 0);

-- Summor räknar in demosiffrorna för demolag ----------------------------------

create or replace function public.all_progress()
returns table (goal_id uuid, confirmed integer, pending integer, supporters integer)
language sql stable security definer set search_path = public as $$
  select g.id,
    (coalesce(sum(r.amount) filter (where r.status = 'confirmed'), 0)
      + case when c.demo then g.demo_confirmed else 0 end)::integer,
    coalesce(sum(r.amount) filter (where r.status = 'pending'), 0)::integer,
    (count(r.id) filter (where r.status <> 'rejected')
      + case when c.demo then g.demo_supporters else 0 end)::integer
  from goals g
  join clubs c on c.id = g.club_id
  left join reports r on r.goal_id = g.id
  where g.published
  group by g.id, c.id;
$$;

-- Det går inte att rapportera swishar till demolag -----------------------------

drop policy if exists "Alla kan rapportera en swish" on public.reports;
create policy "Alla kan rapportera en swish" on public.reports
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and exists (
      select 1 from public.goals g join public.clubs c on c.id = g.club_id
      where g.id = goal_id and g.published and not c.demo
    )
  );

-- Tio demolag ----------------------------------------------------------------

with c as (
  insert into public.clubs (name, crest, color, city, lat, lng, demo) values
    ('Solbacka IF',      'SIF', '#1d4e9e', 'Stockholm',  59.312, 18.072, true),
    ('Strandvikens FF',  'SFF', '#0f7a6c', 'Stockholm',  59.325, 18.095, true),
    ('Kvarnbyns BK',     'KBK', '#b3202a', 'Nacka',      59.310, 18.163, true),
    ('Ekeby United',     'EU',  '#232323', 'Sundbyberg', 59.361, 17.971, true),
    ('Lindhagens IK',    'LIK', '#5a2d82', 'Solna',      59.360, 18.000, true),
    ('Västerängens IF',  'VIF', '#2f7d32', 'Huddinge',   59.236, 17.982, true),
    ('Norrtorps DFF',    'NDF', '#c94f0c', 'Uppsala',    59.858, 17.639, true),
    ('Hamnens BK',       'HBK', '#0a4f8a', 'Göteborg',   57.708, 11.974, true),
    ('Skogsby IF',       'SKI', '#2e5e2a', 'Umeå',       63.826, 20.263, true),
    ('Kustbyns FF',      'KFF', '#0b7fb3', 'Malmö',      55.605, 13.003, true)
  returning id, name
)
insert into public.goals
  (slug, club_id, team, title, description, target, deadline, swish_message,
   kak_thing, kak_items, kak_profit, update_text, published, demo_confirmed, demo_supporters)
select v.slug, c.id, v.team, v.title, v.description, v.target, current_date + v.days, v.msg,
   v.kak_thing, v.kak_items, v.kak_profit, v.update_text, true, v.confirmed, v.supporters
from c join (values
  ('Solbacka IF', 'demo-solbacka-p14', 'P14', 'Cupresa till Barcelona',
   '18 spelare vill åka på Costa Brava Cup i påsk. Pengarna går till flyg och boende så att alla kan följa med, oavsett hemekonomi.',
   60000, 130, 'P14 Barcelona', 'kakburkar', 20, 50, 'Vi har sålt 340 kakburkar hittills. Tack alla som köpt!', 38400, 112),
  ('Strandvikens FF', 'demo-strandvikens-p10', 'P10', 'Bollar och koner till träningarna',
   'Vi tränar 30 barn med 8 bollar. 25 nya bollar i storlek 4 och en uppsättning koner gör varje träning bättre.',
   6000, 25, 'P10 Bollar', null, null, null, 'Bara 1 100 kr kvar till målet.', 4900, 41),
  ('Kvarnbyns BK', 'demo-kvarnbyns-f12', 'F12', 'Nya matchställ till hela laget',
   'Laget har vuxit från 11 till 22 spelare och tröjorna räcker inte. Målet är matchställ i alla storlekar.',
   18000, 45, 'F12 Matchstall', 'Bingolotter', 5, 60, 'Vi provade storlekar på träningen i tisdags.', 11250, 64),
  ('Ekeby United', 'demo-ekeby-knatte', 'Knattefotbollen', 'Konstgräs på minifotbollsplanen',
   'Grusplanen blir lera varje höst. Med konstgräs kan 200 barn spela året runt. Kommunen står för halva kostnaden.',
   250000, 240, 'Knatte Konstgras', null, null, null, 'Kommunen har godkänt ansökan om medfinansiering.', 92000, 287),
  ('Lindhagens IK', 'demo-lindhagens-f16', 'F16', 'Gothia Cup i Göteborg',
   'Laget har aldrig spelat en stor turnering. Pengarna täcker anmälan, tåg och skolförläggning för 16 spelare.',
   45000, 200, 'F16 Gothia', 'kakburkar', 15, 50, 'Anmälan är skickad. Nu samlar vi till resan.', 12600, 38),
  ('Västerängens IF', 'demo-vasterangens-sommar', 'Sommarskolan', 'Fotbollsskola för alla barn',
   'Vi vill att sommarens fotbollsskola ska kosta 0 kr för familjer som inte har råd. 25 000 kr täcker 50 platser.',
   25000, 175, 'Sommarskola', null, null, null, '35 platser är redan finansierade.', 17500, 96),
  ('Norrtorps DFF', 'demo-norrtorps-dam', 'Damlaget', 'Buss till bortamatcherna',
   'Spelarna kör egna bilar till bortamatcher upp till 15 mil bort. En hyrd buss gör resorna säkrare och billigare.',
   32000, 150, 'Dam Buss', null, null, null, 'Spelarna har startat en loppis i klubbstugan.', 8000, 27),
  ('Hamnens BK', 'demo-hamnens-p15', 'P15', 'Träningsläger i Danmark',
   'Fyra dagar med två träningspass om dagen och matcher mot danska lag. Pengarna går till buss, färja och boende.',
   40000, 100, 'P15 Danmark', 'Bingolotter', 10, 60, 'Lägret är bokat till sportlovet.', 21000, 73),
  ('Skogsby IF', 'demo-skogsby-f13', 'F13', 'Inomhustider i vinter',
   'Vintern är lång i Umeå. Hyra av inomhushall varannan helg i fyra månader gör att laget kan fortsätta träna.',
   15000, 55, 'F13 Inomhus', null, null, null, 'Hallen är preliminärbokad från december.', 3200, 22),
  ('Kustbyns FF', 'demo-kustbyns-p12', 'P12', 'Målvaktsutrustning',
   'Tre målvakter delar på ett par handskar. Nya handskar, tröjor och byxor med skydd till alla som vill stå i mål.',
   8000, 40, 'P12 Malvakt', null, null, null, 'Handskarna är beställda, nu fattas tröjorna.', 6900, 58)
) as v(club, slug, team, title, description, target, days, msg, kak_thing, kak_items, kak_profit, update_text, confirmed, supporters)
  on v.club = c.name;

-- Ta bort alla demolag senare med:
--   delete from public.clubs where demo;

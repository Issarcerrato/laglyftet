-- Laglyftet 003: alla givare är anonyma.
-- Inga namn sparas för bidrag, bara belopp, tidpunkt och vilket mål.
-- Kör en gång i Supabase → SQL Editor.

-- Namn som redan finns ersätts
update public.reports set display_name = 'En supporter' where display_name <> 'En supporter';

-- Databasen tar bara emot anonyma rapporter
drop policy if exists "Alla kan rapportera en swish" on public.reports;
create policy "Alla kan rapportera en swish" on public.reports
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and display_name = 'En supporter'
    and exists (
      select 1 from public.goals g join public.clubs c on c.id = g.club_id
      where g.id = goal_id and g.published and not c.demo
    )
  );

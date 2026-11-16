-- Laglyftet 004: bara bekräftade bidrag syns publikt.
-- Förloppsindikatorn rör sig först när lagledaren har bekräftat bidraget
-- mot föreningens Swish-rapport. Obekräftade rapporter syns bara i admin.
-- Dessutom: högst 5 000 kr per rapport och högst 30 rapporter per mål och timme.
-- Kör en gång i Supabase → SQL Editor.

-- Summor: bara bekräftat, och inga obekräftade belopp publikt -------------------

drop function if exists public.goal_progress(uuid);
drop function if exists public.all_progress();

create function public.all_progress()
returns table (goal_id uuid, confirmed integer, supporters integer)
language sql stable security definer set search_path = public as $$
  select g.id,
    (coalesce(sum(r.amount) filter (where r.status = 'confirmed'), 0)
      + case when c.demo then g.demo_confirmed else 0 end)::integer,
    (count(r.id) filter (where r.status = 'confirmed')
      + case when c.demo then g.demo_supporters else 0 end)::integer
  from goals g
  join clubs c on c.id = g.club_id
  left join reports r on r.goal_id = g.id
  where g.published
  group by g.id, c.id;
$$;

create function public.goal_progress(goal uuid)
returns table (confirmed integer, supporters integer)
language sql stable security definer set search_path = public as $$
  select p.confirmed, p.supporters from all_progress() p where p.goal_id = goal;
$$;

-- Tak per rapport ---------------------------------------------------------------

alter table public.reports drop constraint if exists reports_amount_check;
alter table public.reports add constraint reports_amount_check check (amount between 20 and 5000);

-- Spärr mot massrapporter: högst 30 per mål och timme. Sparar inget om besökaren.

create or replace function public.limit_reports() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from reports
      where goal_id = new.goal_id and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'För många rapporter för det här målet just nu. Försök igen om en stund.';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_limit on public.reports;
create trigger reports_limit before insert on public.reports
  for each row execute function public.limit_reports();

# Laglyftet

**Swisha din del till laget i stället för att sälja kakor och lotter.**

Laglyftet är ett demoprojekt som visar hur föräldrar, släkt och grannar kan stötta ett lokalt idrottslag direkt med Swish. Lagen visar vad de samlar till, och givaren swishar till föreningens eget Swish-nummer med mottagare, belopp och meddelande redan ifyllda. Appen hanterar aldrig några pengar.

**Se demon:** [laglyftet.netlify.app](https://laglyftet.netlify.app)

Koden är fri att använda (MIT-licens). Bygg gärna vidare för ditt eget lag eller din förening.

## Idén

Många lag finansierar cupresor, matchställ och läger genom att sälja kakor eller Bingolotter. Ofta går bara ungefär hälften av försäljningspriset till laget, och släkten köper saker de inte behöver. Med Laglyftet kan man i stället:

- **Swisha sin del.** Laget anger vad de brukar sälja och vinsten per styck, och appen räknar ut beloppet: *"Slipp sälja 10 kakburkar: swisha 500 kr"*.
- **Hitta lag nära sig** genom att swipea, söka eller filtrera på avstånd.
- **Följa lagets mål** med en förloppsindikator och uppdateringar från laget.
- **Dela målet** så att fler kan hjälpa till.

## Två lägen

| | Demoläge (det som körs på demosajten) | Fullständig version |
|---|---|---|
| Inställning | `DEMO = true` i `public/config.js` | `DEMO = false` |
| Data | Tio påhittade lag i `public/demo-data.js` | Supabase-databas |
| Swish | Avstängt | Föreningens Swish-nummer via länk och QR-kod |
| Admin | Visar en förklaring | Inloggning för lagledare, egna mål, avstämning mot Swish |
| Kostnad | 0 kr (bara Netlify) | 0 kr på gratisnivåerna |

## Så fungerar den fullständiga versionen

1. **Lagledaren** kontaktar den som driver tjänsten via formuläret på startsidan.
2. **Föreningen** kontrolleras och läggs in med sitt eget Swish-nummer. Privata nummer godkänns aldrig.
3. **Laget** får ett mål med en egen delningslänk, `/m/<namn>`.
4. **Givaren** swishar direkt till föreningen och trycker "Jag har swishat". Alla bidrag är anonyma.
5. **Lagledaren** loggar in, jämför med föreningens Swish-rapport och bekräftar. Först då ökar förloppsindikatorn, så det går inte att trolla med påhittade belopp.

## Teknik

- Vanlig HTML, CSS och JavaScript utan byggsteg, i mappen `public/`
- [Supabase](https://supabase.com) för databas och inloggning, med säkerhetsregler (row level security) i `supabase/`
- [Netlify](https://www.netlify.com) för webbplatsen och lagledarformuläret
- Illustrerade lagbilder som ritas i koden, med spelarna bakifrån så att inga ansikten syns

| Mapp eller fil | Innehåll |
|---|---|
| `public/` | Webbappen som Netlify publicerar |
| `public/config.js` | Demoläge och Supabase-inställningar |
| `public/demo-data.js` | De tio demolagen |
| `public/villkor.html`, `public/integritet.html` | Mallar för villkor och integritetspolicy i den fullständiga versionen |
| `supabase/schema.sql` och `supabase/migrations/` | Databasen och säkerhetsreglerna |
| `prototyp/` | Den första klickbara prototypen |

## Kör demon på din dator

```bash
cd public && python3 -m http.server 8000
```

Öppna `http://localhost:8000`. Målsidor nås lokalt via `mal.html?m=<namn>`, till exempel `mal.html?m=demo-solbacka-p14`.

## Sätt upp den fullständiga versionen

Allt nedan är gratis.

### 1. Databasen
1. Skapa ett projekt på [supabase.com](https://supabase.com).
2. **SQL Editor → New query:** kör `supabase/schema.sql`, och sedan filerna i `supabase/migrations/` i nummerordning. `002_demo.sql` lägger till demolag som du kan ta bort senare med `delete from public.clubs where demo;`.
3. **Project Settings → API Keys:** kopiera **Project URL** och **publishable key** till `public/config.js`, och sätt `DEMO = false`. Den hemliga nyckeln (`sb_secret_…`) och databaslösenordet får aldrig finnas i koden.

### 2. Webbplatsen
1. Lägg koden i ett eget GitHub-repo.
2. Netlify → **Add new project → Import an existing project** → välj repot. Netlify läser `netlify.toml` och publicerar `public/`.
3. Netlify → **Forms:** slå på formulärdetektering och lägg till en e-postavisering för formuläret `lagledare`.

### 3. Inloggning
1. Supabase → **Authentication → URL Configuration:** sätt **Site URL** till din Netlify-adress och lägg till `<din adress>/admin.html` under **Redirect URLs**.
2. Gå till `/admin.html`, skriv din e-post och klicka på länken i mejlet.
3. Gör dig till superadmin i SQL Editor:
   ```sql
   insert into public.admins (user_id, name)
   select id, 'Ditt Namn' from auth.users where email = 'din@epost.se';
   ```
4. En lagledare som bara ska se sin egen förening läggs till med föreningens id:
   ```sql
   insert into public.admins (user_id, club_id, name)
   select u.id, c.id, 'Lagledarens Namn' from auth.users u, public.clubs c
   where u.email = 'lagledare@epost.se' and c.name = 'Föreningens namn';
   ```

### 4. Innan riktiga lag ansluter
- **Testa Swish** med ett riktigt föreningsnummer: att länken (`swish://payment?data=…`) och QR-koden (`C<nummer>;<belopp>;<meddelande>;0`) öppnar Swish med rätt mottagare, belopp och meddelande. Fråga gärna Swish eller banken om villkoren.
- **Anpassa** `public/villkor.html` och `public/integritet.html`, bland annat vem som är personuppgiftsansvarig. Låt gärna en jurist titta på dem.
- **Kontrollera varje förening** själv: ring kansliet på ett nummer du har letat upp och se att Swish-numret visar föreningens namn.
- Supabases gratisnivå **pausar projekt** som inte har använts på en vecka. En schemalagd GitHub Action som läser databasen ett par gånger i veckan håller den vaken.

## Licens

[MIT](LICENSE). Du får använda, ändra och sprida koden fritt, även kommersiellt, så länge licenstexten följer med.

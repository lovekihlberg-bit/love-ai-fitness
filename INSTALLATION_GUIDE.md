# Installation Guide - LOVE AI Fitness

Denna guide täcker hur man installerar, konfigurerar och kör LOVE AI Fitness-plattformen.

## System Requirements

- **Node.js**: 18.17+ (Vercel stödjer 18.17+)
- **npm/yarn**: Latest version
- **Git**: För version control
- **Supabase account**: Kostnads free tier räcker för utveckling
- **Anthropic API key**: För Claude AI Coach integration

## 1. Supabase Setup

### Skapa Supabase projekt
1. Gå till [supabase.com](https://supabase.com)
2. Logga in eller skapa konto
3. Klicka "New Project"
4. Fyll i:
   - **Name**: love-ai-fitness
   - **Database Password**: Spara detta säkert!
   - **Region**: Närmaste din placering (t.ex. eu-west-1)
5. Vänta på att projektet initialiseras (~1 min)

### Köra database migrations

1. Öppna Supabase SQL Editor
2. Kopiera innehållet från `/supabase/migrations/004_final_complete_schema.sql`
3. Klistra in i SQL Editor
4. Klicka "Run"

Eller via CLI:
```bash
supabase db push
```

### Hämta connection strings

1. Gå till Settings → API
2. Kopiera:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` (håll hemlig!)

### Aktivera Authentication

1. Gå till Authentication → Providers
2. Aktivera "Email" (redan aktiverad som standard)
3. Gå till Settings → Auth
4. Sätt "Confirm email" på OFF för development

## 2. Seed Exercise Database

Exercisedatabasen behöver fyllas med ~1500 övningar.

### Option A: Använd pre-generated dataset
```bash
cd scripts/seed_exercises
node ingest_to_supabase.js --file ./sample_exercises.json
```

### Option B: Generera nytt dataset
```bash
cd scripts/seed_exercises
node generate_seed_dataset.js > exercises.json
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node ingest_to_supabase.js --file ./exercises.json
```

### Validera import
```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node ../validation/validate_exercises.js
```

## 3. Frontend Installation

### Klona och navigera
```bash
cd "Love Ai gym fitness"
```

### Installera dependencies
```bash
npm install
```

### Skapa .env.local
```bash
cp .env.example .env.local
```

Fyll i:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

### Kör utvecklingsserver
```bash
npm run dev
```

Öppna http://localhost:3000

## 4. Create First User Account

1. Gå till http://localhost:3000/signup
2. Skapa konto med:
   - Fullständigt namn: Love Kihlberg
   - Email: love@example.com
   - Lösenord: (välj ett starkt)

**Profilen skapas automatiskt** via Supabase Auth trigger `profiles_on_auth_user_signup`.

## 5. Test the Application

### Test Exercise Import
1. Gå till Dashboard → (kommer senare: Exercis Import)
2. Ladda upp exercises.json
3. Validering bör köra automatiskt

### Test Health Data Import
1. Gå till Dashboard → Hälsodata
2. Exportera data från Apple Health eller använd sample-data
3. Ladda upp JSON-fil
4. Validering + import bör fungera

### Test AI Coach
1. Gå till Dashboard → AI-Coach
2. Ställ en fråga som "Vad är min senaste träning?"
3. AI bör svara baserat på dina träningsdata

## 6. Deployment to Vercel

### Connect GitHub repo
1. Pusha koden till GitHub
2. Gå till [vercel.com](https://vercel.com)
3. Klicka "Import Project"
4. Välj GitHub repo

### Set Environment Variables
1. I Vercel dashboard, gå till Settings → Environment Variables
2. Lägg till:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ANTHROPIC_API_KEY=...
   ```
3. Klicka Deploy

### Domain Setup
1. Gå till Settings → Domains
2. Lägg till din domain
3. Update DNS records enligt instruktionerna

## 7. Production Checklist

- [ ] Database backups konfigurerade i Supabase
- [ ] Row Level Security (RLS) policies aktiverade
- [ ] Supabase SMTP email configured för password resets
- [ ] Rate limiting aktiverad för API endpoints
- [ ] Monitoring/alerting konfigurerad
- [ ] Error tracking setup (Sentry optional)
- [ ] Analytics konfigurerad (Vercel Analytics)
- [ ] HTTPS enforced
- [ ] Environment variables säkert lagra
- [ ] Backup & disaster recovery plan

## Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
```bash
npm install @supabase/supabase-js recharts lucide-react next-themes react-hook-form zod
```

### "NEXT_PUBLIC_SUPABASE_URL is missing"
Kontrollera .env.local är korrekt och att du har restartat dev server efter ändringar.

### "Row-level security (RLS) policy violation"
Kontrollera att du är inloggad och att RLS policies är korrekt konfigurerade i Supabase.

### "Claude API error"
Verifiera ANTHROPIC_API_KEY är korrekt och att ditt API-konto har credits.

### Database connection timeout
Check Supabase service status och nätverksanslutning. Försök igen senare.

## Folder Structure Reference

```
Love Ai gym fitness/
├── app/                          # Next.js app router
│   ├── (app)/                    # Autentiserade routes
│   │   ├── dashboard/
│   │   ├── training/
│   │   ├── exercises/
│   │   ├── analytics/
│   │   ├── ai-coach/
│   │   ├── health-data/
│   │   └── settings/
│   ├── api/                      # API routes
│   │   └── ai/chat/
│   ├── login/
│   ├── signup/
│   └── layout.tsx
├── components/                   # React components
│   ├── ui/                       # Base UI components
│   ├── layout/                   # Layout components
│   ├── dashboard/                # Dashboard components
│   ├── training/                 # Training components
│   ├── analytics/                # Analytics charts
│   └── health/                   # Health data components
├── lib/                          # Utilities
│   ├── contexts/                 # React Contexts
│   ├── hooks/                    # Custom hooks
│   └── utils.ts
├── public/                       # Static assets
├── scripts/                      # Backend scripts
│   ├── seed_exercises/
│   └── validation/
├── supabase/                     # Supabase configs
│   └── migrations/
├── .env.example                  # Environment template
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## Performance Tips

### Database Optimization
- Indexes already created on common queries
- Consider pg_trgm extension for fuzzy search
- Use materialized views for complex analytics

### Frontend Optimization
- Code splitting automatic via Next.js
- Image optimization via next/image
- Use React.memo for expensive components
- Implement virtual scrolling for large lists

### API Optimization
- Cache health metrics with SWR
- Use pagination for exercise lists
- Batch health data imports (500 rows at a time)

## Next Steps

1. **Test all features** thoroughly
2. **Setup CI/CD** pipeline with GitHub Actions
3. **Configure monitoring** (Sentry, LogRocket, etc.)
4. **Setup email notifications** for important events
5. **Create mobile app** version if needed
6. **Implement offline mode** with Service Workers

## Support & Documentation

- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Anthropic API: https://docs.anthropic.com

## Security Notes

- Never commit `.env.local` or secret keys to Git
- Use `.env.local.example` for team sharing
- Rotate API keys regularly
- Monitor Supabase logs for suspicious activity
- Implement rate limiting on sensitive endpoints
- Validate all user inputs server-side

## License

MIT License - See LICENSE file for details

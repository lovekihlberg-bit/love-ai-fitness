# LOVE AI Fitness - Quick Start Guide

**Din production-ready AI fitness-plattform är nu klar!** 

Här är steg-för-steg hur du startar upp och testar allt.

## ⚡ 5-Minute Quick Start

### 1. Installera dependencies
```bash
cd "Love Ai gym fitness"
npm install
```

### 2. Skapa .env.local
Kopiera från `.env.example` och fyll i dina API-nycklar:
```bash
cp .env.example .env.local
```

Hämta från:
- **Supabase**: https://supabase.com/dashboard → Settings → API
- **Anthropic**: https://console.anthropic.com/api/keys

### 3. Kör utvecklingsserver
```bash
npm run dev
```

Öppna http://localhost:3000

### 4. Skapa konto
- Gå till /signup
- Registrera dig (email + lösenord)
- Du är automatiskt inloggad och kan börja använda appen!

## 📊 Feature Tour

### Instrumentpanel (`/dashboard`)
- Överblick över återhämtningspoäng, hälsometriker, träningsstreak
- Senaste personliga rekord
- Snabbknappar för att logga träning

### Träningspass (`/training`)
- **Sök efter övning** (t.ex. "Bench Press")
- **Senaste pass visas automatiskt** när du väljer övning
- Logga set (vikt, reps, RPE)

### Övningsbibliotek (`/exercises`)
- Sök bland 1500+ övningar
- Filtrera efter utrustning/muskelgrupp
- Se svårighetsnivå och instruktioner

### Statistik (`/analytics`)
- **Sömn** - Sömnvaraktighet och kvalitet
- **HRV** - Hjärtfrekvarvariabilitet
- **Vilopuls** - Resting heart rate trends
- **VO2 Max** - Kardiovaskular fitness
- **Kroppsvikt** - Vikttracker
- **Kondition** - Aktivenergi
- **Aktivitet** - Stegräknare
- **Återhämtning** - Recovery scores
- **Puls** - Heart rate trends

Alla med time range filter (7d, 30d, 90d) och statistik!

### Hälsodata (`/health-data`)
- Importera från Apple Health / Health Auto Export
- Automatisk validering
- Import-historik

### AI-Coach (`/ai-coach`)
- Chat-gränssnitt
- Claude AI har tillgång till dina tränings- och hälsodata
- Ställ frågor: "Vad är mina senaste träningsresultat?" etc.

### Inställningar (`/settings`)
- Profilhantering
- Tema (ljust/mörkt)
- Notifieringar
- Data export/delete

## 🗄️ Database Setup

**OBS: Du måste köra migrations innan du kan använda appen!**

### Via Supabase Dashboard
1. Öppna Supabase → SQL Editor
2. Kopiera `/supabase/migrations/004_final_complete_schema.sql`
3. Klistra in och klicka "Run"

### Verifiera migrations kördes
```bash
cd scripts/validation
SUPABASE_URL=your-url SUPABASE_SERVICE_ROLE_KEY=your-key node validate_exercises.js
```

## 📥 Seed Exercise Database

Databasen behöver ~1500 övningar för att fungera ordentligt.

```bash
cd scripts/seed_exercises
SUPABASE_URL=your-url SUPABASE_SERVICE_ROLE_KEY=your-key node generate_seed_dataset.js > exercises.json
SUPABASE_URL=your-url SUPABASE_SERVICE_ROLE_KEY=your-key node ingest_to_supabase.js
```

Eller använd sample data:
```bash
SUPABASE_URL=your-url SUPABASE_SERVICE_ROLE_KEY=your-key node ingest_to_supabase.js --file ./sample_exercises.json
```

## 🧪 Testing

### Test Exercise Search
1. Gå till `/exercises`
2. Sök "squat" → bör visa relevanta övningar
3. Klicka filter → bör kunna filtrera på utrustning

### Test Workout Logging
1. Gå till `/training`
2. Sök "bench press"
3. Välj "Barbell Bench Press"
4. **Senaste pass bör visas automatiskt** 👈 Key feature!
5. Logga set: 100kg × 10 reps, RPE 8

### Test Health Data Import
1. Gå till `/health-data`
2. Ladda upp en Health Auto Export JSON-fil
3. Bör se import-resultat: antal importerade, duplikater, etc.

### Test AI Coach
1. Gå till `/ai-coach`
2. Ställ en fråga: "Vad är min genomsnittliga träningsfrekvens?"
3. AI bör svara baserat på dina träningsdata

## 🚀 Deployment to Vercel

```bash
# Push till GitHub
git add .
git commit -m "Initial commit: LOVE AI Fitness frontend"
git push origin main

# Connect to Vercel
# 1. Gå till vercel.com
# 2. Click "Import Project"
# 3. Välj din GitHub repo
# 4. Lägg till Environment Variables (från Supabase/Anthropic)
# 5. Click Deploy!
```

## 📚 File Structure Overview

```
Love Ai gym fitness/
├── app/
│   ├── (app)/              # Protected routes (requires login)
│   │   ├── dashboard/
│   │   ├── training/
│   │   ├── exercises/
│   │   ├── analytics/
│   │   ├── health-data/
│   │   ├── ai-coach/
│   │   └── settings/
│   ├── api/ai/chat/        # Claude API integration
│   ├── login/
│   └── signup/
├── components/
│   ├── ui/                 # Button, Card, Input, etc.
│   ├── layout/             # Header, Nav, Layout
│   ├── dashboard/
│   ├── training/           # Exercise search, set logger
│   ├── analytics/          # Charts
│   └── health/             # Health data import
├── lib/
│   ├── contexts/           # UserContext
│   ├── hooks/              # useSupabase, useHealthMetrics, etc.
│   └── utils.ts
└── scripts/                # Database seeding, validation
```

## 🔑 Key Architecture Decisions

### Previous Workout Display
```
When user selects exercise during logging:
1. Component: PreviousPerformance hook
2. Fetches: Latest set from exercise_sets table
3. Shows: Weight, reps, RPE, date
4. Auto-suggests: Next set based on latest
```

### Data Flow
```
Client (RLS-auth'd)   → Supabase (user data only)
       ↓
Server (/api/ai/chat) → Supabase (service role, full context)
       ↓
       → Claude API (personalized advice)
```

### Real-time Updates
- Health metrics update automatically via Supabase Realtime
- Chart data refreshes when new data arrives
- No manual refresh needed!

## 🐛 Common Issues & Fixes

### "Missing Supabase variables"
- Check `.env.local` exists
- Restart dev server after creating/updating `.env.local`
- Make sure keys are correct (copy-paste from Supabase)

### "Row-level security policy violation"
- Make sure you're logged in
- Check RLS policies are enabled in Supabase

### "Exercise search returns nothing"
- Did you run the seed script?
- Check exercises table has data: `SELECT COUNT(*) FROM exercises`

### "AI Coach returns error"
- Verify ANTHROPIC_API_KEY is correct
- Check your Anthropic API has credits
- Look at server logs for detailed error

### "Charts not rendering"
- Make sure browser window is wide enough
- Check console for JavaScript errors
- Try refreshing page

## 📖 Documentation

- **FRONTEND_README.md** - Detailed frontend architecture & features
- **INSTALLATION_GUIDE.md** - Step-by-step setup guide
- **SETUP.md** - Backend architecture & API documentation

## 🎯 What's Next?

1. **Test all features** thoroughly
2. **Customize colors/branding** in `tailwind.config.js`
3. **Add more analytics pages** using existing chart patterns
4. **Setup monitoring** (error tracking, analytics)
5. **Deploy to production** on Vercel
6. **Invite users** to beta test

## 💡 Pro Tips

- Use **Dark Mode** - Toggle in header to test both themes
- **Mobile-first** design - Test on mobile device or browser dev tools
- **Real-time sync** - Add health data on phone, see it update instantly
- **AI context** - AI Coach has access to your full health history
- **Performance** - App works offline for cached data (with Service Workers)

## 🆘 Need Help?

1. Check `/FRONTEND_README.md` for feature details
2. Check `/INSTALLATION_GUIDE.md` for setup help
3. Look at existing components for code patterns
4. Check Supabase logs for database issues
5. Check Anthropic docs for API issues

## 🎉 You're Ready!

Your production-ready LOVE AI Fitness platform is complete. Start with `/training` to experience the key feature (previous workout display) and work your way through the app.

**Happy coding!** ❤️

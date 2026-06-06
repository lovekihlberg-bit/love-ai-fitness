# LOVE AI Fitness - Frontend

En production-ready web-plattform för träning, hälsa och prestanda med AI-driven coaching.

## Arkitektur

### Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **UI**: React 18 + Tailwind CSS
- **Komponenter**: Shadcn/ui pattern
- **Datahämtning**: Supabase JavaScript Client
- **Grafer**: Recharts
- **Tema**: next-themes (ljust/mörkt läge)
- **AI**: Anthropic Claude API (server-side)
- **Deployment**: Vercel

### Katalogstruktur
```
app/
  (app)/                    # Autentiserade routes
    dashboard/              # Instrumentpanel
    training/               # Träningspass (logga övningar)
    exercises/              # Övningsbibliotek
    analytics/              # Statistik (9 sub-sidor)
    ai-coach/               # AI-Coach chat
    settings/               # Inställningar
  api/
    ai/chat/                # Claude API integration
  login/                    # Inloggning
  layout.tsx                # Root layout
  globals.css               # Tailwind CSS

components/
  ui/
    common.tsx              # Kard, Button, Input, Badge, Tabs
  layout/
    Layout.tsx              # Header, BottomNav, SideNav, Layout
  dashboard/
    DashboardCards.tsx      # Recovery score, metrics, streak, PR
  training/
    WorkoutLogger.tsx       # Övningssökning, tidigare prestation, set-logger
  analytics/
    AnalyticsCharts.tsx     # Slöm, HRV, Vilopuls, VO2, Vikt

lib/
  contexts/
    UserContext.tsx         # User state management
  hooks/
    useSupabase.ts          # Data fetching hooks
  utils.ts                  # Utility functions
```

## Features

### ✅ Instrumentpanel (Dashboard)
- Återhämtningspoäng
- Hälsometriker (HRV, Vilopuls, VO2 Max, Kroppsvikt)
- Träningsstreak
- Senaste personliga rekord
- Snabbåtgärder (Logga träning, Ladda hälsodata)

### ✅ Träningspass
- Övningssökning med autocomplete
- **Senaste pass** - Visar automatiskt tidigare prestanda när du väljer övning
- Logga set (vikt, reps, RPE)
- Workout session hantering

### ✅ Övningsbibliotek
- Sök bland 1500+ övningar
- Filter efter utrustning (Barbell, Dumbbell, Machine, etc.)
- Filter efter muskelgrupp
- Svårighetsnivå och instruktioner

### ✅ Statistik (9 undersidor)
1. **Sömn** - Sömnvaraktighet och sömnkvalitet
2. **HRV** - Hjärtfrekvarvariabilitet
3. **Vilopuls** - Resting heart rate trends
4. **VO2 Max** - Kardiovaskular fitness
5. **Kroppsvikt** - Vikttracker
6. **Kondition** - Aktivenergi
7. **Aktivitet** - Stegräknare
8. **Återhämtning** - Recovery scores
9. **Puls** - Heart rate trends

Med time range filter (7d, 30d, 90d) och statistik (avg, min, max, trend).

### ✅ Hälsodata
- Importera från Health Auto Export JSON
- Validering innan commit
- Historik över importeringar

### ✅ AI-Coach
- Chat-gränssnitt
- Tillgång till användarens tränings- och hälsodata
- Personaliserade träningsråd
- Sparade konversationer

### ✅ Inställningar
- Profilhantering
- Tema (ljust/mörkt)
- Notifieringar
- Dataexport
- Logout

## Installation

### Förutsättningar
- Node.js 18+
- npm eller yarn
- Supabase projekt
- Anthropic API nyckel

### Setup

1. **Klona och installera**
```bash
cd "Love Ai gym fitness"
npm install
```

2. **Environment variabler**
Skapa `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

3. **Kör utvecklingsserver**
```bash
npm run dev
```
Öppna http://localhost:3000

## Key Implementation Details

### Tidigare träningsdata (Senaste pass)
När du väljer en övning under träning:
1. Komponenten `usePreviousPerformance` fetchar senaste set från `exercise_sets`
2. Visar: vikt, reps, RPE, datum
3. Auto-suggest nästa set baserat på senaste prestation

```typescript
const { performance, loading } = usePreviousPerformance(userId, exerciseId)
// performance: { weight, reps, rpe, created_at }
```

### Data Flow Architecture
```
Client (RLS-autentiserad) → Supabase
├─ Hämtar egna träningsdata (RLS enforced)
├─ Hämtar egna hälsomätningar
└─ Skriver egna workout sessions

Server (Service Role) → Supabase
├─ Fetchar användarens full kontext för AI Coach
├─ Sparar AI-konversationer
└─ Aggregerar data för analytics
```

### Real-time Updates
Health metrics har real-time subscriptions via Supabase Realtime:
```typescript
const subscription = supabase
  .channel(`health_metrics_${profileId}`)
  .on('postgres_changes', ...)
  .subscribe()
```

## Styling

### Design System
- **Färger**: Blue (primary), Green (success), Red (error), Gray (neutral)
- **Typografi**: System font stack
- **Spacing**: Tailwind default (4px base unit)
- **Border radius**: lg (8px) för cards, rounded (4px) för buttons

### Dark Mode
Implementeras via `next-themes`:
```tsx
<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
```

Alla komponenter supporterar dark: class variants.

## Deployment

### Vercel
```bash
vercel login
vercel
```

Sätt environment variabler i Vercel dashboard.

### Docker (alternativ)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## API Routes

### POST /api/ai/chat
Skicka meddelande till Claude AI Coach.

**Request:**
```json
{
  "message": "Hur bör jag öka min styrka?",
  "profileId": "user-uuid",
  "conversationId": "conv-uuid"
}
```

**Response:**
```json
{
  "response": "Baserat på dina senaste... [AI-svar]",
  "conversationId": "conv-uuid"
}
```

## State Management

### UserContext
Lagrar och ger åtkomst till aktuell användares data:
```typescript
const { user, setUser, loading } = useUser()
```

### Data Fetching Hooks
- `useHealthMetrics(profileId, metricKey, days)` - Real-time health metrics
- `useExercises(searchTerm, limit)` - Exercise search with debounce
- `usePreviousPerformance(profileId, exerciseId)` - Latest set data
- `useWorkoutHistory(profileId, limit)` - Workout sessions
- `usePersonalRecords(profileId)` - PR list

## Testing

### Unit Tests (TODO)
```bash
npm run test
```

### E2E Tests (TODO)
```bash
npm run test:e2e
```

## Performance Optimization

- Code splitting på page-nivå
- Image optimization via Next.js
- Recharts lazy loading
- Debounced search (300ms)
- SWR caching (client-side data)
- Service Worker för offline mode (optional)

## Accessibility

- Semantic HTML
- ARIA labels på interactive elements
- Keyboard navigation
- Color contrast WCAG AA minimum
- Mobile-first responsive design

## Troubleshooting

### "Missing Supabase environment variables"
Kontrollera `.env.local` har alla variabler satta.

### "User not authenticated"
Logga in eller skapa nytt konto. Check Supabase Auth status.

### "Charts not rendering"
Recharts behöver viewport width. Check window resize events.

### "AI Coach error"
Kontrollera ANTHROPIC_API_KEY är korrekt satt.

## Contributing

1. Skapa feature branch
2. Commit changes
3. Push och skapa Pull Request

## License

MIT

## Support

Kontakta support@loveai.fitness eller skapa GitHub issue.

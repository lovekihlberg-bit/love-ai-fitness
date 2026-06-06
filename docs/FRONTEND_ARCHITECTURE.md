# LOVE AI FITNESS — Frontend Architecture

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + CSS-in-JS
- **UI Components**: shadcn/ui + custom components
- **Forms**: React Hook Form + Zod validation
- **State Management**: React Context / Zustand
- **HTTP Client**: @supabase/supabase-js
- **Charts**: Recharts
- **Icons**: lucide-react
- **Theme**: next-themes (dark/light mode)
- **Animations**: Framer Motion

## Directory Structure

```
app/
├── (auth)/
│   ├── login/
│   ├── signup/
│   └── forgot-password/
├── (app)/
│   ├── dashboard/
│   ├── training/
│   │   ├── new/
│   │   ├── [id]/
│   │   └── history/
│   ├── exercises/
│   ├── templates/
│   ├── analytics/
│   │   ├── sleep/
│   │   ├── hrv/
│   │   ├── resting-heart-rate/
│   │   ├── vo2max/
│   │   ├── bodyweight/
│   │   └── recovery/
│   ├── health-data/
│   ├── ai-coach/
│   └── settings/
├── api/
├── components/
│   ├── layout/
│   ├── dashboard/
│   ├── training/
│   ├── exercises/
│   ├── analytics/
│   ├── common/
│   └── ui/
├── lib/
├── hooks/
├── types/
├── styles/
└── utils/

```

## Design System

### Color Palette (Dark/Light)

**Primary**: #3B82F6 (Blue)
**Secondary**: #10B981 (Green)
**Accent**: #F59E0B (Amber)
**Success**: #10B981
**Warning**: #F59E0B
**Error**: #EF4444
**Background Dark**: #0F172A
**Background Light**: #FFFFFF
**Surface Dark**: #1E293B
**Surface Light**: #F8FAFC

### Typography

- **Headings**: Inter, 700
- **Body**: Inter, 400
- **Monospace**: JetBrains Mono

### Spacing

- Base unit: 4px
- Scale: 4, 8, 12, 16, 24, 32, 40, 48, 56, 64

### Border Radius

- Small: 4px
- Medium: 8px
- Large: 12px
- Full: 9999px

## Pages & Components

### 1. Instrumentpanel (Dashboard)

**Purpose**: Overview of user's current health, fitness status, and streaks.

**Components**:
- `Header` (user greeting, date)
- `RecoveryScore` (card: återhämtningspoäng)
- `TodayReadiness` (card: dagens beredskap)
- `HealthMetrics` (grid of: HRV, vilopuls, VO2 Max, kroppsvikt, sömnpoäng)
- `TrainingStreak` (card: träningsstreak, veckovolym)
- `LatestPR` (card: senaste personligt rekord)
- `AIInsights` (card: AI-insikter)
- `QuickActions` (buttons: logga träning, ladda upp hälsodata)

**Data Sources**:
- `profiles` (user info)
- `recovery_data` (latest recovery_score)
- `health_metrics` (latest HRV, heart_rate, VO2, bodyweight)
- `sleep_data` (latest sleep score)
- `personal_records` (latest PR)
- `workout_sessions` (streak calculation)
- `ai_conversations` (latest insights)

**User Flow**:
1. Load user profile
2. Fetch latest metrics for each card
3. Calculate streaks from workout_sessions
4. Display AI insights from latest conversation
5. Show quick action buttons

---

### 2. Träningspass (Workout Logging)

**Pages**:
- `/training/new` — Start new workout
- `/training/[id]` — View/edit workout
- `/training/history` — View all workouts

**Components**:

#### New Workout Flow
- `WorkoutStart` (select template, time started)
- `ExerciseSearch` (autocomplete exercises, with previous performance)
- `PreviousPerformance` (show: senaste pass, weight, reps, sets, date)
- `SetLogger` (inline: weight, reps, RPE, duration)
- `ExerciseNotes` (text field)
- `RestTimer` (visual countdown)
- `WorkoutSummary` (total duration, exercises, total volume)
- `SaveButton` (save workout)

**Data Sources**:
- `exercises` (search by name_en)
- `workout_sessions` (create new)
- `workout_exercises` (link exercises to session)
- `exercise_sets` (log individual sets)
- `personal_records` (show previous, update on commit)

**Key Feature: Previous Performance Always Visible**
```
When user selects exercise:
1. Fetch latest 3 sets from this exercise
2. Display: senaste pass format
   "Senaste pass:
    80 kg × 8 reps
    3 sets
    2026-06-01"
3. Auto-suggest weight/reps for next set
```

**User Flow**:
1. Choose template or new workout
2. Search exercise (instant search with previous data)
3. Log sets (weight, reps, RPE)
4. Auto-calculate progression
5. Mark PR if new record
6. Save workout
7. View summary

---

### 3. Övningsbibliotek (Exercise Library)

**Components**:
- `ExerciseSearch` (search by name_en with autocomplete)
- `FilterBar` (muscle group, equipment, category, difficulty)
- `ExerciseCard` (name, primary muscles, equipment, difficulty, images)
- `ExerciseDetail` (full info: instructions_sv, muscles, images, videos, alternatives, similar)
- `PersonalStats` (user's best, avg, progression for this exercise)

**Data Sources**:
- `exercises` (search_vector, pg_trgm index)
- `personal_records` (user's best)
- `exercise_sets` (user's history with this exercise)

**Filtering**:
```sql
SELECT * FROM exercises
WHERE search_vector @@ to_tsquery('english', search_term)
  OR name_en ILIKE '%' || search_term || '%'
AND (muscle_group IS NULL OR primary_muscles @> ARRAY[muscle_group])
AND (equipment IS NULL OR equipment @> ARRAY[equipment_filter])
ORDER BY name_en
LIMIT 50;
```

**User Flow**:
1. Search by name or browse by muscle group
2. View exercise details
3. See personal stats (best, avg, PR)
4. View instructions and images
5. Tap to log in workout

---

### 4. Mallar (Workout Templates)

**Components**:
- `TemplateList` (list of user's templates)
- `TemplateCard` (name, split type, exercise count)
- `TemplateDetail` (exercises, order, notes)
- `TemplateCreate` (name, split type, add exercises)
- `TemplateEdit` (edit existing)

**Data Sources**:
- `workout_templates` (user's templates)
- `workout_exercises` (exercises in template)
- `exercises` (exercise info)

**User Flow**:
1. View all templates
2. Create new template (name, split)
3. Add exercises to template
4. Reorder exercises
5. Use template when logging workout
6. Edit or delete template

---

### 5. Statistik (Analytics Hub)

**Components**:
- `AnalyticsNav` (tabs: sömn, HRV, vilopuls, puls, VO2 Max, kroppsvikt, kondition, återhämtning, aktivitet)
- Each tab shows same pattern:
  - `TimeRangeSelector` (7d, 30d, 90d, 1y, custom)
  - `Chart` (Recharts line/bar/area)
  - `Stats` (avg, min, max, trend)
  - `Insights` (generated by AI or calculated)

**Pages**:
- `/analytics/sleep`
- `/analytics/hrv`
- `/analytics/resting-heart-rate`
- `/analytics/vo2max`
- `/analytics/bodyweight`
- `/analytics/recovery`
- `/analytics/activity`

**Components per analytics page**:
- `TrendChart` (line chart with 7-day moving average)
- `DistributionChart` (histogram or bar chart)
- `StatCard` (current, avg, min, max, trend %)
- `InsightCard` (AI-generated insight or auto-calculated pattern)

**Data Sources**:
- `health_metrics` (generic metrics)
- `sleep_data` (sleep-specific)
- `heart_rate_data` (HR-specific)
- `hrv_data` (HRV-specific)
- `vo2max_data` (VO2 Max-specific)
- `bodyweight_data` (bodyweight-specific)
- `recovery_data` (recovery scores)

---

### 6. Hälsodata (Health Data Import)

**Components**:
- `ImportUpload` (drag-drop area for JSON/CSV)
- `FilePreview` (show sample of uploaded file)
- `ImportProgress` (progress bar, status)
- `ValidationReport` (show validation results from validation_reports table)
- `ImportHistory` (list of past imports)
- `DataBrowser` (view all imported health_metrics)

**Data Sources**:
- `health_imports` (import history)
- `health_imports_staging` (pending imports)
- `validation_reports` (validation results)
- `health_metrics` (all imported metrics)

**User Flow**:
1. Upload Health Auto Export JSON/CSV
2. See file preview
3. Monitor import progress
4. View validation report
5. On success: data automatically distributed to Sömn, HRV, etc. pages
6. View import history

---

### 7. Sömn (Sleep Analytics)

**Similar to other analytics pages**:
- Chart: sleep duration over time
- Stats: avg sleep, sleep stages distribution
- Trend: how sleep quality trends
- Insights: AI-generated patterns

**Special Components**:
- `SleepStagesBreakdown` (stacked bar: light, deep, REM)
- `SleepSchedule` (timeline of sleep sessions)

---

### 8. HRV, Vilopuls, VO2 Max, Kroppsvikt, Återhämtning

Similar analytics structure. Each page tailored to specific metric.

---

### 9. AI-Coach

**Components**:
- `ChatInterface` (messages, input, send)
- `MessageBubble` (user vs AI styling)
- `ContextBar` (show what data AI is viewing: "Baserat på 6 månader träningsdata")
- `QuickQueries` (suggested questions: "Hur utvecklas min bänkpress?", "Varför har min styrka stagnerat?")
- `ReportGenerator` (buttons: veckorapport, månadsrapport, träningsprogram)

**Data Sources**:
- `ai_conversations` (chat history)
- All user data (via service role key, server-side)

**AI Integration**:
- Server-side API route `/api/ai/chat`
- Fetches relevant user data based on query
- Sends context + user message to Claude
- Saves conversation to `ai_conversations`
- Returns response

**User Flow**:
1. Ask question about training, health, progress
2. AI retrieves context (last 6 months data)
3. AI analyzes and responds with data-backed insights
4. View conversation history
5. Generate reports

---

### 10. Inställningar (Settings)

**Components**:
- `ProfileEdit` (name, height, timezone, etc.)
- `ThemeToggle` (dark/light mode)
- `NotificationSettings` (push, email preferences)
- `DataExport` (download all user data as JSON/CSV)
- `DataDelete` (delete account)
- `About` (version, contact)
- `Logout` (sign out)

**Data Sources**:
- `profiles` (user settings)

---

## Data Flow Architecture

### Client → Supabase RLS Flow

```
User logged in (auth.uid())
↓
Client queries with RLS enabled
↓
Supabase enforces profile_id = auth.uid()
↓
User only sees own data
```

### Server-side (AI Coach, Analytics Aggregation)

```
Service role key (server-side only)
↓
Fetch all user data for analysis
↓
Compute insights
↓
Return to client (with user ID verification)
```

### Real-time Updates

- Use `supabase.from('table').on('*')` for live updates (e.g., new health metrics)
- Optional: WebSocket subscriptions for collaborative features

---

## Component Composition

### Common Layout Components

```typescript
<Layout>
  <Header />
  <BottomNav />
  <MainContent />
</Layout>
```

### Card Pattern

```typescript
<Card className="p-4 rounded-lg bg-surface dark:bg-surface-dark">
  <CardTitle>Title</CardTitle>
  <CardContent>{content}</CardContent>
</Card>
```

### Form Pattern

```typescript
<Form>
  <FormField name="field" label="Label" type="text" />
  <FormField name="field" label="Label" type="number" />
  <SubmitButton />
</Form>
```

---

## State Management

**Contexts**:
- `UserContext` (profile, auth state)
- `ThemeContext` (dark/light mode)
- `TrainingContext` (current workout state)

**Zustand stores** (optional):
- `useHealthMetrics` (cached metrics)
- `useExercises` (cached exercises)

---

## Key Features Implementation

### 1. Previous Workout Always Visible

```typescript
// During exercise selection
const [selectedExercise, setSelectedExercise] = useState(null);

useEffect(() => {
  if (selectedExercise) {
    // Fetch latest sets for this exercise
    const { data: sets } = await supabase
      .from('exercise_sets')
      .select('weight, reps, created_at')
      .eq('workout_exercise_id', workoutExerciseId)
      .order('created_at', { ascending: false })
      .limit(3);
    
    // Display "Senaste pass:" component
    setPreviousPerformance(sets[0]);
  }
}, [selectedExercise]);
```

### 2. Instant Search with Previous Data

```typescript
// ExerciseSearch component
const handleSearch = async (query) => {
  const { data: exercises } = await supabase
    .from('exercises')
    .select('*, 
      (SELECT weight, reps, created_at FROM exercise_sets 
       WHERE exercise_id = exercises.id 
       ORDER BY created_at DESC LIMIT 1)')
    .ilike('name_en', `%${query}%`)
    .limit(20);
  
  // Display exercises with previous performance inline
};
```

### 3. Health Data Distribution

```typescript
// After import success, data auto-appears on:
// - Sleep page (from sleep_data)
// - HRV page (from hrv_data)
// - Heart rate page (from heart_rate_data)
// - Bodyweight page (from bodyweight_data)
// - Dashboard (from health_metrics aggregation)
```

---

## Mobile-First Breakpoints

```css
/* Mobile first */
@media (min-width: 768px) { /* Tablet */ }
@media (min-width: 1024px) { /* Desktop */ }
```

---

## Dark Mode Implementation

```typescript
// Using next-themes
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

// In components
import { useTheme } from 'next-themes'
const { theme, setTheme } = useTheme()
```

---

## Performance Optimization

- **Code splitting**: Route-based with Next.js
- **Image optimization**: next/image
- **API caching**: SWR for real-time data
- **Lazy loading**: Recharts, heavy components
- **Pagination**: Health data, workouts (infinite scroll)

---

## Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Color contrast WCAG AA
- Focus management

---

## Testing

- Unit tests: Jest
- Component tests: Testing Library
- E2E tests: Playwright
- Visual regression: Chromatic


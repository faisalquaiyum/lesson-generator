# 🎓 AI Lesson Generator

A full-stack multilingual AI-powered educational platform that generates highly interactive lessons in **11+ languages**. Built with Next.js 15, TypeScript, Supabase, and Google Gemini 2.0 Flash. Create engaging content from interactive tutorials with animations to comprehensive quizzes with gamification.

## ✨ Key Features

### 🌍 Multi-Language Support (11+ Languages)

- **Native Script Support**: Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada, Malayalam, Punjabi, Urdu, English
- **Romanized Input**: Also supports romanized Hindi (e.g., "ganit ka paath")
- **Language Detection**: Automatic script detection with AI-adapted content generation
- **Unicode Validation**: Full support for Indic scripts (Devanagari, Tamil, Telugu, etc.) and Arabic/Urdu
- **Educational Keywords**: 100+ keywords across all supported languages

### 🎮 Highly Interactive Content

- **15+ Interactive Patterns**: Flashcards, drag-drop, sliders, memory games, matching exercises, fill-in-blanks
- **Gamification**: Points, progress tracking, timed challenges, visual feedback, celebration animations
- **Live Simulations**: Input parameters and see real-time results
- **Step-by-Step Walkthroughs**: Guided learning with navigation controls
- **Interactive Diagrams**: Click to reveal, expand, and explore
- **Quiz Modes**: Multiple choice, fill-in-blank, timed quizzes with instant feedback

### 🎨 Modern Vibrant UI

- **Gradient Design**: Purple-blue-indigo theme with animated elements
- **Multilingual UI**: Hindi, Urdu, Tamil prompts throughout interface
- **Hero Section**: Animated bouncing graduation cap, gradient headings, feature badges
- **Enhanced Forms**: Gradient backgrounds, purple borders, multi-line tips with examples
- **Loading States**: Double spinner animations, pulse effects, progress messaging
- **Hover Effects**: Scale transforms, shadow transitions, border highlights

### 🔒 Enterprise-Grade Security & Validation

- **4-Layer Code Validation**: 11 TypeScript checks, AI-powered fixing, retry logic, database save guards
- **Multi-Language Input Validation**: Security checks across all 11 languages
- **SQL/Prompt Injection Prevention**: Pattern detection and blocking
- **XSS Protection**: Content sanitization and display filtering
- **Invisible Character Detection**: Unicode validation for zero-width chars
- **Code Size Limits**: 500KB maximum, 100 char minimum
- **Dangerous Pattern Detection**: Blocks eval, Function constructors in compiled code

### 🚀 Performance & Reliability

- **Network Resilience**: Exponential backoff retry (1s, 2s, 4s), AbortController timeouts
- **Duplicate Prevention**: 5-minute window check, returns 409 with existing lesson ID
- **Generation Timeout**: 10-minute max with Promise.race()
- **Visibility API**: Stops polling when tab hidden, resumes on focus
- **Offline Detection**: Checks navigator.onLine before submission
- **Rate Limiting**: 5 generations/min, 30 compilations/min with human-readable retry messages

### 📊 Edge Case Handling

- **Database Utilities**: Cleanup stuck lessons (>10 min), delete old failed lessons (>7 days)
- **Pagination**: Ready-to-use pagination utilities with filtering and sorting
- **Error Recovery**: Retry buttons, reload functionality, graceful degradation
- **Loading Skeletons**: Smooth loading states for better UX
- **Empty States**: Helpful messaging when no lessons exist

### 📈 Observability & Monitoring

- **LangSmith Tracing**: Complete visibility into AI workflows
- **Detailed Logging**: Language detection, generation progress, validation steps
- **Error Tracking**: Comprehensive error messages with suggestions
- **Performance Monitoring**: Request/response timing, timeout detection

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5
- **Styling**: Tailwind CSS with custom gradients and animations
- **Backend**: Next.js API Routes with edge case handling
- **Database**: Supabase (PostgreSQL) with RLS policies
- **AI Model**: Google Gemini 2.0 Flash (multilingual)
- **Compilation**: TypeScript Compiler API with sandbox execution
- **Tracing**: LangSmith for AI observability
- **Package Manager**: Bun (or npm/yarn)
- **Deployment**: Vercel-ready

## 🌟 Example Prompts

### English

```
Create an interactive quiz on Indian history with 10 questions
Teach me photosynthesis with animations and diagrams
Build a memory matching game for learning multiplication tables
```

### Hindi (हिंदी)

```
गणित का पाठ बनाओ - भिन्न के बारे में
विज्ञान पढ़ाओ - प्रकाश संश्लेषण
```

### Gujarati (ગુજરાતી)

```
ગણિત પાઠ બનાવો
વિજ્ઞાન શીખવો - પ્રકાશસંશ્લેષણ
```

### Urdu (اردو)

```
ریاضی کا سبق بنائیں
سائنس سکھائیں - نباتات کی خوراک
```

### Tamil (தமிழ்)

```
கணிதம் பாடம் உருவாக்கு
அறிவியல் கற்றுக்கொடு - ஒளிச்சேர்க்கை
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A Supabase account ([https://supabase.com](https://supabase.com))
- A Google Gemini API key ([https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey))
- A LangSmith account for tracing ([https://smith.langchain.com](https://smith.langchain.com))

### Installation

1. **Clone the repository** (if not already done):

   ```bash
   git clone <your-repo-url>
   cd lesson-generator
   ```

2. **Install dependencies**:

   ```bash
   bun install
   # or
   npm install
   ```

3. **Set up Supabase**:

   - Create a new project at [https://supabase.com](https://supabase.com)
   - Go to Settings > API to get your project URL and anon key
   - Go to SQL Editor and run the migration file:
     ```sql
     -- Copy and paste the contents of supabase/migrations/001_create_lessons_table.sql
     ```

4. **Configure environment variables**:

   Update `.env.local` with your credentials:

   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key

   # Google Gemini
   GEMINI_API_KEY=your-gemini-api-key

   # LangSmith (for tracing)
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_API_KEY=your-langsmith-api-key
   LANGCHAIN_PROJECT=lesson-generator
   ```

5. **Run the development server**:

   ```bash
   bun dev
   # or
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📖 Usage

### 1. Generate a Lesson

Enter a lesson outline and click "Generate Lesson". The AI will create interactive content based on your request:

**For Interactive Lessons** (explanations, tutorials, concepts):

- "Explain how photosynthesis works with diagrams"
- "Interactive lesson on the water cycle with key concepts"
- "Understanding JavaScript variables with examples"
- "The Pythagorean theorem explained step-by-step"

**For Quizzes** (assessments, tests):

- "A 10 question pop quiz on World War 2"
- "Test my knowledge on the solar system"
- "5 question quiz about Shakespeare"

**For Mixed Content** (learning + practice):

- "Learn about fractions with examples and a 5 question quiz"
- "Introduction to Python programming with practice exercises"

### 2. Watch the Status

- ⏳ **Generating**: AI is creating your lesson (auto-refreshes every 3s, pauses when tab hidden)
- ✅ **Generated**: Lesson is ready to view (click 📖 View Lesson)
- ❌ **Failed**: Generation encountered an error with details

### 3. Interact & Learn

Lessons include:

- **Interactive elements**: Clickable cards, sliders, drag-drop, fill-in-blanks
- **Visual feedback**: Color-coded answers, animations, progress bars
- **Gamification**: Points, scores, timed challenges, achievements
- **Rich content**: Diagrams, code examples, step-by-step guides
- **Navigation**: Back to home button using PostMessage API

## 🚀 Deployment

### Deploy to Vercel

1. **Push your code to GitHub**

2. **Deploy to Vercel**:

   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add all environment variables from `.env.local`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `GEMINI_API_KEY`
     - `LANGCHAIN_API_KEY`
     - `LANGCHAIN_PROJECT` (set to `lesson-generator`)
     - `LANGCHAIN_TRACING_V2` (set to `true`)
   - Deploy!

3. **Update Supabase CORS** (if needed):
   - Go to your Supabase project settings
   - Add your Vercel domain to allowed origins

### Production Considerations

- **Rate Limiting**: Current implementation uses in-memory Map. For production with multiple instances:
  - Use Redis or Vercel KV for distributed rate limiting
  - Example: `@vercel/kv` for persistent rate limit tracking
- **Environment Variables**: Ensure all secrets are configured in Vercel dashboard
- **Database Migrations**: Run Supabase migrations before deployment
- **Monitoring**: LangSmith provides comprehensive tracing and monitoring

### LangSmith Tracing Access

To grant tracing access to the team:

1. Go to [https://smith.langchain.com](https://smith.langchain.com)
2. Navigate to your project settings
3. Invite the following emails with "Viewer" role:
   - k@freestand.in
   - sushant@freestand.in
   - abhishek.d@freestand.in
   - pratik@freestand.in

## 🏗️ Architecture

### Generation Pipeline

1. **Rate Limit Check**: Verify user hasn't exceeded 5 generations/minute
2. **User Input**: User submits a lesson outline
3. **Database Record**: Create initial lesson record with "generating" status
4. **Background Job**: Trigger async AI generation
5. **Title Extraction**: Gemini extracts a concise title
6. **Code Generation**: Gemini generates complete TypeScript component with adaptive content:
   - Interactive lessons with diagrams and expandable sections
   - Paginated quizzes with navigation and scoring
   - Mixed content combining learning and practice
7. **Validation**: Multi-step validation with automatic retry (up to 3 attempts)
8. **Error Correction**: If validation fails, Gemini attempts to fix the code
9. **Database Update**: Update lesson with generated content or error
10. **Client Polling**: Frontend polls for status updates every 3 seconds (only when generating)

### Rendering Pipeline

1. **Compilation Request**: Rate-limited (30/minute) TypeScript compilation
2. **Code Transformation**: Remove imports, exports, and "use client" directives
3. **TypeScript Compilation**: Transpile to JavaScript using TypeScript Compiler API
4. **Sandbox Execution**: Load compiled code in iframe with `allow-scripts allow-top-navigation`
5. **React Rendering**: Component renders with React 18 from CDN
6. **PostMessage Communication**: Safe navigation back to home via message passing

### Security Features

- **Rate Limiting**: In-memory IP-based throttling (production: use Redis)
- **Sandbox Isolation**: Generated code runs in isolated iframe
- **Code Validation**: Checks for dangerous patterns and proper structure
- **Safe Navigation**: PostMessage API prevents direct cross-frame access
- **Input Sanitization**: Validation of all user inputs and AI outputs

### Reliability Features

- **Automatic Retries**: Up to 3 attempts for generation and validation
- **Code Validation**: Checks for proper React structure, balanced syntax, and dangerous patterns
- **Error Recovery**: AI-powered code fixing when validation fails
- **Graceful Degradation**: Clear error messages and status tracking
- **Optimized Polling**: Only polls when lessons are actively generating

### LangSmith Tracing

All AI operations are traced with LangSmith:

- Title extraction
- Code generation attempts (with prompt details)
- Validation and fixing steps
- Complete end-to-end workflow
- Performance metrics and error tracking

View traces at: [https://smith.langchain.com](https://smith.langchain.com)

## 💻 Development

### Project Structure

```
lesson-generator/
├── app/
│   ├── api/
│   │   ├── compile/route.ts          # TypeScript compilation (500KB limit, security checks)
│   │   └── lessons/
│   │       ├── route.ts              # GET all lessons
│   │       ├── [id]/route.ts         # GET single lesson
│   │       └── generate/route.ts     # POST generate (rate-limited, duplicate check, timeout)
│   ├── lessons/[id]/page.tsx         # Lesson view with enhanced loading states
│   ├── page.tsx                      # Home page with multilingual UI, retry logic
│   ├── layout.tsx                    # Root layout
│   └── globals.css                   # Gradient styles
├── components/ui/                    # Shadcn components
├── lib/
│   ├── lesson-generator.ts           # AI generation with language detection
│   ├── validate-prompt.ts            # Multi-language validation (11+ languages)
│   ├── database-utils.ts             # Cleanup utilities, pagination
│   ├── utils-edge-cases.ts           # Network retry, timeout, formatting helpers
│   ├── rate-limit.ts                 # Rate limiting
│   ├── types.ts                      # 11-point TypeScript validation
│   └── supabase/                     # Supabase clients
├── supabase/migrations/
│   └── 001_create_lessons_table.sql
├── LANGUAGES.md                      # Language support documentation
├── VALIDATION_SYSTEM.md              # Code validation documentation
└── tailwind.config.ts                # Purple-blue-indigo gradients
```

### Key Files

- **`lib/lesson-generator.ts`**: Core AI generation with comprehensive prompts for interactive lessons, quizzes, and mixed content. Includes LangSmith tracing, title extraction, code generation, and validation with retries.

- **`lib/rate-limit.ts`**: In-memory rate limiter with IP tracking, automatic cleanup, and configurable limits. Returns rate limit headers for API responses.

- **`app/api/compile/route.ts`**: TypeScript compilation endpoint using TypeScript Compiler API. Removes imports/exports, compiles to ES5, and enforces 30 requests/minute rate limit.

- **`app/api/lessons/generate/route.ts`**: Lesson generation endpoint with 5 requests/minute rate limit. Creates DB record, triggers background generation, returns immediately with rate limit headers.

- **`app/lessons/[id]/page.tsx`**: Lesson viewer with TypeScript compilation, iframe sandbox execution, and PostMessage-based navigation. Handles loading states and error display.

- **`app/page.tsx`**: Home page with lesson list table, generation form, status polling, and custom navy-teal UI. Shows emoji indicators for lesson status.

## 🔧 Troubleshooting

### Lesson generation fails

- **Rate Limit**: Check if you've exceeded 5 generations/minute. Wait 60 seconds and retry.
- **API Key**: Verify `GEMINI_API_KEY` is valid in `.env.local`
- **Traces**: Check LangSmith traces at [smith.langchain.com](https://smith.langchain.com) for detailed error information
- **Input**: Ensure the outline is clear and specific with enough detail for AI to generate content

### Component won't render / Compilation errors

- **Browser Console**: Check for JavaScript errors in developer tools
- **Database**: Verify the generated code in Supabase `lessons` table
- **Compilation**: Check that `/api/compile` endpoint is working (inspect Network tab)
- **Sandbox**: Ensure iframe has proper sandbox attributes (`allow-scripts allow-top-navigation`)
- **React**: Verify React 18 CDN scripts are loaded in iframe srcdoc

### Rate limit exceeded

- **Generation**: 5 requests per minute per IP address
- **Compilation**: 30 requests per minute per IP address
- **Solution**: Wait for the limit window to reset (60 seconds)
- **Production**: Consider implementing Redis-based distributed rate limiting

### Database connection issues

- **Supabase URL**: Verify `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
- **Anon Key**: Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
- **Service Role**: Verify `SUPABASE_SERVICE_ROLE_KEY` for background operations
- **Migration**: Ensure `001_create_lessons_table.sql` was run successfully
- **RLS**: Verify Row Level Security policies allow public read access

### Styling issues

- **Colors**: Custom palette defined in `tailwind.config.ts` (brand.navy, brand.blue, brand.teal, brand.light)
- **Dark Mode**: May need adjustment if theme-switcher is re-enabled
- **Responsive**: Test on different screen sizes for layout issues

## 🎯 Future Enhancements

- [ ] **Distributed Rate Limiting**: Replace in-memory Map with Redis/Vercel KV
- [ ] **Cron Jobs**: Scheduled cleanup of stuck/old lessons using Vercel Cron
- [ ] **Pagination API**: Implement pagination endpoints for lesson list
- [ ] **SVG/Image Generation**: AI-generated custom diagrams and visuals
- [ ] **More Languages**: Add support for additional regional languages
- [ ] **User Accounts**: Authentication for lesson ownership and history
- [ ] **Export Functionality**: Download as HTML/PDF
- [ ] **Analytics Dashboard**: Track usage, completion rates, popular topics
- [ ] **Lesson Templates**: Pre-built templates by subject
- [ ] **Voice Input**: Speech-to-text for prompt input
- [ ] **Accessibility**: Enhanced ARIA labels, keyboard navigation

## License

MIT

## Support

For issues or questions, please check:

1. LangSmith traces for AI generation details
2. Browser console for client-side errors
3. Vercel logs for server-side errors

# 🎓 AI Lesson Generator

A full-stack application that generates diverse interactive educational content using AI. Built with Next.js, TypeScript, Supabase, and Google Gemini. Create engaging lessons ranging from interactive tutorials with diagrams to comprehensive quizzes.

## ✨ Features

### 🤖 AI-Powered Content Generation

- **Interactive Lessons**: Educational content with visual diagrams, expandable sections, and structured explanations
- **Quiz Generation**: Paginated quizzes with next/previous navigation and instant scoring
- **Mixed Content**: Combination of learning materials and practice questions
- **Smart Compilation**: TypeScript to JavaScript compilation in secure iframe sandbox

### 🎨 Modern UI/UX

- **Custom Color Palette**: Professional navy-teal theme (#0C2B4E, #1A3D64, #1D546C, #F4F4F4)
- **Responsive Design**: Mobile-first with Tailwind CSS
- **Real-time Updates**: Automatic polling for lesson generation status
- **Animated Elements**: Smooth transitions, hover effects, and loading states
- **Status Tracking**: Visual badges for generating, generated, and failed states

### 🔒 Security & Performance

- **Rate Limiting**: 5 lesson generations/minute, 30 compilations/minute
- **Sandbox Execution**: Generated code runs in isolated iframe
- **Safe Navigation**: PostMessage API for cross-frame communication
- **TypeScript Validation**: Multi-step validation with automatic retry logic

### 📊 Observability

- **LangSmith Tracing**: Complete visibility into AI workflows
- **Error Tracking**: Detailed error messages and recovery flows
- **Performance Monitoring**: Request/response timing and status codes

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with rate limiting
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini 2.0 Flash
- **Compilation**: TypeScript Compiler API
- **Tracing**: LangSmith
- **Package Manager**: Bun
- **Deployment**: Vercel

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

- ⏳ **Generating**: AI is creating your lesson (automatic updates)
- ✅ **Generated**: Lesson is ready to view
- ❌ **Failed**: Generation encountered an error

### 3. View & Interact

Click "View Lesson" to:

- Explore interactive content with expandable sections
- View visual diagrams and concept boxes
- Take paginated quizzes with instant feedback
- Navigate back home or retry quizzes

### 📝 Example Prompts

**Interactive Lessons:**

```
Interactive lesson explaining how the solar system works with diagrams and key concepts
```

```
Step-by-step explanation of long division with examples
```

```
Understanding the Cartesian Grid with visual examples
```

**Quizzes:**

```
A 10 question pop quiz on Florida history
```

```
Test on basic algebra concepts
```

**Mixed:**

```
Learn about the American Revolution with a 5 question quiz at the end
```

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
│   │   ├── compile/
│   │   │   └── route.ts              # TypeScript compilation endpoint
│   │   └── lessons/
│   │       ├── route.ts              # GET all lessons
│   │       ├── [id]/route.ts         # GET single lesson
│   │       └── generate/route.ts     # POST generate lesson (rate-limited)
│   ├── lessons/
│   │   └── [id]/page.tsx            # Lesson view with iframe sandbox
│   ├── layout.tsx                    # Root layout with theme
│   ├── page.tsx                      # Home page with generation form
│   └── globals.css                   # Global styles with custom colors
├── components/
│   └── ui/                           # Shadcn UI components (badge, button, card, input, label)
├── lib/
│   ├── lesson-generator.ts           # AI generation logic with LangSmith
│   ├── rate-limit.ts                 # Rate limiting utility
│   ├── types.ts                      # TypeScript types & validation
│   ├── utils.ts                      # Utility functions
│   └── supabase/
│       └── server.ts                 # Server-side Supabase client
├── supabase/
│   └── migrations/
│       └── 001_create_lessons_table.sql
├── tailwind.config.ts                # Custom brand colors
└── .env.local                        # Environment variables
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

- [ ] **Distributed Rate Limiting**: Replace in-memory Map with Redis/Vercel KV for multi-instance deployments
- [ ] **SVG Generation**: AI-generated custom diagrams tailored to lesson content
- [ ] **Image Integration**: AI-generated images for visual enhancement
- [ ] **Lesson Templates**: Pre-built templates for common subjects (math, science, history, etc.)
- [ ] **Export Functionality**: Download lessons as standalone HTML files or PDFs
- [ ] **User Accounts**: Authentication system for lesson ownership and management
- [ ] **Sharing & Collaboration**: Share lessons via unique URLs, collaborative editing
- [ ] **Version History**: Track and restore previous versions of lessons
- [ ] **Analytics**: Track lesson usage, completion rates, quiz performance
- [ ] **Multi-language**: Generate lessons in different languages
- [ ] **Accessibility**: Enhanced ARIA labels, keyboard navigation, screen reader support
- [ ] **Caching**: Cache compiled TypeScript for faster subsequent loads

## License

MIT

## Support

For issues or questions, please check:

1. LangSmith traces for AI generation details
2. Browser console for client-side errors
3. Vercel logs for server-side errors

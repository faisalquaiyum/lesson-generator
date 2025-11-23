import { GoogleGenerativeAI } from "@google/generative-ai";
import { traceable } from "langsmith/traceable";
import { validateTypeScriptCode } from "./types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const titleModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const codeModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

interface GenerateLessonParams {
  outline: string;
  retryCount?: number;
}

interface GenerateLessonResult {
  success: boolean;
  code?: string;
  title?: string;
  error?: string;
}

const MAX_RETRIES = 3;

/**
 * Extract title from lesson outline
 */
const extractTitle = traceable(
  async (outline: string): Promise<string> => {
    const prompt = `Extract a short, clear title (max 60 characters) from the lesson outline. Return only the title, nothing else.\n\nLesson outline: ${outline}`;
    
    const result = await titleModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    return text.trim() || "Untitled Lesson";
  },
  { name: "extract_title" }
);

/**
 * Detect if the outline contains non-Latin scripts (Indian languages, Arabic, etc.)
 */
function detectLanguageScript(text: string): string {
  if (/[\u0900-\u097F]/.test(text)) return "Hindi/Marathi (Devanagari)";
  if (/[\u0A80-\u0AFF]/.test(text)) return "Gujarati";
  if (/[\u0A00-\u0A7F]/.test(text)) return "Punjabi (Gurmukhi)";
  if (/[\u0980-\u09FF]/.test(text)) return "Bengali";
  if (/[\u0B80-\u0BFF]/.test(text)) return "Tamil";
  if (/[\u0C00-\u0C7F]/.test(text)) return "Telugu";
  if (/[\u0C80-\u0CFF]/.test(text)) return "Kannada";
  if (/[\u0D00-\u0D7F]/.test(text)) return "Malayalam";
  if (/[\u0600-\u06FF]/.test(text)) return "Urdu (Arabic)";
  return "English";
}

/**
 * Detect if the outline requests animations or interactive elements
 */
function detectAnimationRequest(text: string): { needsAnimation: boolean; animationType: string[] } {
  const lowerText = text.toLowerCase();
  const animationKeywords = [
    'animation', 'animated', 'animate', 'animating',
    'transition', 'transitions', 'transitioning',
    'moving', 'motion', 'movement', 'move',
    'fade', 'fading', 'slide', 'sliding', 'zoom', 'zooming',
    'rotate', 'rotating', 'spin', 'spinning',
    'bounce', 'bouncing', 'pulse', 'pulsing',
    'interactive', 'interactivity', 'dynamic', 'dynamically',
    'visual effect', 'visual effects', 'effect',
    'transformation', 'transform'
  ];
  
  const detectedTypes: string[] = [];
  let needsAnimation = false;
  
  animationKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      needsAnimation = true;
      if (!detectedTypes.includes(keyword)) {
        detectedTypes.push(keyword);
      }
    }
  });
  
  return { needsAnimation, animationType: detectedTypes };
}

/**
 * Generate TypeScript React component code for a lesson
 */
const generateLessonCode = traceable(
  async (outline: string, attempt: number): Promise<string> => {
    const detectedLanguage = detectLanguageScript(outline);
    const isNonEnglish = detectedLanguage !== "English";
    
    const animationDetection = detectAnimationRequest(outline);
    
    const languageNote = isNonEnglish 
      ? `\n\nIMPORTANT: The lesson outline is in ${detectedLanguage}. Generate the lesson content in ${detectedLanguage} script while keeping the code structure and comments in English. The educational content should be in ${detectedLanguage} to match the user's request.`
      : "";
    
    const animationNote = animationDetection.needsAnimation
      ? `\n\n🎬 ANIMATION REQUIREMENT DETECTED! 
The user specifically requested animations/interactive elements (keywords: ${animationDetection.animationType.slice(0, 5).join(', ')}).

YOU MUST IMPLEMENT RICH ANIMATIONS AND VISUAL EFFECTS:

1. **CSS ANIMATIONS & TRANSITIONS** (REQUIRED):
   - Use Tailwind animation classes: animate-bounce, animate-spin, animate-pulse, animate-ping
   - Add custom transitions: transition-all duration-500 ease-in-out
   - Use transform effects: hover:scale-110, hover:rotate-3, hover:-translate-y-2
   - Add smooth opacity changes: opacity-0 to opacity-100
   - Implement gradient animations using CSS keyframes

2. **REACT STATE-BASED ANIMATIONS** (REQUIRED):
   - Use useState to control animation states (isAnimating, showElement, currentStep)
   - Implement step-by-step reveals with smooth transitions
   - Add progressive disclosure: elements appear one by one with delays
   - Create entrance animations: elements slide in, fade in, or scale up on mount

3. **INTERACTIVE ANIMATED ELEMENTS** (REQUIRED):
   - Clicking cards/buttons triggers visual transformations (flip, expand, color change)
   - Hover effects with smooth transitions (scale, shadow, glow effects)
   - Progress bars that animate from 0% to target value
   - Counter animations that count up to target numbers
   - Loading states with spinners and skeleton screens

4. **SPECIFIC ANIMATION PATTERNS TO USE**:
   - **Fade Effects**: Elements fade in/out using opacity transitions
   - **Slide Animations**: Elements slide from left/right/top/bottom
   - **Scale Animations**: Elements grow/shrink smoothly
   - **Rotate Animations**: Elements rotate on interaction
   - **Stagger Animations**: Multiple elements animate in sequence with delays
   - **Particle Effects**: Create visual celebrations (confetti-like effects using multiple animated divs)
   - **Morph Animations**: Smooth transitions between different shapes/states
   - **Path Animations**: Elements move along a path
   - **Wave Animations**: Create ripple or wave effects
   - **Pulsing Glow**: Add glowing effects that pulse

5. **TIMING & SEQUENCING**:
   - Use setTimeout/setInterval for timed animations
   - Implement animation queues: one animation triggers after another
   - Add delays between multiple animated elements (100ms, 200ms, 300ms...)
   - Use useEffect to trigger animations on component mount or state changes

6. **VISUAL FEEDBACK**:
   - Every click should produce visible feedback (scale, color change, ripple)
   - Correct answers: green glow, checkmark animation, celebration effects
   - Wrong answers: red shake animation, gentle bounce
   - Loading: smooth spinner, progress bar, or skeleton animation
   - Completion: confetti effect, success animation, trophy bounce

7. **TAILWIND ANIMATION CLASSES TO USE**:
   - animate-bounce animate-spin animate-pulse animate-ping
   - transition-transform transition-opacity transition-colors
   - duration-150 duration-300 duration-500 duration-700 duration-1000
   - ease-in ease-out ease-in-out
   - delay-75 delay-100 delay-150 delay-200 delay-300 delay-500 delay-700 delay-1000

8. **EXAMPLE ANIMATION IMPLEMENTATIONS**:
   \`\`\`typescript
   // Fade in animation
   const [isVisible, setIsVisible] = useState(false);
   useEffect(() => { setIsVisible(true); }, []);
   <div className={\`transition-opacity duration-1000 \${isVisible ? 'opacity-100' : 'opacity-0'}\`}>
   
   // Stagger animation
   {items.map((item, i) => (
     <div key={i} className="animate-fade-in" style={{ animationDelay: \`\${i * 100}ms\` }}>
   
   // Scale on hover with smooth transition
   <button className="transition-transform duration-300 hover:scale-110 active:scale-95">
   
   // Progress counter animation
   const [count, setCount] = useState(0);
   useEffect(() => {
     const timer = setInterval(() => {
       setCount(prev => prev < target ? prev + 1 : prev);
     }, 50);
     return () => clearInterval(timer);
   }, []);
   
   // Card flip animation
   const [isFlipped, setIsFlipped] = useState(false);
   <div className={\`transition-transform duration-500 \${isFlipped ? 'rotate-y-180' : ''}\`}>
   \`\`\`

CRITICAL: Since animations were explicitly requested, create a visually dynamic, engaging experience with smooth, professional animations throughout. Don't just add basic hover effects - implement sophisticated animation sequences!`
      : "";
    
    const prompt = `You are an expert educational content creator and TypeScript developer.

Generate a complete, self-contained React component in TypeScript that implements the requested lesson.${languageNote}${animationNote}

CRITICAL REQUIREMENTS:
1. Return ONLY valid TypeScript/React code - no markdown, no explanations, no code fences
2. Must start with a default export: "export default function LessonComponent() {"
3. VARIABLE DECLARATION ORDER (CRITICAL): Declare ALL variables (questions, items, cards, etc.) BEFORE using them in useState, calculations, or JSX. NEVER reference a variable before it's declared.
   ❌ BAD: const total = questions.length; const questions = [...];
   ✅ GOOD: const questions = [...]; const total = questions.length;
4. Use Tailwind CSS for ALL styling (classes like: bg-white, text-gray-900, p-6, rounded-lg, shadow-lg, etc.)
5. Make it visually appealing with proper spacing, colors, and typography

IMAGE HANDLING (CRITICAL):
Since you cannot upload or import external images, use these approaches for visual content:

A. **EMOJI & UNICODE ICONS** (Preferred for most cases):
   - Use relevant emojis as visual elements: 🌿🌱🌳 (plants), 🔬🧪 (science), 📚📖 (education)
   - Large emoji icons: <div className="text-8xl">🌞</div>
   - Combine emojis for diagrams: ☀️ → 🌱 → 🌳 → 🍎
   - Examples: 🧬 DNA, 💧 water, ⚡ energy, 🌍 Earth, 🔥 fire, 🌊 waves

B. **SVG ILLUSTRATIONS** (For diagrams, charts, icons):
   - Create inline SVG elements directly in JSX
   - Use simple shapes: circles, rectangles, paths, polygons
   - Example: <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="blue" /></svg>
   - Create flowcharts, diagrams, simple illustrations
   - Animate SVGs with CSS classes

C. **CSS-BASED VISUALS** (For geometric shapes and patterns):
   - Use div elements with Tailwind classes to create shapes
   - Example circle: <div className="w-20 h-20 rounded-full bg-blue-500" />
   - Example triangle: Use border tricks or clip-path
   - Create patterns with gradients: bg-gradient-to-r from-blue-500 to-purple-500
   - Use box-shadow for glows and depth effects

D. **PLACEHOLDER SERVICES** (For realistic images - use sparingly):
   - Unsplash Source API: https://source.unsplash.com/400x300/?nature,water
   - Replace category as needed: /?science, /?technology, /?education, /?animals
   - Picsum Photos: https://picsum.photos/400/300
   - Example: <img src="https://source.unsplash.com/400x300/?photosynthesis,plant" alt="Plant" className="rounded-lg" />
   - IMPORTANT: Always include alt text for accessibility
   - Use loading="lazy" for performance: <img loading="lazy" ... />

E. **DATA VISUALIZATIONS** (For charts and graphs):
   - Create bar charts using div elements with heights based on data
   - Example: <div className="bg-blue-500" style={{ height: \`\${percentage}%\` }} />
   - Create pie charts using conic-gradients
   - Use flex/grid layouts for comparison visualizations

F. **ICON SYSTEMS**:
   - Use text-based symbols: ✓ ✗ ★ ♠ ♥ ♣ ♦ ⚠ ⚡ ☀ ☁ ☂ ☃ ♨ ☕ ⚽ ⚾ 🎯 🎨
   - Create icon-like elements with borders and backgrounds
   - Example: <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">✓</div>

G. **BEST PRACTICES**:
   - Prefer emojis and SVGs over external images for faster loading
   - If using placeholder images, keep them small (max 600px width)
   - Always use responsive image sizing: w-full max-w-md mx-auto
   - Add loading states for images: loading="lazy"
   - Use aspect-ratio classes to prevent layout shift
   - Combine multiple techniques for rich visual content

6. LESSON TYPES - Adapt based on the request:
   
   A. FOR INTERACTIVE LESSONS (explanations, tutorials, concepts):
   - Create HIGHLY INTERACTIVE content with multiple engagement points
   - Add clickable cards that reveal information on click (use useState to toggle visibility)
   - Include interactive simulations/demos where users can input values and see results
   - Add progress tracking: "You've learned X of Y concepts" with visual progress bars
   - Use step-by-step walkthroughs with "Next Step" buttons
   - Include expandable sections with smooth animations (transition-all duration-300)
   - Add interactive diagrams where users can click parts to learn more
   - Include drag-and-drop activities (use onMouseDown/onMouseMove for simple dragging)
   - Add fill-in-the-blank exercises with instant feedback
   - Include slider controls for adjusting parameters and seeing live results
   - Add tabs/navigation between different topics or difficulty levels
   - Include "Try It Yourself" sections with input fields and calculations
   - Add visual feedback: confetti effects for correct answers, shake animations for errors
   - Include memory games, matching exercises, or sorting activities
   - Add timed challenges with countdown timers
   - Include score/points system for completing activities
   - Add "Key Takeaways" summary sections
   - Navigation: "Back to Home" button: window.parent.postMessage('navigateToHome', '*')
   
   B. FOR QUIZZES (when explicitly requested):
   - Use pagination with Next/Previous buttons to navigate between questions
   - Show one question at a time with current question number (e.g., "Question 1 of 10")
   - Show Submit button only on the last question instead of Next
   - After submission, show results with score and two buttons: 
     * "Back to Home" button that calls: window.parent.postMessage('navigateToHome', '*')
     * "Try Again" button that resets the quiz state to start over
   - Include answer checking with state management using useState
   
   C. FOR MIXED CONTENT:
   - Combine both approaches: start with educational content, then quiz at the end
   - Add tabs or sections to switch between Learn and Practice modes

7. Use modern React patterns with TypeScript
8. NO external imports except React hooks (useState, useEffect, useMemo, useCallback if needed)
9. Include proper TypeScript types for all variables and functions
10. Make the content educational, engaging, and well-structured with clear hierarchy
11. Use emojis strategically to make content more engaging (📚 🎯 💡 ✨ 🔍 📊 etc.)
   
   B. FOR QUIZZES (when explicitly requested):
   - Use pagination with Next/Previous buttons to navigate between questions
   - Show one question at a time with current question number (e.g., "Question 1 of 10")
   - Show Submit button only on the last question instead of Next
   - After submission, show results with score and two buttons: 
     * "Back to Home" button that calls: window.parent.postMessage('navigateToHome', '*')
     * "Try Again" button that resets the quiz state to start over
   - Include answer checking with state management using useState
   
   C. FOR MIXED CONTENT:
   - Combine both approaches: start with educational content, then quiz at the end
   - Add tabs or sections to switch between Learn and Practice modes

7. Use modern React patterns with TypeScript
8. NO external imports except React hooks (useState, useEffect, useMemo, useCallback if needed)
9. Include proper TypeScript types for all variables and functions
10. Make the content educational, engaging, and well-structured with clear hierarchy
11. Use emojis strategically to make content more engaging (📚 🎯 💡 ✨ 🔍 📊 etc.)

INTERACTIVITY BEST PRACTICES:
- Always prefer interactive elements over static text
- Use useState extensively for tracking user interactions
- Provide immediate visual feedback for all user actions
- Include sound effects using HTML5 Audio (optional but engaging)
- Add gamification: points, badges, levels, achievements
- Use animations: hover:scale-105, transition-transform, animate-bounce
- Include loading states and smooth transitions between states
- Make everything clickable feel clickable (cursor-pointer, hover effects)
- Add celebration animations for completed tasks
- Include hints/tips that users can reveal
- Use color coding: green for correct, red for incorrect, yellow for hints
- Add "Reset" or "Try Again" buttons for all interactive elements

STYLING GUIDELINES (CRITICAL - PREVENT BROKEN UI):
⚠️ CRITICAL: Always use COMPLETE and VALID Tailwind CSS classes. NEVER use broken or incomplete classes!

✅ BUTTONS - Use these exact patterns (COPY EXACTLY):
- Primary Button: 
  <button className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg">
- Secondary Button:
  <button className="px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors duration-200">
- Success Button:
  <button className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors duration-200">
- Danger Button:
  <button className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors duration-200">
- ALWAYS include: padding (px-* py-*), background (bg-*), text color (text-*), rounded corners (rounded-*)

✅ CARDS - Use these exact patterns:
- Basic Card:
  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
- Interactive Card:
  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300 cursor-pointer">
- Colored Card:
  <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-lg p-6 border border-blue-200">
- ALWAYS include: background (bg-*), padding (p-*), rounded corners (rounded-*), shadow (shadow-*)

✅ CONTAINERS & DIVS - Use these patterns:
- Main Container:
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
- Content Container:
  <div className="max-w-4xl mx-auto">
- Flex Container:
  <div className="flex items-center justify-between gap-4">
- Grid Container:
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
- ALWAYS ensure proper spacing (p-*, m-*, gap-*) and layout (flex, grid, etc.)

✅ TEXT ELEMENTS - Proper Typography:
- Headings: <h1 className="text-4xl font-bold text-gray-900 mb-4">
- Subheadings: <h2 className="text-2xl font-semibold text-gray-800 mb-3">
- Body Text: <p className="text-base text-gray-700 leading-relaxed">
- Labels: <label className="block text-sm font-medium text-gray-700 mb-2">
- ALWAYS include: text size (text-*), color (text-*), font weight (font-*)

✅ INPUT FIELDS - Complete Styling:
- Text Input:
  <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
- Textarea:
  <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" rows={4} />
- ALWAYS include: width (w-*), padding (px-* py-*), border, focus states

✅ COMMON MISTAKES TO AVOID:
❌ NEVER use incomplete classes: className="bg-" or className="text-"
❌ NEVER forget closing tags: <div> without </div>
❌ NEVER use invalid color names: bg-lightblue (use bg-blue-300)
❌ NEVER forget padding/margin: <button className="bg-blue-500"> (missing px-* py-*)
❌ NEVER use broken syntax: className={bg-blue-500} (missing quotes)
❌ NEVER use invalid Tailwind: className="background-color-blue" (use bg-blue-500)
❌ NEVER mix inline styles unless absolutely necessary

✅ RESPONSIVE DESIGN (MANDATORY):
- Use mobile-first breakpoints: sm: md: lg: xl: 2xl:
- Example: <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
- Always test layouts work on mobile: flex-col md:flex-row
- Use responsive text: text-2xl md:text-3xl lg:text-4xl
- Responsive padding: p-4 md:p-6 lg:p-8

✅ COLOR PALETTE (Use these exact values):
- Primary Blues: bg-blue-50, bg-blue-100, bg-blue-500, bg-blue-600, bg-blue-700
- Success Greens: bg-green-50, bg-green-100, bg-green-500, bg-green-600, bg-green-700
- Danger Reds: bg-red-50, bg-red-100, bg-red-500, bg-red-600, bg-red-700
- Warning Yellows: bg-yellow-50, bg-yellow-100, bg-yellow-500, bg-yellow-600
- Neutral Grays: bg-gray-50, bg-gray-100, bg-gray-200, bg-gray-700, bg-gray-800, bg-gray-900
- Purple Accent: bg-purple-50, bg-purple-100, bg-purple-500, bg-purple-600

✅ SPACING SYSTEM (Be consistent):
- Small spacing: gap-2, p-2, m-2 (0.5rem)
- Medium spacing: gap-4, p-4, m-4 (1rem)
- Large spacing: gap-6, p-6, m-6 (1.5rem)
- Extra large: gap-8, p-8, m-8 (2rem)

VALIDATION BEFORE GENERATING:
1. Every <div> must have proper className with bg-*, p-*, rounded-*
2. Every <button> must have px-*, py-*, bg-*, text-*, rounded-*
3. All opening tags must have closing tags
4. All className values must be in quotes and valid Tailwind classes
5. No inline styles unless absolutely necessary (use Tailwind instead)

INTERACTIVE PATTERNS TO USE:
1. **Flashcards**: Click to flip and reveal answer
2. **Multiple Choice**: Click answers with immediate color feedback
3. **Fill-in-blanks**: Input fields with check button
4. **Matching Game**: Click two items to match them
5. **Drag & Drop**: Reorder items or categorize
6. **Slider Demos**: Adjust values to see visual changes
7. **Code Playground**: Input code, see output
8. **Timeline Explorer**: Click events to expand details
9. **Interactive Diagrams**: Click parts to highlight and explain
10. **Progress Tracker**: Visual bar showing completion
11. **Reveal Cards**: Click "Show More" to expand
12. **Tabs Navigation**: Switch between topics
13. **Calculator/Converter**: Input values, get results
14. **Memory Game**: Match pairs of cards
15. **Sorting Game**: Arrange items in correct order

OUTPUT FORMAT:
Start directly with: "use client";

import { useState } from "react";

export default function LessonComponent() {
  // Your code here
}

${attempt > 1 ? `\nThis is attempt ${attempt}. Previous attempts failed validation. Ensure proper syntax and structure.` : ""}

Create a lesson based on this outline:

${outline}`;

    const result = await codeModel.generateContent(prompt);
    const response = result.response;
    let code = response.text();
    
    // Clean up the response - remove markdown code fences if present
    code = code.replace(/```typescript\n?/g, "").replace(/```tsx\n?/g, "").replace(/```\n?/g, "").trim();
    
    return code;
  },
  { name: "generate_lesson_code" }
);

/**
 * Validate and fix generated code with comprehensive checks
 * This prevents invalid code from being saved to database
 */
const validateAndFixCode = traceable(
  async (code: string, outline: string, attempt: number): Promise<{ isValid: boolean; code: string; errors: string[] }> => {
    console.log(`[Validation Attempt ${attempt}] Starting validation...`);
    
    const validation = validateTypeScriptCode(code);
    
    if (validation.isValid) {
      console.log(`[Validation Attempt ${attempt}] ✅ Code passed all validation checks`);
      return { isValid: true, code, errors: [] };
    }
    
    console.error(`[Validation Attempt ${attempt}] ❌ Validation failed:`, validation.errors);
    
    // If validation fails and we have retries left, try to fix the code
    if (attempt < MAX_RETRIES) {
      console.log(`[Validation Attempt ${attempt}] Attempting to fix code...`);
      
      const fixPrompt = `The following TypeScript React component has CRITICAL validation errors that MUST be fixed:

🚨 ERRORS (${validation.errors.length}):
${validation.errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}

❌ PROBLEMATIC CODE:
${code}

You MUST fix ALL these errors and return a corrected version. Requirements:
- Return ONLY valid TypeScript/React code (no markdown, no explanations, no code fences)
- Must start with "use client"; directive
- Must have: export default function ComponentName() {
- Must return valid JSX
- Use ONLY React imports (useState, useEffect, etc.)
- Use Tailwind CSS for all styling
- NO dangerous patterns (eval, Function, innerHTML, etc.)
- Ensure all braces, parentheses, and brackets are balanced
- Component name must start with uppercase letter

Return the FIXED code now (code only, no explanation):`;

      const result = await codeModel.generateContent(fixPrompt);
      let fixedCode = result.response.text();
      
      // Clean up the response more aggressively
      fixedCode = fixedCode
        .replace(/```typescript\n?/g, "")
        .replace(/```tsx\n?/g, "")
        .replace(/```jsx\n?/g, "")
        .replace(/```\n?/g, "")
        .replace(/^Here's the fixed code:?\n*/i, "")
        .replace(/^Fixed code:?\n*/i, "")
        .trim();
      
      console.log(`[Validation Attempt ${attempt}] Re-validating fixed code...`);
      
      // Re-validate the fixed code
      const revalidation = validateTypeScriptCode(fixedCode);
      
      if (revalidation.isValid) {
        console.log(`[Validation Attempt ${attempt}] ✅ Fixed code passed validation`);
      } else {
        console.error(`[Validation Attempt ${attempt}] ❌ Fixed code still has errors:`, revalidation.errors);
      }
      
      return { isValid: revalidation.isValid, code: fixedCode, errors: revalidation.errors };
    }
    
    console.error(`[Validation Attempt ${attempt}] ❌ Max retries reached, validation failed`);
    return { isValid: false, code, errors: validation.errors };
  },
  { name: "validate_and_fix_code" }
);

/**
 * Main lesson generation function with tracing and comprehensive validation
 * GUARANTEES: Only valid, safe code gets marked as success
 */
export const generateLesson = traceable(
  async ({ outline, retryCount = 0 }: GenerateLessonParams): Promise<GenerateLessonResult> => {
    console.log(`\n🚀 [Generation ${retryCount + 1}/${MAX_RETRIES}] Starting lesson generation...`);
    console.log(`📝 Outline: ${outline.substring(0, 100)}...`);
    
    try {
      // Step 1: Extract title
      console.log(`📌 [Step 1/3] Extracting title...`);
      const title = await extractTitle(outline);
      console.log(`✅ Title extracted: "${title}"`);
      
      // Step 2: Generate code
      console.log(`📌 [Step 2/3] Generating code...`);
      const code = await generateLessonCode(outline, retryCount + 1);
      console.log(`✅ Code generated (${code.length} characters)`);
      
      // Step 3: Validate and potentially fix code
      console.log(`📌 [Step 3/3] Validating code...`);
      const validation = await validateAndFixCode(code, outline, retryCount + 1);
      
      if (!validation.isValid) {
        console.error(`❌ [Generation ${retryCount + 1}] Validation failed with ${validation.errors.length} errors`);
        
        if (retryCount < MAX_RETRIES - 1) {
          console.log(`🔄 Retrying generation (attempt ${retryCount + 2}/${MAX_RETRIES})...\n`);
          // Retry with incremented count
          return generateLesson({ outline, retryCount: retryCount + 1 });
        }
        
        console.error(`🚫 Max retries (${MAX_RETRIES}) reached. Generation failed.`);
        console.error(`Validation errors:\n${validation.errors.map((e, i) => `  ${i + 1}. ${e}`).join("\n")}`);
        
        return {
          success: false,
          error: `❌ Code validation failed after ${MAX_RETRIES} attempts.\n\nValidation Errors:\n${validation.errors.map((e, i) => `${i + 1}. ${e}`).join("\n")}\n\nPlease try again with a clearer prompt.`,
        };
      }
      
      // ADDITIONAL TDZ SAFETY CHECK: Quick pattern check for common TDZ issues
      const tdzsafetyCheck = (code: string): string | null => {
        const lines = code.split('\n');
        const commonVars = ['questions', 'items', 'cards', 'steps', 'data', 'options', 'choices'];
        
        for (const varName of commonVars) {
          let declLine = -1;
          let useLine = -1;
          
          lines.forEach((line, idx) => {
            if (line.match(new RegExp(`(const|let|var)\\s+${varName}\\s*=`))) {
              declLine = idx;
            }
            if (line.match(new RegExp(`\\b${varName}\\.(\\w+)|\\b${varName}\\[`)) && useLine === -1) {
              useLine = idx;
            }
          });
          
          if (declLine !== -1 && useLine !== -1 && useLine < declLine) {
            return `TDZ: "${varName}" used at line ${useLine + 1} before declaration at line ${declLine + 1}`;
          }
        }
        return null;
      };
      
      const tdzError = tdzsafetyCheck(validation.code);
      if (tdzError) {
        console.error(`🚨 TDZ Safety Check Failed: ${tdzError}`);
        
        if (retryCount < MAX_RETRIES - 1) {
          console.log(`🔄 Retrying due to TDZ issue (attempt ${retryCount + 2}/${MAX_RETRIES})...\n`);
          return generateLesson({ outline, retryCount: retryCount + 1 });
        }
        
        return {
          success: false,
          error: `Code quality issue: ${tdzError}. Please try regenerating the lesson.`,
        };
      }
      
      // FINAL SAFETY CHECK: Validate one more time before marking success
      console.log(`🔒 [Final Check] Running final validation before saving...`);
      const finalCheck = validateTypeScriptCode(validation.code);
      
      if (!finalCheck.isValid) {
        console.error(`🚨 CRITICAL: Final validation failed! This should never happen.`);
        console.error(`Errors: ${finalCheck.errors.join(", ")}`);
        
        return {
          success: false,
          error: `Critical validation error: ${finalCheck.errors.join(", ")}`,
        };
      }
      
      console.log(`✅ [Generation ${retryCount + 1}] SUCCESS! Code passed all validations.`);
      console.log(`📊 Stats: ${validation.code.length} chars, ${title.length} char title\n`);
      
      return {
        success: true,
        code: validation.code,
        title,
      };
    } catch (error) {
      console.error(`💥 [Generation ${retryCount + 1}] Error occurred:`, error);
      
      if (retryCount < MAX_RETRIES - 1) {
        console.log(`🔄 Retrying after error (attempt ${retryCount + 2}/${MAX_RETRIES})...\n`);
        // Retry on any error
        return generateLesson({ outline, retryCount: retryCount + 1 });
      }
      
      console.error(`🚫 Max retries (${MAX_RETRIES}) reached after error.`);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred during generation",
      };
    }
  },
  { name: "generate_lesson", project_name: "lesson-generator" }
);

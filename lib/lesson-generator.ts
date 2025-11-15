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
 * Generate TypeScript React component code for a lesson
 */
const generateLessonCode = traceable(
  async (outline: string, attempt: number): Promise<string> => {
    const detectedLanguage = detectLanguageScript(outline);
    const isNonEnglish = detectedLanguage !== "English";
    
    const languageNote = isNonEnglish 
      ? `\n\nIMPORTANT: The lesson outline is in ${detectedLanguage}. Generate the lesson content in ${detectedLanguage} script while keeping the code structure and comments in English. The educational content should be in ${detectedLanguage} to match the user's request.`
      : "";
    
    const prompt = `You are an expert educational content creator and TypeScript developer.

Generate a complete, self-contained React component in TypeScript that implements the requested lesson.${languageNote}

CRITICAL REQUIREMENTS:
1. Return ONLY valid TypeScript/React code - no markdown, no explanations, no code fences
2. Must start with a default export: "export default function LessonComponent() {"
3. Use Tailwind CSS for ALL styling (classes like: bg-white, text-gray-900, p-6, rounded-lg, shadow-lg, etc.)
4. Make it visually appealing with proper spacing, colors, and typography
5. LESSON TYPES - Adapt based on the request:
   
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

6. Use modern React patterns with TypeScript
7. NO external imports except React hooks (useState, useEffect, useMemo, useCallback if needed)
8. Include proper TypeScript types for all variables and functions
9. Make the content educational, engaging, and well-structured with clear hierarchy
10. Use emojis strategically to make content more engaging (📚 🎯 💡 ✨ 🔍 📊 etc.)

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

STYLING GUIDELINES:
- Use vibrant, engaging colors with good contrast
- Primary: blue-600, Success: green-600, Error: red-600, Warning: yellow-500
- Background: gradient backgrounds (bg-gradient-to-br from-blue-50 to-purple-50)
- Text: gray-900 for headings, gray-700 for body
- Cards: shadow-lg hover:shadow-xl transition-shadow
- Buttons: transform hover:scale-105 active:scale-95 transition-all
- Interactive elements: border-2 hover:border-blue-500
- Use proper spacing: p-6, gap-6, space-y-6 for better breathing room
- Add rounded corners: rounded-xl for cards, rounded-lg for buttons
- Make it fully responsive with mobile-first approach

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

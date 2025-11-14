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
 * Generate TypeScript React component code for a lesson
 */
const generateLessonCode = traceable(
  async (outline: string, attempt: number): Promise<string> => {
    const prompt = `You are an expert educational content creator and TypeScript developer.

Generate a complete, self-contained React component in TypeScript that implements the requested lesson.

CRITICAL REQUIREMENTS:
1. Return ONLY valid TypeScript/React code - no markdown, no explanations, no code fences
2. Must start with a default export: "export default function LessonComponent() {"
3. Use Tailwind CSS for ALL styling (classes like: bg-white, text-gray-900, p-6, rounded-lg, shadow-lg, etc.)
4. Make it visually appealing with proper spacing, colors, and typography
5. LESSON TYPES - Adapt based on the request:
   
   A. FOR INTERACTIVE LESSONS (explanations, tutorials, concepts):
   - Create engaging educational content with sections/chapters
   - Include visual elements: colored boxes for key concepts, diagrams using div/spans with borders
   - Add expandable sections with toggle buttons for detailed explanations
   - Use cards/panels to organize information hierarchically
   - Include examples, code snippets (in styled pre/code blocks), or step-by-step explanations
   - Add interactive elements: collapsible sections, tabs for different topics, progress indicators
   - Include diagrams: use CSS/Tailwind to create visual representations (flowcharts, timelines, comparisons)
   - Add "Key Takeaways" or "Summary" sections with highlighted bullet points
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

STYLING GUIDELINES:
- Use a clean, modern design with good contrast
- Primary colors: blue-600, green-600 for success, red-600 for errors
- Background: white or gray-50
- Text: gray-900 for headings, gray-700 for body
- Add hover effects and transitions for interactive elements
- Use proper spacing: p-4, p-6, gap-4, space-y-4, etc.
- Make it responsive with good mobile support

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
 * Validate and fix generated code
 */
const validateAndFixCode = traceable(
  async (code: string, outline: string, attempt: number): Promise<{ isValid: boolean; code: string; errors: string[] }> => {
    const validation = validateTypeScriptCode(code);
    
    if (validation.isValid) {
      return { isValid: true, code, errors: [] };
    }
    
    // If validation fails and we have retries left, try to fix the code
    if (attempt < MAX_RETRIES) {
      const fixPrompt = `The following TypeScript React component has validation errors:

ERRORS:
${validation.errors.join("\n")}

ORIGINAL CODE:
${code}

Please fix these errors and return a corrected version of the code. Remember:
- Return ONLY valid TypeScript/React code
- No markdown, no explanations, no code fences
- Must be a complete, working React component
- Use Tailwind CSS for styling

Return the fixed code:`;

      const result = await codeModel.generateContent(fixPrompt);
      let fixedCode = result.response.text();
      fixedCode = fixedCode.replace(/```typescript\n?/g, "").replace(/```tsx\n?/g, "").replace(/```\n?/g, "").trim();
      
      // Re-validate the fixed code
      const revalidation = validateTypeScriptCode(fixedCode);
      return { isValid: revalidation.isValid, code: fixedCode, errors: revalidation.errors };
    }
    
    return { isValid: false, code, errors: validation.errors };
  },
  { name: "validate_and_fix_code" }
);

/**
 * Main lesson generation function with tracing
 */
export const generateLesson = traceable(
  async ({ outline, retryCount = 0 }: GenerateLessonParams): Promise<GenerateLessonResult> => {
    try {
      // Step 1: Extract title
      const title = await extractTitle(outline);
      
      // Step 2: Generate code
      const code = await generateLessonCode(outline, retryCount + 1);
      
      // Step 3: Validate and potentially fix code
      const validation = await validateAndFixCode(code, outline, retryCount + 1);
      
      if (!validation.isValid) {
        if (retryCount < MAX_RETRIES - 1) {
          // Retry with incremented count
          return generateLesson({ outline, retryCount: retryCount + 1 });
        }
        
        return {
          success: false,
          error: `Code validation failed after ${MAX_RETRIES} attempts: ${validation.errors.join(", ")}`,
        };
      }
      
      return {
        success: true,
        code: validation.code,
        title,
      };
    } catch (error) {
      console.error("Error generating lesson:", error);
      
      if (retryCount < MAX_RETRIES - 1) {
        // Retry on any error
        return generateLesson({ outline, retryCount: retryCount + 1 });
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
  { name: "generate_lesson", project_name: "lesson-generator" }
);

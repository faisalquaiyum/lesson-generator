import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateLesson } from "@/lib/lesson-generator";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";
import { validateLessonPrompt, getPromptSuggestion } from "@/lib/validate-prompt";

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting: 5 lesson generations per minute
    const rateLimitResult = await rateLimit(request, {
      interval: 60 * 1000, // 1 minute
      uniqueTokenPerInterval: 5,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        rateLimitExceeded(rateLimitResult.limit, rateLimitResult.reset),
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
            "Retry-After": Math.ceil(
              (rateLimitResult.reset - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    const { outline } = await request.json();

    if (!outline || typeof outline !== "string" || outline.trim().length === 0) {
      return NextResponse.json(
        { error: "Lesson outline is required" },
        { status: 400 }
      );
    }

    // Validate that the prompt is lesson-related
    const validation = validateLessonPrompt(outline);
    
    if (!validation.isValid) {
      const suggestion = getPromptSuggestion(outline);
      return NextResponse.json(
        { 
          error: validation.error,
          suggestion: suggestion,
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check for duplicate recent lessons (prevent spam)
    const { data: recentLesson } = await supabase
      .from("lessons")
      .select("*")
      .eq("outline", outline.trim())
      .in("status", ["generating", "generated"])
      .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
      .maybeSingle();

    if (recentLesson) {
      if (recentLesson.status === "generating") {
        return NextResponse.json(
          { 
            error: "A similar lesson is already being generated. Please wait for it to complete.",
            existingLessonId: recentLesson.id,
          },
          { status: 409 }
        );
      } else if (recentLesson.status === "generated") {
        return NextResponse.json(
          { 
            error: "This lesson was recently generated. Check your lesson list.",
            existingLessonId: recentLesson.id,
          },
          { status: 409 }
        );
      }
    }

    // Create initial lesson record
    const { data: lesson, error: insertError } = await supabase
      .from("lessons")
      .insert({
        title: "Generating...",
        outline: outline.trim(),
        status: "generating",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating lesson:", insertError);
      return NextResponse.json(
        { error: "Failed to create lesson. Please try again." },
        { status: 500 }
      );
    }

    // Start generation in the background (don't await)
    generateLessonInBackground(lesson.id, outline.trim());

    return NextResponse.json(
      { lesson },
      {
        headers: {
          "X-RateLimit-Limit": rateLimitResult.limit.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": rateLimitResult.reset.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Error in generate API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Background lesson generation with comprehensive validation
async function generateLessonInBackground(lessonId: string, outline: string) {
  const supabase = await createClient();

  try {
    console.log(`\n[Background Job] Starting generation for lesson: ${lessonId}`);
    console.log(`[Background Job] Outline: ${outline.substring(0, 100)}...`);
    console.log(`[Background Job] Outline length: ${outline.length} characters`);
    
    // Detect language
    const hasIndicScript = /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0600-\u06FF]/.test(outline);
    if (hasIndicScript) {
      console.log(`[Background Job] 🌏 Detected non-Latin script in outline`);
    }
    
    // Set timeout for generation (10 minutes max)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        console.error(`[Background Job] ⏱️ Timeout reached for lesson: ${lessonId}`);
        reject(new Error("Generation timeout after 10 minutes"));
      }, 10 * 60 * 1000);
    });
    
    console.log(`[Background Job] Calling generateLesson()...`);
    const startTime = Date.now();
    
    // Generate the lesson with AI (includes comprehensive validation)
    const result = await Promise.race([
      generateLesson({ outline }),
      timeoutPromise,
    ]);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Background Job] Generation completed in ${duration}s`);

    // CRITICAL: Only save to database if validation passed
    if (result.success && result.code && result.title) {
      console.log(`[Background Job] ✅ Generation successful for lesson: ${lessonId}`);
      console.log(`[Background Job] Saving validated code to database...`);
      
      // Triple check: code must not be empty and must have minimum structure
      if (result.code.length < 100) {
        console.error(`[Background Job] ❌ Code too short (${result.code.length} chars), marking as failed`);
        await supabase
          .from("lessons")
          .update({
            status: "failed",
            error_message: "Generated code is too short to be valid",
          })
          .eq("id", lessonId);
        return;
      }
      
      // Final safety check: ensure it has basic React structure
      if (!result.code.includes("export default function") || !result.code.includes("return")) {
        console.error(`[Background Job] ❌ Code missing required structure, marking as failed`);
        await supabase
          .from("lessons")
          .update({
            status: "failed",
            error_message: "Generated code missing required React component structure",
          })
          .eq("id", lessonId);
        return;
      }
      
      // All checks passed - safe to save
      const { error: updateError } = await supabase
        .from("lessons")
        .update({
          title: result.title,
          generated_content: result.code,
          status: "generated",
        })
        .eq("id", lessonId);
        
      if (updateError) {
        console.error(`[Background Job] ❌ Database update error:`, updateError);
      } else {
        console.log(`[Background Job] ✅ Successfully saved to database`);
      }
    } else {
      // Validation failed - do NOT save code to database
      console.error(`[Background Job] ❌ Validation failed for lesson: ${lessonId}`);
      console.error(`[Background Job] Error: ${result.error}`);
      
      await supabase
        .from("lessons")
        .update({
          status: "failed",
          error_message: result.error || "Code validation failed",
        })
        .eq("id", lessonId);
        
      console.log(`[Background Job] Marked lesson as failed in database`);
    }
  } catch (error) {
    console.error(`[Background Job] 💥 Unexpected error for lesson ${lessonId}:`, error);
    
    // Update with error - no code saved
    await supabase
      .from("lessons")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unexpected error during generation",
      })
      .eq("id", lessonId);
  }
}

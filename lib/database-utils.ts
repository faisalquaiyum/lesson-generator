/**
 * Database cleanup utilities
 * Handles stuck lessons, old failed lessons, and pagination
 */

import { createClient } from "@/lib/supabase/server";

/**
 * Cleanup stuck "generating" lessons that have been running too long
 * Run this periodically (e.g., every 5 minutes via cron)
 */
export async function cleanupStuckLessons() {
  const supabase = await createClient();
  
  // Mark lessons stuck in "generating" for more than 10 minutes as failed
  const timeoutThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  const { data: stuckLessons, error } = await supabase
    .from("lessons")
    .update({
      status: "failed",
      error_message: "Generation timeout - the lesson took too long to generate. Please try again with a simpler prompt.",
    })
    .eq("status", "generating")
    .lt("created_at", timeoutThreshold)
    .select();

  if (error) {
    console.error("Error cleaning up stuck lessons:", error);
    return { success: false, error };
  }

  if (stuckLessons && stuckLessons.length > 0) {
    console.log(`✅ Cleaned up ${stuckLessons.length} stuck lesson(s)`);
  }

  return { success: true, count: stuckLessons?.length || 0 };
}

/**
 * Delete old failed lessons (older than 7 days)
 * Run this periodically to save database space
 */
export async function cleanupOldFailedLessons() {
  const supabase = await createClient();
  
  // Delete failed lessons older than 7 days
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: deletedLessons, error } = await supabase
    .from("lessons")
    .delete()
    .eq("status", "failed")
    .lt("created_at", cutoffDate)
    .select();

  if (error) {
    console.error("Error cleaning up old failed lessons:", error);
    return { success: false, error };
  }

  if (deletedLessons && deletedLessons.length > 0) {
    console.log(`✅ Deleted ${deletedLessons.length} old failed lesson(s)`);
  }

  return { success: true, count: deletedLessons?.length || 0 };
}

/**
 * Get paginated lessons with optional filtering
 */
export async function getPaginatedLessons(options: {
  page?: number;
  limit?: number;
  status?: "generating" | "generated" | "failed";
  sortBy?: "created_at" | "updated_at";
  sortOrder?: "asc" | "desc";
}) {
  const supabase = await createClient();
  
  const {
    page = 1,
    limit = 20,
    status,
    sortBy = "created_at",
    sortOrder = "desc",
  } = options;

  const offset = (page - 1) * limit;

  let query = supabase
    .from("lessons")
    .select("*", { count: "exact" })
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: lessons, count, error } = await query;

  if (error) {
    console.error("Error fetching paginated lessons:", error);
    return { success: false, error };
  }

  return {
    success: true,
    lessons: lessons || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
      hasMore: offset + limit < (count || 0),
    },
  };
}

/**
 * Get lesson statistics
 */
export async function getLessonStats() {
  const supabase = await createClient();

  const { count: totalCount } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true });

  const { count: generatingCount } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .eq("status", "generating");

  const { count: generatedCount } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .eq("status", "generated");

  const { count: failedCount } = await supabase
    .from("lessons")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed");

  return {
    total: totalCount || 0,
    generating: generatingCount || 0,
    generated: generatedCount || 0,
    failed: failedCount || 0,
  };
}

/**
 * Check if a lesson exists and return its status
 */
export async function checkLessonExists(lessonId: string) {
  const supabase = await createClient();

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("id, status, created_at")
    .eq("id", lessonId)
    .single();

  if (error) {
    return { exists: false };
  }

  return {
    exists: true,
    status: lesson.status,
    createdAt: lesson.created_at,
  };
}

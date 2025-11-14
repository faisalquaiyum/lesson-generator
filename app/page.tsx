"use client";

import { useState, useEffect, useRef } from "react";
import { Lesson } from "@/lib/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function Home() {
  const [outline, setOutline] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch lessons on mount
  useEffect(() => {
    fetchLessons();
  }, []);

  // Set up polling only when there are generating lessons
  useEffect(() => {
    const hasGenerating = lessons.some((l) => l.status === "generating");

    // Clean up existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    if (hasGenerating) {
      // Poll every 3 seconds for updates (only when generating)
      pollingIntervalRef.current = setInterval(() => {
        fetchLessons();
      }, 3000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons.length, lessons.filter((l) => l.status === "generating").length]);

  const fetchLessons = async () => {
    try {
      const response = await fetch("/api/lessons");
      const data = await response.json();

      if (data.lessons) {
        setLessons(data.lessons);
      }
    } catch (err) {
      console.error("Error fetching lessons:", err);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!outline.trim()) {
      setError("Please enter a lesson outline");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/lessons/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ outline: outline.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = data.retryAfter || 60;
          throw new Error(
            `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`
          );
        }
        throw new Error(data.error || "Failed to generate lesson");
      }

      // Add the new lesson to the list
      if (data.lesson) {
        setLessons((prev) => [data.lesson, ...prev]);
      }

      // Clear the form
      setOutline("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate lesson"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses =
      "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap";

    switch (status) {
      case "generating":
        return (
          <span
            className={`${baseClasses} bg-[#1D546C]/20 text-[#1D546C] animate-pulse border border-[#1D546C]/30`}
          >
            ⏳ Generating...
          </span>
        );
      case "generated":
        return (
          <span
            className={`${baseClasses} bg-green-100 text-green-700 border border-green-300`}
          >
            ✅ Generated
          </span>
        );
      case "failed":
        return (
          <span
            className={`${baseClasses} bg-red-100 text-red-700 border border-red-300`}
          >
            ❌ Failed
          </span>
        );
      default:
        return (
          <span
            className={`${baseClasses} bg-[#F4F4F4] text-[#1A3D64] border border-[#1A3D64]/20`}
          >
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0C2B4E] to-[#1A3D64]">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12 mt-10">
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
            AI Lesson Generator
          </h1>
          <p className="text-lg text-[#F4F4F4]/90 max-w-2xl mx-auto">
            Create interactive educational content with AI-powered TypeScript
            components
          </p>
        </div>

        {/* Generation Form */}
        <Card className="p-8 mb-12 shadow-2xl bg-white/95 backdrop-blur border-2 border-[#1D546C]/20">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <Label
                htmlFor="outline"
                className="text-lg font-semibold mb-3 block text-[#0C2B4E]"
              >
                📝 Lesson Outline
              </Label>
              <textarea
                id="outline"
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                placeholder="e.g., 'A 10 question pop quiz on Florida' or 'An explanation of how the Cartesian Grid works'"
                className="w-full h-32 px-4 py-3 border-2 border-[#1D546C]/30 rounded-lg focus:ring-2 focus:ring-[#1D546C] focus:border-[#1D546C] resize-none text-base transition-all duration-200 hover:border-[#1D546C]/50 bg-white text-[#0C2B4E] placeholder:text-gray-400"
                disabled={isGenerating}
              />
              <p className="text-sm text-[#1A3D64]/70 mt-2">
                💡 Describe the lesson you want to create. Be specific about the
                content and format.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isGenerating || !outline.trim()}
              className="w-full bg-gradient-to-r from-[#1A3D64] to-[#1D546C] hover:from-[#0C2B4E] hover:to-[#1A3D64] text-white font-semibold py-6 text-lg shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating...
                </span>
              ) : (
                "Generate Lesson"
              )}
            </Button>
          </form>
        </Card>

        {/* Lessons Table */}
        <Card className="p-8 shadow-2xl bg-white/95 backdrop-blur border-2 border-[#1D546C]/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-[#1A3D64] to-[#1D546C] w-1 h-8 rounded-full"></div>
            <h2 className="text-2xl font-bold text-[#0C2B4E]">
              📚 Your Lessons
            </h2>
          </div>

          {lessons.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📖</div>
              <h3 className="mt-4 text-lg font-semibold text-[#0C2B4E]">
                No lessons yet
              </h3>
              <p className="mt-2 text-[#1A3D64]/70">
                Get started by creating your first lesson above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-[#1D546C]/30 bg-[#F4F4F4]">
                    <th className="text-left py-4 px-4 font-semibold text-[#0C2B4E]">
                      Title
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-[#0C2B4E]">
                      Status
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-[#0C2B4E]">
                      Created
                    </th>
                    <th className="text-right py-4 px-4 font-semibold text-[#0C2B4E]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((lesson) => (
                    <tr
                      key={lesson.id}
                      className="border-b border-[#1D546C]/10 hover:bg-[#F4F4F4]/50 transition-all duration-200"
                    >
                      <td className="py-4 px-4 align-middle">
                        <div className="font-semibold text-[#0C2B4E]">
                          {lesson.title}
                        </div>
                        <div className="text-sm text-[#1A3D64]/60 mt-1 line-clamp-1">
                          {lesson.outline}
                        </div>
                      </td>
                      <td className="py-4 px-4 align-middle">
                        {getStatusBadge(lesson.status)}
                      </td>
                      <td className="py-4 px-4 text-[#1A3D64]/70 align-middle">
                        {new Date(lesson.created_at).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </td>
                      <td className="py-4 px-4 text-right align-middle">
                        {lesson.status === "generated" ? (
                          <Link href={`/lessons/${lesson.id}`}>
                            <Button
                              variant="default"
                              className="bg-gradient-to-r from-[#1A3D64] to-[#1D546C] hover:from-[#0C2B4E] hover:to-[#1A3D64] text-white shadow-lg transition-all duration-200 hover:shadow-xl"
                            >
                              👁️ View Lesson
                            </Button>
                          </Link>
                        ) : lesson.status === "failed" ? (
                          <span className="text-sm text-red-600 font-medium">
                            {lesson.error_message || "Generation failed"}
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            disabled
                            className="opacity-50 cursor-not-allowed border-[#1D546C]/30"
                          >
                            ⏳ Generating...
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Footer */}
        <div className="text-center mt-12 text-[#F4F4F4]/80">
          <p className="text-sm font-medium">
            ⚡ Powered by Google Gemini • Built with Next.js, TypeScript &
            Supabase
          </p>
        </div>
      </div>
    </div>
  );
}

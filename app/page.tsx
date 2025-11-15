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
  const [loading, setLoading] = useState(true);
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

    if (hasGenerating && !document.hidden) {
      // Poll every 3 seconds for updates (only when generating and tab is visible)
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

  // Handle visibility change (stop polling when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      const hasGenerating = lessons.some((l) => l.status === "generating");

      if (document.hidden && pollingIntervalRef.current) {
        // Stop polling when tab is hidden
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log("🔕 Polling stopped (tab hidden)");
      } else if (
        !document.hidden &&
        hasGenerating &&
        !pollingIntervalRef.current
      ) {
        // Resume polling when tab becomes visible again
        fetchLessons();
        pollingIntervalRef.current = setInterval(() => {
          fetchLessons();
        }, 3000);
        console.log("🔔 Polling resumed (tab visible)");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons]);

  const fetchLessons = async (retryCount = 0) => {
    try {
      if (retryCount === 0) setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch("/api/lessons", {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch lessons: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.lessons) {
        setLessons(data.lessons);
      }
    } catch (err) {
      console.error("Error fetching lessons:", err);

      // Retry on network errors (max 3 times)
      if (
        retryCount < 3 &&
        err instanceof Error &&
        (err.name === "AbortError" || err.message.includes("fetch"))
      ) {
        const delay = 1000 * Math.pow(2, retryCount); // Exponential backoff
        setTimeout(() => fetchLessons(retryCount + 1), delay);
      }
    } finally {
      if (retryCount === 0) setLoading(false);
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
      // Check if online
      if (!navigator.onLine) {
        throw new Error(
          "You are offline. Please check your internet connection."
        );
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch("/api/lessons/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ outline: outline.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = data.retryAfter || 60;
          const minutes = Math.ceil(retryAfter / 60);
          throw new Error(
            `⏱️ Rate limit exceeded. Please wait ${
              retryAfter < 60
                ? `${retryAfter} seconds`
                : `${minutes} minute${minutes > 1 ? "s" : ""}`
            } before trying again.`
          );
        }

        // Handle duplicate lesson conflict
        if (response.status === 409) {
          throw new Error(
            `${data.error}\n\n💡 Tip: Check your existing lessons below.`
          );
        }

        // Handle validation errors with suggestions
        if (data.suggestion) {
          throw new Error(`${data.error}\n\n💡 Suggestion: ${data.suggestion}`);
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
      // Display error with suggestion if available
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to generate lesson");
      }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Header */}
        <div className="text-center mb-16 mt-8">
          <h1 className="text-6xl md:text-7xl font-extrabold text-white mb-6 drop-shadow-2xl">
            <span className="bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
              AI Lesson Generator
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-4 leading-relaxed">
            Create ✨{" "}
            <span className="font-semibold text-yellow-300">interactive</span>{" "}
            educational content with AI-powered lessons in{" "}
            <span className="font-semibold text-green-300">11+ languages</span>
          </p>

          {/* Multilingual Taglines */}
          <div className="max-w-4xl mx-auto mb-8 space-y-3">
            <p className="text-lg text-yellow-200 font-semibold animate-pulse">
              🇮🇳 हिंदी, तमिल, गुजराती और अन्य भाषाओं में सीखें | Learn in Hindi,
              Tamil, Gujarati & more
            </p>
            <p className="text-base text-blue-200 italic">
              "علم حاصل کرنا ہر مرد اور عورت پر فرض ہے" - طلب العلم فریضۃ
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-white/70">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
              <span className="text-green-400">●</span> Multi-language Support
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
              <span className="text-blue-400">●</span> Interactive Learning
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
              <span className="text-purple-400">●</span> AI-Powered
            </div>
          </div>
        </div>

        {/* Generation Form */}
        <Card className="p-8 mb-12 shadow-2xl bg-white/95 backdrop-blur border-2 border-purple-300/30 hover:border-purple-400/50 transition-all duration-300 transform hover:scale-[1.01]">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <Label
                htmlFor="outline"
                className="text-lg font-bold mb-3 block bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
              >
                ✏️ What do you want to learn today?
              </Label>
              <textarea
                id="outline"
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                placeholder="e.g., 'Create an interactive quiz on Indian history' or 'Teach me photosynthesis with animations' or 'ગણિત પાઠ બનાવો' (Gujarati)"
                className="w-full h-40 px-5 py-4 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300/50 focus:border-purple-500 resize-none text-base transition-all duration-200 hover:border-purple-300 bg-gradient-to-br from-white to-purple-50/30 text-gray-800 placeholder:text-gray-400 shadow-inner"
                disabled={isGenerating}
              />
              <div className="flex items-start gap-2 mt-3 text-sm text-gray-600 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border-2 border-purple-200">
                <span className="text-lg">💡</span>
                <div className="flex-1">
                  <p className="font-bold text-purple-700 mb-2">Pro Tips:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li>Be specific about what you want to learn</li>
                    <li>
                      Mention if you want a quiz, tutorial, or interactive game
                    </li>
                    <li className="font-semibold text-purple-600">
                      🌍 Works in 11+ languages! Try:{" "}
                      <span className="text-orange-600">"गणित पाठ बनाओ"</span>{" "}
                      or <span className="text-green-600">"ગણિત શીખવો"</span>
                    </li>
                  </ul>
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <p className="text-xs text-gray-600 italic">
                      💬 <span className="font-semibold">हिंदी में:</span>{" "}
                      "विज्ञान का पाठ" •{" "}
                      <span className="font-semibold">தமிழில்:</span> "கணிதம்
                      பாடம்" • <span className="font-semibold">اردو:</span>{" "}
                      "سائنس سبق" •{" "}
                      <span className="font-semibold">ಕನ್ನಡ:</span> "ವಿಜ್ಞಾನ
                      ಪಾಠ"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg text-red-700 flex items-start gap-3">
                <span className="text-xl flex-shrink-0">⚠️</span>
                <div className="flex-1">
                  <p className="whitespace-pre-line">{error}</p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isGenerating || !outline.trim()}
              className="w-full py-6 text-lg font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] border-2 border-white/20"
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
        <Card className="p-8 shadow-2xl bg-white/95 backdrop-blur border-2 border-purple-300/30 hover:border-purple-400/50 transition-all duration-300">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 w-1.5 h-10 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                📚 Your Lessons
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage and access all your generated lessons •
                <span className="text-purple-600 font-semibold ml-1">
                  आपके पाठ
                </span>{" "}
                •
                <span className="text-blue-600 font-semibold">آپ کے اسباق</span>{" "}
                •
                <span className="text-green-600 font-semibold">
                  உங்கள் பாடங்கள்
                </span>
              </p>
            </div>
          </div>

          {loading && lessons.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="border-b border-[#1D546C]/20 pb-4 animate-pulse"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📖</div>
              <h3 className="mt-4 text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                No lessons yet • अभी कोई पाठ नहीं • ابھی کوئی سبق نہیں
              </h3>
              <p className="mt-3 text-gray-600 text-base">
                Get started by creating your first lesson above.
              </p>
              <p className="mt-2 text-sm text-purple-600 font-semibold">
                ऊपर अपना पहला पाठ बनाएं • மேலே உங்கள் முதல் பாடத்தை
                உருவாக்குங்கள்
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
                              📖 View Lesson
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
        {/* Footer */}
        <div className="text-center mt-12 space-y-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 max-w-2xl mx-auto border border-white/20">
            <p className="text-lg text-yellow-200 font-semibold mb-2">
              "ज्ञान ही शक्ति है"
            </p>
            <p className="text-sm text-white/70">
              Knowledge is Power • शिक्षा सबसे बड़ा धन है
            </p>
          </div>
          <p className="text-sm font-medium text-[#F4F4F4]/80">
            ⚡ Powered by Google Gemini • Built with Next.js, TypeScript &
            Supabase
          </p>
        </div>
      </div>
    </div>
  );
}

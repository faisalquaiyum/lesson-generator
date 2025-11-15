"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Lesson } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [LessonComponent, setLessonComponent] =
    useState<React.ComponentType | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchLesson(params.id as string);
    }
  }, [params.id]);

  const fetchLesson = async (id: string) => {
    try {
      const response = await fetch(`/api/lessons/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch lesson");
      }

      setLesson(data.lesson);

      // If the lesson is still generating, poll for updates
      if (data.lesson.status === "generating") {
        setTimeout(() => fetchLesson(id), 2000);
      } else if (
        data.lesson.status === "generated" &&
        data.lesson.generated_content
      ) {
        // Dynamically load and render the component
        loadComponent(data.lesson.generated_content);
      } else if (data.lesson.status === "failed") {
        setError(data.lesson.error_message || "Lesson generation failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lesson");
    } finally {
      setLoading(false);
    }
  };

  const loadComponent = async (generatedCode: string) => {
    try {
      // Compile TypeScript to JavaScript using the API endpoint
      const compileResponse = await fetch("/api/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: generatedCode }),
      });

      if (!compileResponse.ok) {
        const errorData = await compileResponse.json();
        throw new Error(
          errorData.details || errorData.error || "Compilation failed"
        );
      }

      const { compiledCode } = await compileResponse.json();

      // Create sandboxed HTML with React and the compiled component
      // Use a function to avoid template literal escaping issues
      const createHtml = (code: string) => {
        const htmlParts = [
          "<!DOCTYPE html>",
          "<html>",
          "  <head>",
          '    <meta charset="UTF-8">',
          '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
          '    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>',
          '    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>',
          '    <script src="https://cdn.tailwindcss.com"></script>',
          "    <style>",
          "      body { margin: 0; padding: 0; overflow-x: hidden; }",
          "    </style>",
          "  </head>",
          "  <body>",
          '    <div id="root"></div>',
          "    <script>",
          "      try {",
          "        const { useState, useEffect, useCallback, useMemo, useRef } = React;",
          "        ",
          code,
          "        ",
          '        const root = ReactDOM.createRoot(document.getElementById("root"));',
          "        root.render(React.createElement(LessonComponent));",
          "      } catch (error) {",
          '        document.body.innerHTML = "<div style=\\"padding: 20px; color: red;\\">Error rendering lesson: " + error.message + "</div>";',
          '        console.error("Lesson render error:", error);',
          "      }",
          "    </script>",
          "  </body>",
          "</html>",
        ];
        return htmlParts.join("\n");
      };

      const html = createHtml(compiledCode);

      // Store the HTML to render in iframe using srcdoc
      // Capture router in closure
      const routerInstance = router;

      setLessonComponent(() => {
        return function IframeLessonWrapper() {
          const iframeRef = useRef<HTMLIFrameElement>(null);

          useEffect(() => {
            // Listen for messages from the iframe
            const handleMessage = (event: MessageEvent) => {
              if (event.data === "navigateToHome") {
                // Use Next.js router for navigation
                routerInstance.push("/");
              }
            };

            window.addEventListener("message", handleMessage);
            return () => window.removeEventListener("message", handleMessage);
          }, []);

          return (
            <iframe
              ref={iframeRef}
              srcDoc={html}
              sandbox="allow-scripts allow-top-navigation"
              style={{
                width: "100%",
                minHeight: "600px",
                border: "none",
              }}
              title="Lesson Content"
            />
          );
        };
      });
    } catch (err) {
      console.error("Error loading component:", err);
      setError(
        "Failed to compile and render lesson: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-purple-400 mx-auto mb-6"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-20 w-20 border-4 border-blue-400 opacity-20 mx-auto"></div>
          </div>
          <p className="text-2xl text-white font-bold mb-2 animate-pulse">
            ⏳ Loading lesson...
          </p>
          <p className="text-white/70">Preparing your interactive content</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0C2B4E] to-[#1A3D64] flex items-center justify-center">
        <div className="max-w-2xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-2xl p-8 border-2 border-red-300">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="mt-4 text-2xl font-bold text-[#0C2B4E]">
                Error Loading Lesson
              </h2>
              <p className="mt-2 text-[#1A3D64]/70">{error}</p>
              <Link href="/">
                <Button className="mt-6 bg-gradient-to-r from-[#1A3D64] to-[#1D546C] hover:from-[#0C2B4E] hover:to-[#1A3D64] text-white shadow-lg">
                  ← Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0C2B4E] to-[#1A3D64] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-lg text-[#F4F4F4]/90 font-medium mb-4">
            Lesson not found
          </p>
          <Link href="/">
            <Button className="mt-4 bg-gradient-to-r from-[#1A3D64] to-[#1D546C] hover:from-[#0C2B4E] hover:to-[#1A3D64] text-white shadow-lg">
              ← Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (lesson.status === "generating") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-yellow-400 mx-auto"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-24 w-24 border-4 border-purple-400 opacity-20 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce">
              ✨
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            🎨 Crafting Your Lesson
          </h2>
          <p className="text-white/80 text-lg mb-3">
            Our AI is creating an interactive learning experience just for
            you...
          </p>
          <p className="text-yellow-200 text-base mb-6 font-semibold">
            आपका पाठ तैयार किया जा रहा है • آپ کا سبق تیار کیا جا رہا ہے
          </p>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
            <p className="text-white/70 text-sm mb-2">
              ⏱️ This usually takes 30-60 seconds. The page will auto-refresh
              when ready!
            </p>
            <p className="text-white/50 text-xs">
              कृपया प्रतीक्षा करें • براہ کرم انتظار کریں • தயவுசெய்து
              காத்திருங்கள்
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/">
            <Button
              variant="outline"
              className="mb-6 bg-white/90 border-2 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-500 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
            >
              ← Back to Lessons
            </Button>
          </Link>
          <div className="bg-gradient-to-r from-white via-purple-50 to-blue-50 backdrop-blur rounded-2xl p-6 shadow-2xl border-2 border-purple-200 transform hover:scale-[1.01] transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="text-5xl">📚</div>
              <div>
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {lesson.title}
                </h1>
                <p className="text-gray-600 mt-1 text-sm">
                  Interactive Learning Experience •
                  <span className="text-purple-600 font-semibold ml-1">
                    इंटरैक्टिव सीखने का अनुभव
                  </span>{" "}
                  •
                  <span className="text-blue-600 font-semibold">
                    انٹرایکٹو سیکھنے کا تجربہ
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Render the generated lesson component */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-purple-200 hover:border-purple-300 transition-all duration-300">
          {LessonComponent ? (
            <div className="p-0">
              <LessonComponent />
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Unable to render lesson content
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

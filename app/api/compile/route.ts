import { NextRequest, NextResponse } from "next/server";
import * as ts from "typescript";
import { rateLimit, rateLimitExceeded } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting: 30 compilations per minute
    const rateLimitResult = await rateLimit(req, {
      interval: 60 * 1000, // 1 minute
      uniqueTokenPerInterval: 30,
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
          },
        }
      );
    }

    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }

    // Validate code size (prevent memory issues)
    if (code.length > 500000) {
      // 500KB limit
      return NextResponse.json(
        { 
          error: `Code is too large (${Math.round(code.length / 1000)}KB). Maximum allowed: 500KB`,
        },
        { status: 413 }
      );
    }

    // Check if code is essentially empty
    if (code.trim().length < 100) {
      return NextResponse.json(
        { error: "Code is too short to be a valid component" },
        { status: 400 }
      );
    }

    // Transform the TypeScript code to remove imports and adjust exports
    let transformedCode = code;

    // Remove ALL variations of "use client" directives (including malformed ones)
    transformedCode = transformedCode.replace(/["']?use\s+client["']?;?\s*/gi, "");
    transformedCode = transformedCode.replace(/^["']use client["'];?\s*$/gim, "");
    
    // Clean up any remaining stray "use client" strings at the start
    transformedCode = transformedCode.replace(/^[\s\n]*use\s+client[^;]*;?\s*/gi, "");

    // Remove all import statements
    transformedCode = transformedCode.replace(
      /import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*/g,
      ""
    );
    transformedCode = transformedCode.replace(
      /import\s+["'][^"']+["'];?\s*/g,
      ""
    );

    // Replace "export default function ComponentName" with "function LessonComponent"
    transformedCode = transformedCode.replace(
      /export\s+default\s+function\s+(\w+)/g,
      "function LessonComponent"
    );

    // Remove any remaining export statements
    transformedCode = transformedCode.replace(/export\s+default\s+/g, "");
    transformedCode = transformedCode.replace(/export\s+/g, "");
    
    // Final cleanup: remove leading/trailing whitespace and multiple blank lines
    transformedCode = transformedCode.trim().replace(/\n{3,}/g, "\n\n");

    // Compile TypeScript to JavaScript
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.None,
      jsx: ts.JsxEmit.React,
      jsxFactory: "React.createElement",
      jsxFragmentFactory: "React.Fragment",
      removeComments: false,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: false,
      skipLibCheck: true,
      noEmit: false,
    };

    const result = ts.transpileModule(transformedCode, {
      compilerOptions,
    });

    // Validate compiled output
    if (!result.outputText || result.outputText.trim().length === 0) {
      return NextResponse.json(
        { error: "Compilation produced empty output. The code may be invalid." },
        { status: 500 }
      );
    }

    // Final security check: ensure no dangerous patterns in compiled code
    const dangerousPatterns = [
      /\beval\s*\(/,
      /\bFunction\s*\(/,
      /new\s+Function\s*\(/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(result.outputText)) {
        return NextResponse.json(
          { error: "Compiled code contains unsafe patterns and cannot be executed" },
          { status: 500 }
        );
      }
    }

    // Check for diagnostics (errors/warnings)
    if (result.diagnostics && result.diagnostics.length > 0) {
      const errors = result.diagnostics
        .map(
          (d) =>
            `Line ${
              d.file
                ? ts.getLineAndCharacterOfPosition(d.file, d.start!).line + 1
                : "?"
            }: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`
        )
        .join("\n");

      console.warn("TypeScript compilation warnings:", errors);
      // Continue anyway - warnings don't prevent execution
    }

    return NextResponse.json({
      success: true,
      compiledCode: result.outputText,
      sourceMap: result.sourceMapText,
    });
  } catch (error) {
    console.error("Compilation error:", error);
    return NextResponse.json(
      {
        error: "Failed to compile TypeScript",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

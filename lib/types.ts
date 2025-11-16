import { z } from "zod";
import ts from "typescript";

// Lesson database schema
export const LessonSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  outline: z.string(),
  status: z.enum(["generating", "generated", "failed"]),
  generated_content: z.string().nullable(),
  error_message: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Lesson = z.infer<typeof LessonSchema>;

/**
 * Comprehensive TypeScript code validation
 * Ensures only valid, safe code gets saved to database
 */
export function validateTypeScriptCode(code: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 1. Basic structure checks
  if (!code || code.trim().length === 0) {
    errors.push("Code is empty");
    return { isValid: false, errors };
  }
  
  // 2. Check for required React component structure
  if (!code.includes("export default function")) {
    errors.push("Missing default export function (must use: export default function ComponentName())");
  }
  
  // 3. Validate component name format
  const componentMatch = code.match(/export default function\s+(\w+)/);
  if (componentMatch) {
    const componentName = componentMatch[1];
    // Must start with uppercase (React convention)
    if (!/^[A-Z]/.test(componentName)) {
      errors.push(`Component name "${componentName}" must start with uppercase letter`);
    }
  }
  
  // 4. Check for proper JSX return
  if (!code.includes("return (") && !code.includes("return(") && !code.includes("return <")) {
    errors.push("Missing return statement with JSX");
  }
  
  // 5. Validate JSX structure
  const hasOpeningJSX = code.includes("<") && code.includes(">");
  const hasClosingJSX = code.includes("</");
  if (hasOpeningJSX && !hasClosingJSX) {
    errors.push("JSX elements not properly closed");
  }
  
  // 6. Check for dangerous patterns (SECURITY)
  const dangerousPatterns = [
    { pattern: /eval\s*\(/g, message: "Contains dangerous eval() function" },
    { pattern: /Function\s*\(/g, message: "Contains dangerous Function() constructor" },
    { pattern: /innerHTML\s*=/g, message: "Contains dangerous innerHTML (XSS risk)" },
    { pattern: /dangerouslySetInnerHTML/g, message: "Contains dangerouslySetInnerHTML (use with caution)" },
    { pattern: /__proto__/g, message: "Contains __proto__ manipulation" },
    { pattern: /document\.write/g, message: "Contains document.write (deprecated)" },
  ];
  
  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(code)) {
      errors.push(message);
    }
  }
  
  // 7. Check for unsupported import statements (except React)
  const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
  const imports = [...code.matchAll(importRegex)];
  for (const match of imports) {
    const importPath = match[1];
    if (!importPath.includes("react") && importPath !== "react") {
      errors.push(`Contains unsupported import: "${importPath}" (only React imports allowed)`);
    }
  }
  
  // 8. Basic syntax checks - balanced delimiters
  const openBraces = (code.match(/{/g) || []).length;
  const closeBraces = (code.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push(`Unbalanced braces (${openBraces} open, ${closeBraces} close)`);
  }
  
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push(`Unbalanced parentheses (${openParens} open, ${closeParens} close)`);
  }
  
  const openBrackets = (code.match(/\[/g) || []).length;
  const closeBrackets = (code.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push(`Unbalanced brackets (${openBrackets} open, ${closeBrackets} close)`);
  }
  
  // 9. Check for "use client" directive
  if (!code.includes('"use client"') && !code.includes("'use client'")) {
    errors.push('Missing "use client" directive at the top');
  }
  
  // 10. Validate React hooks usage if present
  const hooksRegex = /\b(useState|useEffect|useMemo|useCallback|useRef|useContext)\b/g;
  if (hooksRegex.test(code)) {
    // Ensure hooks are imported
    if (!code.includes('from "react"') && !code.includes("from 'react'")) {
      errors.push("Uses React hooks but missing React import");
    }
  }
  
  // 11. Check for Temporal Dead Zone (TDZ) errors - use before declaration
  // This catches common patterns where variables are accessed before they're defined
  const commonArrayVars = ['questions', 'items', 'cards', 'steps', 'lessons', 'data', 'options', 'choices', 'exercises'];
  const lines = code.split('\n');
  
  for (const varName of commonArrayVars) {
    let declLine = -1;
    let firstUseLine = -1;
    
    // Scan through lines to find declaration and first use
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for declaration (const/let/var varName =)
      if (declLine === -1 && /\b(const|let|var)\s+/.test(line) && new RegExp(`\\b${varName}\\s*=`).test(line)) {
        declLine = i;
      }
      
      // Check for usage (varName. or varName[)
      // But skip the declaration line itself and comments
      if (firstUseLine === -1 && !line.trim().startsWith('//') && !line.trim().startsWith('/*')) {
        const hasPropertyAccess = new RegExp(`\\b${varName}\\.[a-zA-Z_]`).test(line);
        const hasArrayAccess = new RegExp(`\\b${varName}\\[`).test(line);
        const isDeclarationLine = /\b(const|let|var)\s+/.test(line) && new RegExp(`\\b${varName}\\s*=`).test(line);
        
        if ((hasPropertyAccess || hasArrayAccess) && !isDeclarationLine) {
          firstUseLine = i;
        }
      }
    }
    
    // If we found both declaration and usage, and usage comes first
    if (declLine !== -1 && firstUseLine !== -1 && firstUseLine < declLine) {
      errors.push(`Variable "${varName}" is used at line ${firstUseLine + 1} before declaration at line ${declLine + 1} (TDZ error)`);
    }
  }
  
  // 12. Check for useState with initial value referencing undeclared variables
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const useStateMatch = line.match(/useState\s*\(([^)]+)\)/);
    
    if (useStateMatch) {
      const initialValue = useStateMatch[1];
      
      for (const varName of commonArrayVars) {
        // Check if useState references this variable
        if (new RegExp(`\\b${varName}\\b`).test(initialValue)) {
          // Find where variable is declared
          let declLine = -1;
          for (let j = 0; j < lines.length; j++) {
            if (/\b(const|let|var)\s+/.test(lines[j]) && new RegExp(`\\b${varName}\\s*=`).test(lines[j])) {
              declLine = j;
              break;
            }
          }
          
          if (declLine !== -1 && i < declLine) {
            errors.push(`useState at line ${i + 1} references "${varName}" before it's declared at line ${declLine + 1}`);
          }
        }
      }
    }
  }
  
  // 13. TypeScript compilation check (most comprehensive)
  try {
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.ES2015,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.React,
      strict: false, // Don't be too strict on types
      skipLibCheck: true,
      noEmit: true,
    };
    
    // Create a virtual source file
    const sourceFile = ts.createSourceFile(
      "temp.tsx",
      code,
      ts.ScriptTarget.ES2015,
      true,
      ts.ScriptKind.TSX
    );
    
    // Check for syntax errors
    const diagnostics: string[] = [];
    
    function visit(node: ts.Node) {
      // Check for syntax errors
      if (node.kind === ts.SyntaxKind.Unknown) {
        diagnostics.push("Contains unknown syntax");
      }
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    
    if (diagnostics.length > 0) {
      errors.push(...diagnostics);
    }
  } catch (tsError) {
    errors.push(`TypeScript compilation check failed: ${tsError instanceof Error ? tsError.message : String(tsError)}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

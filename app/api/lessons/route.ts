import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: lessons, error } = await supabase
      .from("lessons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching lessons:", error);
      return NextResponse.json(
        { error: "Failed to fetch lessons" },
        { status: 500 }
      );
    }

    return NextResponse.json({ lessons });
  } catch (error) {
    console.error("Error in lessons API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

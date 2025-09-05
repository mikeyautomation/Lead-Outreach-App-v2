import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.redirect(new URL("/auth/login?error=Could not sign out", process.env.NEXT_PUBLIC_SUPABASE_URL!))
  }

  return NextResponse.redirect(new URL("/auth/login", process.env.NEXT_PUBLIC_SUPABASE_URL!))
}

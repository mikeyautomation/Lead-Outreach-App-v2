import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params
    const supabase = createServerClient()

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update campaign status to paused
    const { data: campaign, error: updateError } = await supabase
      .from("campaigns")
      .update({
        status: "paused",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError || !campaign) {
      return NextResponse.json({ error: "Campaign not found or cannot be paused" }, { status: 404 })
    }

    return NextResponse.json({
      message: "Campaign paused successfully",
      campaign,
    })
  } catch (error) {
    console.error("[v0] Error pausing campaign:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

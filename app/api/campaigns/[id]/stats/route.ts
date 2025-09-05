import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params
    const supabase = await createClient()

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Get detailed tracking stats
    const { data: emailTracking } = await supabase
      .from("email_tracking")
      .select("sent_at, opened_at, clicked_at, replied_at")
      .eq("campaign_id", campaignId)

    const totalSent = emailTracking?.length || 0
    const totalOpened = emailTracking?.filter((e) => e.opened_at).length || 0
    const totalClicked = emailTracking?.filter((e) => e.clicked_at).length || 0
    const totalReplied = emailTracking?.filter((e) => e.replied_at).length || 0

    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0"
    const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : "0"
    const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : "0"

    return NextResponse.json({
      totalSent,
      totalOpened,
      totalClicked,
      totalReplied,
      openRate,
      clickRate,
      replyRate,
    })
  } catch (error) {
    console.error("[v0] Error fetching campaign stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

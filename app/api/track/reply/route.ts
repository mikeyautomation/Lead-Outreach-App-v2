import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { campaignId, leadId, replyContent, replySubject } = await request.json()

    if (!campaignId || !leadId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const supabase = await createClient()

    // Update email tracking record
    await supabase
      .from("email_tracking")
      .update({
        replied_at: new Date().toISOString(),
      })
      .eq("campaign_id", campaignId)
      .eq("lead_id", leadId)
      .is("replied_at", null) // Only update if not already replied

    // Update campaign_leads record
    await supabase
      .from("campaign_leads")
      .update({
        status: "replied",
        replied_at: new Date().toISOString(),
      })
      .eq("campaign_id", campaignId)
      .eq("lead_id", leadId)

    // Update campaign replied count
    const { data: campaign } = await supabase.from("campaigns").select("replied_count").eq("id", campaignId).single()

    if (campaign) {
      await supabase
        .from("campaigns")
        .update({
          replied_count: (campaign.replied_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId)
    }

    console.log(`[v0] Email reply tracked: Campaign ${campaignId}, Lead ${leadId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error tracking email reply:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

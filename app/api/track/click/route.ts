import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackingId = searchParams.get("id")
    const originalUrl = searchParams.get("url")

    if (!trackingId || !originalUrl) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    // Parse tracking ID to get campaign and lead info
    const [campaignId, leadId] = trackingId.split("_")

    if (campaignId && leadId) {
      const supabase = await createClient()

      // Create link tracking record
      await supabase.from("link_tracking").insert({
        campaign_id: campaignId,
        tracking_id: trackingId,
        original_url: decodeURIComponent(originalUrl),
        clicked_at: new Date().toISOString(),
        ip_address: request.headers.get("x-forwarded-for") || "unknown",
        user_agent: request.headers.get("user-agent") || "unknown",
      })

      // Update email tracking record
      await supabase
        .from("email_tracking")
        .update({
          clicked_at: new Date().toISOString(),
        })
        .eq("campaign_id", campaignId)
        .eq("lead_id", leadId)
        .is("clicked_at", null) // Only update if not already clicked

      console.log(`[v0] Link clicked: Campaign ${campaignId}, Lead ${leadId}, URL: ${originalUrl}`)
    }

    // Redirect to original URL
    return NextResponse.redirect(decodeURIComponent(originalUrl))
  } catch (error) {
    console.error("[v0] Error tracking link click:", error)

    // Redirect to original URL even on error
    const originalUrl = new URL(request.url).searchParams.get("url")
    if (originalUrl) {
      return NextResponse.redirect(decodeURIComponent(originalUrl))
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

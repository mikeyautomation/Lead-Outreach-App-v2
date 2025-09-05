import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get("campaign")
    const leadId = searchParams.get("lead")

    if (!campaignId || !leadId) {
      // Return 1x1 transparent pixel even if params are missing
      return new NextResponse(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"), {
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
    }

    const supabase = await createClient()

    // Update email tracking record
    await supabase
      .from("email_tracking")
      .update({
        opened_at: new Date().toISOString(),
      })
      .eq("campaign_id", campaignId)
      .eq("lead_id", leadId)
      .is("opened_at", null) // Only update if not already opened

    // Update campaign_leads record
    await supabase
      .from("campaign_leads")
      .update({
        status: "opened",
        opened_at: new Date().toISOString(),
      })
      .eq("campaign_id", campaignId)
      .eq("lead_id", leadId)
      .in("status", ["sent"]) // Only update if currently sent

    // Update campaign opened count
    const { data: campaign } = await supabase.from("campaigns").select("opened_count").eq("id", campaignId).single()

    if (campaign) {
      await supabase
        .from("campaigns")
        .update({
          opened_count: (campaign.opened_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId)
    }

    console.log(`[v0] Email opened: Campaign ${campaignId}, Lead ${leadId}`)

    // Return 1x1 transparent tracking pixel
    return new NextResponse(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"), {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("[v0] Error tracking email open:", error)

    // Always return tracking pixel even on error
    return new NextResponse(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"), {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  }
}

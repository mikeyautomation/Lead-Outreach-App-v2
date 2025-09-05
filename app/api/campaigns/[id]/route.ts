import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Check if campaign exists and belongs to user
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, name, status")
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    // Don't allow deletion of active campaigns
    if (campaign.status === "active") {
      return NextResponse.json(
        {
          error: "Cannot delete active campaign. Please pause it first.",
        },
        { status: 400 },
      )
    }

    console.log(`[v0] Deleting campaign: ${campaign.name} (${campaignId})`)

    // Delete related records first (foreign key constraints)

    // Delete email tracking records
    await supabase.from("email_tracking").delete().eq("campaign_id", campaignId)

    // Delete link tracking records
    await supabase.from("link_tracking").delete().eq("campaign_id", campaignId)

    // Delete campaign leads
    await supabase.from("campaign_leads").delete().eq("campaign_id", campaignId)

    // Finally delete the campaign
    const { error: deleteError } = await supabase.from("campaigns").delete().eq("id", campaignId).eq("user_id", user.id)

    if (deleteError) {
      console.error("[v0] Error deleting campaign:", deleteError)
      return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 })
    }

    console.log(`[v0] Successfully deleted campaign: ${campaign.name}`)

    return NextResponse.json({
      message: "Campaign deleted successfully",
      campaignName: campaign.name,
    })
  } catch (error) {
    console.error("[v0] Error deleting campaign:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

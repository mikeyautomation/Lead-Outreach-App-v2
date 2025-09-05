import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import {
  createCampaign,
  addLeadsToSmartLeadCampaign,
  startSmartLeadCampaign,
  personalizeContent,
} from "@/lib/smartlead/service"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: campaignId } = await params
    const supabase = createServerClient()

    console.log(`[v0] Starting SmartLead campaign send for ID: ${campaignId}`)

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log("[v0] Authentication failed")
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
      console.log("[v0] Campaign not found:", campaignError)
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
    }

    if (campaign.status !== "draft" && campaign.status !== "paused") {
      console.log("[v0] Campaign cannot be started, current status:", campaign.status)
      return NextResponse.json({ error: "Campaign cannot be started" }, { status: 400 })
    }

    // Get campaign leads that haven't been sent yet
    const { data: campaignLeads, error: leadsError } = await supabase
      .from("campaign_leads")
      .select(`
        *,
        leads (
          id,
          first_name,
          last_name,
          email,
          company_name,
          title,
          position,
          company,
          phone,
          company_website,
          industry,
          location,
          contact_name
        )
      `)
      .eq("campaign_id", campaignId)
      .eq("status", "pending")

    if (leadsError) {
      console.log("[v0] Failed to fetch leads:", leadsError)
      return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
    }

    if (!campaignLeads || campaignLeads.length === 0) {
      console.log("[v0] No pending leads found")
      return NextResponse.json({ error: "No pending leads to send to" }, { status: 400 })
    }

    // Filter leads with valid email addresses
    const validLeads = campaignLeads.filter((cl: any) => cl.leads && cl.leads.email && cl.leads.email.includes("@"))

    if (validLeads.length === 0) {
      console.log("[v0] No leads with valid email addresses")
      return NextResponse.json({ error: "No leads with valid email addresses" }, { status: 400 })
    }

    console.log(`[v0] Creating SmartLead campaign for ${validLeads.length} leads`)

    const smartLeadCampaign = await createCampaign({
      name: `${campaign.name} - ${new Date().toISOString()}`,
      subject: campaign.subject,
      email_content: campaign.email_content,
    })

    // Store SmartLead campaign ID in our database
    await supabase
      .from("campaigns")
      .update({
        external_id: smartLeadCampaign.id,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId)

    const smartLeadLeads = validLeads.map((campaignLead: any) => {
      const lead = campaignLead.leads
      return {
        email: lead.email,
        first_name: lead.first_name || lead.contact_name?.split(" ")[0] || "",
        last_name: lead.last_name || lead.contact_name?.split(" ").slice(1).join(" ") || "",
        company_name: lead.company_name || lead.company || "",
        phone: lead.phone || "",
        website: lead.company_website || "",
        custom_fields: {
          title: lead.title || lead.position || "",
          industry: lead.industry || "",
          location: lead.location || "",
        },
      }
    })

    await addLeadsToSmartLeadCampaign(smartLeadCampaign.id, smartLeadLeads)

    await startSmartLeadCampaign(smartLeadCampaign.id)

    for (const campaignLead of validLeads) {
      const lead = campaignLead.leads

      // Update campaign lead status
      await supabase
        .from("campaign_leads")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("campaign_id", campaignId)
        .eq("lead_id", lead.id)

      // Create email tracking record
      await supabase.from("email_tracking").insert({
        campaign_id: campaignId,
        lead_id: lead.id,
        subject: personalizeContent(campaign.subject, lead),
        content: personalizeContent(campaign.email_content, lead),
        email_type: "campaign",
        sent_at: new Date().toISOString(),
      })
    }

    // Update campaign statistics
    await supabase
      .from("campaigns")
      .update({
        sent_count: (campaign.sent_count || 0) + validLeads.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId)

    console.log(`[v0] SmartLead campaign created and started with ${validLeads.length} leads`)

    return NextResponse.json({
      message: "Campaign started successfully via SmartLead",
      totalLeads: validLeads.length,
      successCount: validLeads.length,
      errorCount: 0,
      status: "active",
      smartLeadCampaignId: smartLeadCampaign.id,
    })
  } catch (error) {
    console.error("[v0] Error starting SmartLead campaign:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

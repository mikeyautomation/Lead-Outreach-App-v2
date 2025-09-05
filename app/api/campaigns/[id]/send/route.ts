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

    if (campaign.status !== "draft" && campaign.status !== "paused") {
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
          location
        )
      `)
      .eq("campaign_id", campaignId)
      .eq("status", "pending")

    if (leadsError) {
      return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
    }

    if (!campaignLeads || campaignLeads.length === 0) {
      return NextResponse.json({ error: "No pending leads to send to" }, { status: 400 })
    }

    console.log(`[v0] Creating SmartLead campaign for: ${campaign.name}`)

    let smartLeadCampaignId: string

    try {
      // Check if we already have a SmartLead campaign ID stored
      if (campaign.external_id) {
        smartLeadCampaignId = campaign.external_id
        console.log(`[v0] Using existing SmartLead campaign ID: ${smartLeadCampaignId}`)
      } else {
        // Create new SmartLead campaign
        const smartLeadCampaign = await createCampaign({
          name: `${campaign.name} - ${new Date().toISOString()}`,
          subject: campaign.subject,
          email_content: campaign.email_content,
        })

        smartLeadCampaignId = smartLeadCampaign.id

        // Store SmartLead campaign ID in our database
        await supabase.from("campaigns").update({ external_id: smartLeadCampaignId }).eq("id", campaignId)

        console.log(`[v0] Created new SmartLead campaign with ID: ${smartLeadCampaignId}`)
      }

      // Prepare leads for SmartLead
      const smartLeadLeads = campaignLeads
        .filter((cl: any) => cl.leads && cl.leads.email && cl.leads.email.includes("@"))
        .map((campaignLead: any) => {
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
              lead_id: lead.id,
              campaign_id: campaignId,
            },
          }
        })

      console.log(`[v0] Adding ${smartLeadLeads.length} leads to SmartLead campaign`)

      // Add leads to SmartLead campaign
      await addLeadsToSmartLeadCampaign(smartLeadCampaignId, smartLeadLeads)

      // Start the SmartLead campaign
      await startSmartLeadCampaign(smartLeadCampaignId)

      // Update campaign status to active
      await supabase
        .from("campaigns")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
          sent_count: (campaign.sent_count || 0) + smartLeadLeads.length,
        })
        .eq("id", campaignId)

      // Update all campaign leads to sent status
      for (const campaignLead of campaignLeads) {
        if (campaignLead.leads && campaignLead.leads.email && campaignLead.leads.email.includes("@")) {
          await supabase
            .from("campaign_leads")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("campaign_id", campaignId)
            .eq("lead_id", campaignLead.leads.id)

          // Create email tracking record
          await supabase.from("email_tracking").insert({
            campaign_id: campaignId,
            lead_id: campaignLead.leads.id,
            subject: personalizeContent(campaign.subject, campaignLead.leads),
            content: personalizeContent(campaign.email_content, campaignLead.leads),
            email_type: "campaign",
            sent_at: new Date().toISOString(),
            external_id: `smartlead-${smartLeadCampaignId}-${campaignLead.leads.id}`,
          })
        }
      }

      console.log(`[v0] SmartLead campaign ${campaign.name} started successfully with ${smartLeadLeads.length} leads`)

      return NextResponse.json({
        message: "Campaign started successfully via SmartLead",
        smartLeadCampaignId: smartLeadCampaignId,
        totalLeads: smartLeadLeads.length,
        status: "active",
      })
    } catch (smartLeadError) {
      console.error("[v0] SmartLead API Error:", smartLeadError)

      // Fallback: Update campaign status back to draft if SmartLead fails
      await supabase.from("campaigns").update({ status: "draft" }).eq("id", campaignId)

      return NextResponse.json(
        {
          error: "Failed to start campaign via SmartLead",
          details: smartLeadError instanceof Error ? smartLeadError.message : "Unknown error",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("[v0] Error starting campaign:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

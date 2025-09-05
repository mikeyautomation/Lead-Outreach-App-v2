import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leadId } = await params
    const supabase = createServerClient()

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("user_id", user.id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    return NextResponse.json({ lead })
  } catch (error) {
    console.error("[v0] Error fetching lead:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leadId } = await params
    const supabase = createServerClient()
    const body = await request.json()

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Update lead
    const { data: lead, error: updateError } = await supabase
      .from("leads")
      .update({
        first_name: body.first_name,
        last_name: body.last_name,
        email: body.email,
        phone: body.phone,
        company_name: body.company_name,
        title: body.title,
        linkedin_url: body.linkedin_url,
        company_website: body.company_website,
        industry: body.industry,
        company_size: body.company_size,
        location: body.location,
        notes: body.notes,
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("[v0] Error updating lead:", updateError)
      return NextResponse.json({ error: "Failed to update lead" }, { status: 500 })
    }

    return NextResponse.json({ lead, message: "Lead updated successfully" })
  } catch (error) {
    console.error("[v0] Error updating lead:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: leadId } = await params
    const supabase = createServerClient()

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if lead exists and belongs to user
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, first_name, last_name, email")
      .eq("id", leadId)
      .eq("user_id", user.id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    console.log(`[v0] Deleting lead: ${lead.first_name} ${lead.last_name} (${leadId})`)

    // Delete related records first (foreign key constraints)

    // Delete email tracking records for this lead
    await supabase.from("email_tracking").delete().eq("lead_id", leadId)

    // Delete campaign leads associations
    await supabase.from("campaign_leads").delete().eq("lead_id", leadId)

    // Finally delete the lead
    const { error: deleteError } = await supabase.from("leads").delete().eq("id", leadId).eq("user_id", user.id)

    if (deleteError) {
      console.error("[v0] Error deleting lead:", deleteError)
      return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 })
    }

    console.log(`[v0] Successfully deleted lead: ${lead.first_name} ${lead.last_name}`)

    return NextResponse.json({
      message: "Lead deleted successfully",
      leadName: `${lead.first_name} ${lead.last_name}`,
    })
  } catch (error) {
    console.error("[v0] Error deleting lead:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

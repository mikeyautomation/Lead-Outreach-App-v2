import { type NextRequest, NextResponse } from "next/server"
import { createServerClientWithRequest } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting CSV import API")

    const supabase = createServerClientWithRequest(request)

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[v0] Authentication error:", authError)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("[v0] Authenticated user:", user.id, "Email:", user.email)

    if (user.email === "mike@scaledbyautomations.com") {
      console.log("[v0] Processing import for test user mike@scaledbyautomations.com")
      console.log("[v0] User metadata:", JSON.stringify(user.user_metadata, null, 2))
      console.log("[v0] User app metadata:", JSON.stringify(user.app_metadata, null, 2))
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single()

    if (profileError && profileError.code === "PGRST116") {
      // Profile doesn't exist, create it
      console.log("[v0] Creating profile for user:", user.id, user.email)
      const { error: createProfileError } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      if (createProfileError) {
        console.log("[v0] Failed to create profile:", createProfileError)
        if (user.email === "mike@scaledbyautomations.com") {
          console.log("[v0] CRITICAL: Failed to create profile for test user mike@scaledbyautomations.com")
          console.log("[v0] Profile creation error details:", JSON.stringify(createProfileError, null, 2))
        }
        return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 })
      } else {
        console.log("[v0] Successfully created profile for user:", user.email)
      }
    } else if (profileError) {
      console.log("[v0] Profile check error:", profileError)
      return NextResponse.json({ error: "Failed to verify user profile" }, { status: 500 })
    } else {
      console.log("[v0] Profile exists for user:", user.email)
    }

    const body = await request.json()
    const { leads } = body

    if (!leads || !Array.isArray(leads)) {
      return NextResponse.json({ error: "Invalid leads data" }, { status: 400 })
    }

    console.log("[v0] Processing", leads.length, "leads for user:", user.id)

    const leadsWithUserId = leads.map((lead) => ({
      ...lead,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    console.log("[v0] Sample lead data:", JSON.stringify(leadsWithUserId[0], null, 2))

    const validLeads = leadsWithUserId.filter((lead) => lead.email && lead.email.trim() !== "")
    const invalidLeads = leadsWithUserId.filter((lead) => !lead.email || lead.email.trim() === "")

    console.log("[v0] Valid leads with email:", validLeads.length)
    console.log("[v0] Invalid leads without email:", invalidLeads.length)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    if (user.email === "mike@scaledbyautomations.com") {
      console.log("[v0] Testing RLS policy for mike@scaledbyautomations.com")

      // Test if we can query the leads table
      const { data: testQuery, error: testError } = await supabase.from("leads").select("id").limit(1)

      if (testError) {
        console.log("[v0] RLS test query failed for mike@scaledbyautomations.com:", testError)
      } else {
        console.log("[v0] RLS test query successful for mike@scaledbyautomations.com")
      }
    }

    for (const lead of validLeads) {
      try {
        console.log("[v0] Processing lead:", lead.email, "for user:", lead.user_id)

        if (user.email === "mike@scaledbyautomations.com") {
          console.log(
            "[v0] Test user lead data:",
            JSON.stringify(
              {
                email: lead.email,
                user_id: lead.user_id,
                auth_user_id: user.id,
                match: lead.user_id === user.id,
              },
              null,
              2,
            ),
          )
        }

        const { data, error: leadError } = await supabase
          .from("leads")
          .upsert([lead], {
            onConflict: "email",
            ignoreDuplicates: false,
          })
          .select("id")

        if (leadError) {
          console.log("[v0] Lead error:", leadError, "for lead:", lead.email)
          if (user.email === "mike@scaledbyautomations.com") {
            console.log("[v0] CRITICAL: Lead import failed for test user mike@scaledbyautomations.com")
            console.log("[v0] Error code:", leadError.code)
            console.log("[v0] Error details:", leadError.details)
            console.log("[v0] Error hint:", leadError.hint)
          }
          errorCount++
          errors.push(`${lead.email}: ${leadError.message}`)
        } else {
          console.log("[v0] Successfully processed lead:", lead.email)
          successCount++
        }
      } catch (err) {
        console.log("[v0] Lead exception:", err, "for lead:", lead.email)
        errorCount++
        errors.push(`${lead.email}: ${err instanceof Error ? err.message : "Unknown error"}`)
      }
    }

    // Process invalid leads without email (use insert)
    for (const lead of invalidLeads) {
      try {
        const { error: invalidError } = await supabase.from("leads").insert([lead])

        if (invalidError) {
          console.log("[v0] Invalid lead error:", invalidError)
          errors.push(`Lead without email: ${invalidError.message}`)
          errorCount++
        } else {
          successCount++
        }
      } catch (err) {
        console.log("[v0] Invalid lead exception:", err)
        errorCount++
        errors.push(`Lead without email: ${err instanceof Error ? err.message : "Unknown error"}`)
      }
    }

    console.log("[v0] Import completed. Success:", successCount, "Errors:", errorCount)

    if (errorCount > 0 && successCount === 0) {
      return NextResponse.json(
        {
          error: `Failed to import leads. First few errors: ${errors.slice(0, 3).join("; ")}`,
          success: false,
          successCount,
          errorCount,
          errors: errors.slice(0, 5),
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      successCount,
      errorCount,
      errors: errors.slice(0, 5), // Return first 5 errors
      message: `Successfully imported ${successCount} leads${errorCount > 0 ? ` (${errorCount} failed)` : ""}`,
    })
  } catch (error) {
    console.log("[v0] API error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
        success: false,
      },
      { status: 500 },
    )
  }
}

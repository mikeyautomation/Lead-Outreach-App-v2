import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting CSV import API")

    const supabase = createServerClient()

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[v0] Authentication error:", authError)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("[v0] Authenticated user:", user.id)

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

    const validLeads = leadsWithUserId.filter((lead) => lead.email && lead.email.trim() !== "")
    const invalidLeads = leadsWithUserId.filter((lead) => !lead.email || lead.email.trim() === "")

    console.log("[v0] Valid leads with email:", validLeads.length)
    console.log("[v0] Invalid leads without email:", invalidLeads.length)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process valid leads with email (use upsert)
    if (validLeads.length > 0) {
      try {
        const { data, error: upsertError } = await supabase
          .from("leads")
          .upsert(validLeads, {
            onConflict: "email",
            ignoreDuplicates: false,
          })
          .select("id")

        if (upsertError) {
          console.log("[v0] Bulk upsert error:", upsertError)

          // Try individual inserts
          for (const lead of validLeads) {
            try {
              const { error: individualError } = await supabase.from("leads").upsert([lead], {
                onConflict: "email",
                ignoreDuplicates: false,
              })

              if (individualError) {
                console.log("[v0] Individual lead error:", individualError, "for lead:", lead.email)
                errorCount++
                errors.push(`${lead.email}: ${individualError.message}`)
              } else {
                successCount++
              }
            } catch (err) {
              console.log("[v0] Individual lead exception:", err)
              errorCount++
              errors.push(`${lead.email}: ${err instanceof Error ? err.message : "Unknown error"}`)
            }
          }
        } else {
          successCount += validLeads.length
          console.log("[v0] Bulk upsert successful, processed", validLeads.length, "leads")
        }
      } catch (bulkError) {
        console.log("[v0] Bulk upsert exception:", bulkError)

        // Fallback to individual processing
        for (const lead of validLeads) {
          try {
            const { error: individualError } = await supabase.from("leads").upsert([lead], {
              onConflict: "email",
              ignoreDuplicates: false,
            })

            if (individualError) {
              errorCount++
              errors.push(`${lead.email}: ${individualError.message}`)
            } else {
              successCount++
            }
          } catch (err) {
            errorCount++
            errors.push(`${lead.email}: ${err instanceof Error ? err.message : "Unknown error"}`)
          }
        }
      }
    }

    // Process invalid leads without email (use insert)
    if (invalidLeads.length > 0) {
      try {
        const { error: invalidError } = await supabase.from("leads").insert(invalidLeads)

        if (invalidError) {
          console.log("[v0] Invalid leads error:", invalidError)
          errors.push(`${invalidLeads.length} leads without email: ${invalidError.message}`)
          errorCount += invalidLeads.length
        } else {
          successCount += invalidLeads.length
        }
      } catch (err) {
        console.log("[v0] Invalid leads exception:", err)
        errorCount += invalidLeads.length
        errors.push(`Leads without email: ${err instanceof Error ? err.message : "Unknown error"}`)
      }
    }

    console.log("[v0] Import completed. Success:", successCount, "Errors:", errorCount)

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

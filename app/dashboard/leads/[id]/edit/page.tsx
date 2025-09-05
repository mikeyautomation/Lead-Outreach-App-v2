import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { LeadEditForm } from "@/components/lead-edit-form"

export default async function EditLeadPage({
  params,
}: {
  params: { id: string }
}) {
  const cookieStore = cookies()
  const supabase = createServerClient(cookieStore)

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch the lead
  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()

  if (error || !lead) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Edit Lead</h1>
          <p className="text-muted-foreground">Update the lead information below.</p>
        </div>

        <LeadEditForm lead={lead} />
      </div>
    </div>
  )
}

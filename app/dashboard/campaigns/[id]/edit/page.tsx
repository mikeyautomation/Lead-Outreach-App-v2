import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CampaignEditForm } from "@/components/campaign-edit-form"

export default async function EditCampaignPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login")
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()

  if (!campaign) {
    redirect("/dashboard/campaigns")
  }

  const { data: leads } = await supabase.from("leads").select("*").eq("user_id", user.id)

  return (
    <div className="container mx-auto py-8">
      <CampaignEditForm campaign={campaign} leads={leads || []} />
    </div>
  )
}

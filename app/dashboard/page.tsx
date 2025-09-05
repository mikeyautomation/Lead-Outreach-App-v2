import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Mail, BarChart3, TrendingUp, Eye } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get user profile data
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  // Get dashboard stats
  const { data: leads, count: leadsCount } = await supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("user_id", data.user.id)

  const { data: campaigns, count: campaignsCount } = await supabase
    .from("campaigns")
    .select("*", { count: "exact" })
    .eq("user_id", data.user.id)

  // Calculate stats
  const totalSent = campaigns?.reduce((sum, campaign) => sum + (campaign.sent_count || 0), 0) || 0
  const totalOpened = campaigns?.reduce((sum, campaign) => sum + (campaign.opened_count || 0), 0) || 0
  const totalReplied = campaigns?.reduce((sum, campaign) => sum + (campaign.replied_count || 0), 0) || 0

  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0"
  const replyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : "0"

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lead Outreach Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {profile?.first_name || data.user.email}</p>
          </div>
          <form action="/auth/logout" method="post">
            <Button variant="outline" type="submit">
              Sign Out
            </Button>
          </form>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leadsCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                {leadsCount === 0 ? "No leads added yet" : "Active prospects"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{campaignsCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                {campaignsCount === 0 ? "No campaigns created" : "Running campaigns"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openRate}%</div>
              <p className="text-xs text-muted-foreground">
                {totalSent === 0 ? "No emails sent yet" : `${totalOpened} of ${totalSent} opened`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{replyRate}%</div>
              <p className="text-xs text-muted-foreground">
                {totalSent === 0 ? "No emails sent yet" : `${totalReplied} replies received`}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with your lead outreach</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                <Link href="/dashboard/leads">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Leads ({leadsCount || 0})
                </Link>
              </Button>
              <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                <Link href="/dashboard/campaigns">
                  <Mail className="mr-2 h-4 w-4" />
                  View Campaigns ({campaignsCount || 0})
                </Link>
              </Button>
              <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                <Link href="/dashboard/analytics">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Analytics
                </Link>
              </Button>
              <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                <Link href="/dashboard/tracking">
                  <Eye className="mr-2 h-4 w-4" />
                  Email Tracking
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest outreach activities</CardDescription>
            </CardHeader>
            <CardContent>
              {leads && leads.length > 0 ? (
                <div className="space-y-3">
                  {leads.slice(0, 3).map((lead) => (
                    <div key={lead.id} className="flex items-center gap-3 text-sm">
                      <div className="h-2 w-2 bg-blue-500 rounded-full" />
                      <span>
                        Added {lead.first_name} {lead.last_name} from {lead.company_name}
                      </span>
                      <span className="text-muted-foreground ml-auto">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                  {leads.length > 3 && (
                    <Button asChild variant="link" className="p-0 h-auto">
                      <Link href="/dashboard/leads">View all leads</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No recent activity to display</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CalendarDays,
  TrendingUp,
  Mail,
  Users,
  Eye,
  Reply,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import Link from "next/link"
import { CampaignPerformanceChart } from "@/components/analytics/campaign-performance-chart"
import { EmailMetricsChart } from "@/components/analytics/email-metrics-chart"
import { LeadSourceChart } from "@/components/analytics/lead-source-chart"
import { ResponseRateChart } from "@/components/analytics/response-rate-chart"

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get all campaigns for analytics
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })

  // Get all leads for source analytics
  const { data: leads } = await supabase.from("leads").select("source, created_at, status").eq("user_id", data.user.id)

  // Get email tracking data
  const { data: emailTracking } = await supabase
    .from("email_tracking")
    .select("sent_at, opened_at, clicked_at, replied_at, campaign_id")
    .in("campaign_id", campaigns?.map((c) => c.id) || [])

  // Calculate overall metrics
  const totalCampaigns = campaigns?.length || 0
  const totalLeads = leads?.length || 0
  const totalSent = campaigns?.reduce((sum, campaign) => sum + (campaign.sent_count || 0), 0) || 0
  const totalOpened = campaigns?.reduce((sum, campaign) => sum + (campaign.opened_count || 0), 0) || 0
  const totalReplied = campaigns?.reduce((sum, campaign) => sum + (campaign.replied_count || 0), 0) || 0

  const overallOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0"
  const overallReplyRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : "0"

  // Calculate trends (comparing last 30 days vs previous 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sixtyDaysAgo = new Date()
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const recentCampaigns = campaigns?.filter((c) => new Date(c.created_at) >= thirtyDaysAgo) || []
  const previousCampaigns =
    campaigns?.filter((c) => new Date(c.created_at) >= sixtyDaysAgo && new Date(c.created_at) < thirtyDaysAgo) || []

  const recentSent = recentCampaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0)
  const previousSent = previousCampaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0)
  const sentTrend = previousSent > 0 ? (((recentSent - previousSent) / previousSent) * 100).toFixed(1) : "0"

  const recentOpened = recentCampaigns.reduce((sum, c) => sum + (c.opened_count || 0), 0)
  const previousOpened = previousCampaigns.reduce((sum, c) => sum + (c.opened_count || 0), 0)
  const recentOpenRate = recentSent > 0 ? (recentOpened / recentSent) * 100 : 0
  const previousOpenRate = previousSent > 0 ? (previousOpened / previousSent) * 100 : 0
  const openRateTrend =
    previousOpenRate > 0 ? (((recentOpenRate - previousOpenRate) / previousOpenRate) * 100).toFixed(1) : "0"

  // Prepare data for charts
  const campaignPerformanceData =
    campaigns?.map((campaign) => ({
      name: campaign.name,
      sent: campaign.sent_count || 0,
      opened: campaign.opened_count || 0,
      replied: campaign.replied_count || 0,
      openRate: campaign.sent_count > 0 ? (((campaign.opened_count || 0) / campaign.sent_count) * 100).toFixed(1) : "0",
      replyRate:
        campaign.sent_count > 0 ? (((campaign.replied_count || 0) / campaign.sent_count) * 100).toFixed(1) : "0",
    })) || []

  // Lead source data
  const leadSourceData =
    leads?.reduce((acc: any[], lead) => {
      const source = lead.source || "Unknown"
      const existing = acc.find((item) => item.source === source)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ source, count: 1 })
      }
      return acc
    }, []) || []

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-sm text-muted-foreground">Track your outreach performance and insights</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Select defaultValue="30">
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCampaigns}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <CalendarDays className="mr-1 h-3 w-3" />
                  {recentCampaigns.length} this month
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
                <div className="flex items-center text-xs">
                  {Number(sentTrend) >= 0 ? (
                    <ArrowUpRight className="mr-1 h-3 w-3 text-green-600" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-3 w-3 text-red-600" />
                  )}
                  <span className={Number(sentTrend) >= 0 ? "text-green-600" : "text-red-600"}>
                    {Math.abs(Number(sentTrend))}%
                  </span>
                  <span className="text-muted-foreground ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallOpenRate}%</div>
                <div className="flex items-center text-xs">
                  {Number(openRateTrend) >= 0 ? (
                    <ArrowUpRight className="mr-1 h-3 w-3 text-green-600" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-3 w-3 text-red-600" />
                  )}
                  <span className={Number(openRateTrend) >= 0 ? "text-green-600" : "text-red-600"}>
                    {Math.abs(Number(openRateTrend))}%
                  </span>
                  <span className="text-muted-foreground ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
                <Reply className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallReplyRate}%</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Users className="mr-1 h-3 w-3" />
                  {totalReplied} total replies
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Campaign Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>Compare performance across your campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <CampaignPerformanceChart data={campaignPerformanceData} />
              </CardContent>
            </Card>

            {/* Email Metrics Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Email Metrics Trend</CardTitle>
                <CardDescription>Track your email performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <EmailMetricsChart campaigns={campaigns || []} />
              </CardContent>
            </Card>

            {/* Lead Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Sources</CardTitle>
                <CardDescription>Where your leads are coming from</CardDescription>
              </CardHeader>
              <CardContent>
                <LeadSourceChart data={leadSourceData} />
              </CardContent>
            </Card>

            {/* Response Rate Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Response Rate Analysis</CardTitle>
                <CardDescription>Open and reply rates by campaign</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponseRateChart data={campaignPerformanceData} />
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Campaigns</CardTitle>
              <CardDescription>Your best campaigns by engagement metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns && campaigns.length > 0 ? (
                  campaigns
                    .filter((c) => c.sent_count > 0)
                    .sort((a, b) => {
                      const aRate = (a.opened_count || 0) / a.sent_count
                      const bRate = (b.opened_count || 0) / b.sent_count
                      return bRate - aRate
                    })
                    .slice(0, 5)
                    .map((campaign, index) => {
                      const openRate = (((campaign.opened_count || 0) / campaign.sent_count) * 100).toFixed(1)
                      const replyRate = (((campaign.replied_count || 0) / campaign.sent_count) * 100).toFixed(1)

                      return (
                        <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-medium">{campaign.name}</div>
                              <div className="text-sm text-muted-foreground">{campaign.subject}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <div className="font-medium">{campaign.sent_count}</div>
                              <div className="text-muted-foreground">Sent</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-green-600">{openRate}%</div>
                              <div className="text-muted-foreground">Open Rate</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-blue-600">{replyRate}%</div>
                              <div className="text-muted-foreground">Reply Rate</div>
                            </div>
                            <Badge variant="outline">{campaign.status}</Badge>
                          </div>
                        </div>
                      )
                    })
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No campaign data yet</h3>
                    <p className="text-muted-foreground mb-4">Create and send campaigns to see performance analytics</p>
                    <Button asChild>
                      <Link href="/dashboard/campaigns/create">Create Campaign</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

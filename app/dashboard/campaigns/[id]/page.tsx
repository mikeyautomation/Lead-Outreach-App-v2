import type React from "react"
import { redirect, notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Edit, Users, Mail, Eye, Reply } from "lucide-react"
import Link from "next/link"
import { CampaignActions } from "@/components/campaign-actions"
import { EmailTrackingWidget } from "@/components/email-tracking-widget"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CampaignDetailsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get campaign details
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("user_id", data.user.id)
    .single()

  if (campaignError || !campaign) {
    notFound()
  }

  // Get campaign leads with lead details
  const { data: campaignLeads } = await supabase
    .from("campaign_leads")
    .select(`
      *,
      leads (
        id,
        first_name,
        last_name,
        email,
        company_name,
        title
      )
    `)
    .eq("campaign_id", id)

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "active":
        return "bg-green-100 text-green-800"
      case "paused":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "stopped":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getLeadStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-gray-100 text-gray-800"
      case "sent":
        return "bg-blue-100 text-blue-800"
      case "opened":
        return "bg-green-100 text-green-800"
      case "replied":
        return "bg-purple-100 text-purple-800"
      case "bounced":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const openRate = campaign.sent_count > 0 ? ((campaign.opened_count / campaign.sent_count) * 100).toFixed(1) : "0"
  const replyRate = campaign.sent_count > 0 ? ((campaign.replied_count / campaign.sent_count) * 100).toFixed(1) : "0"

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/campaigns">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Campaigns
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <p className="text-sm text-muted-foreground">{campaign.subject}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(campaign.status || "draft")} variant="secondary">
              {campaign.status || "Draft"}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/campaigns/${campaign.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
            <CampaignActions
              campaignId={campaign.id}
              status={campaign.status || "draft"}
              totalLeads={campaign.total_leads || 0}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Campaign Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaign.total_leads || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaign.sent_count || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openRate}%</div>
                <p className="text-xs text-muted-foreground">{campaign.opened_count || 0} opened</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
                <Reply className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{replyRate}%</div>
                <p className="text-xs text-muted-foreground">{campaign.replied_count || 0} replied</p>
              </CardContent>
            </Card>

            <div className="md:col-span-2 lg:col-span-1">
              <EmailTrackingWidget campaignId={campaign.id} />
            </div>
          </div>

          {/* Email Content Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Email Content</CardTitle>
              <CardDescription>Preview of the email template</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  {/* <Label className="text-sm font-medium">Subject:</Label> */}
                  <div className="mt-1 p-3 bg-muted rounded-md text-sm">{campaign.subject}</div>
                </div>
                <div>
                  {/* <Label className="text-sm font-medium">Content:</Label> */}
                  <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                    {campaign.email_content}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Leads */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Leads ({campaignLeads?.length || 0})</CardTitle>
              <CardDescription>Status of each lead in this campaign</CardDescription>
            </CardHeader>
            <CardContent>
              {campaignLeads && campaignLeads.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent At</TableHead>
                        <TableHead>Opened At</TableHead>
                        <TableHead>Replied At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaignLeads.map((campaignLead: any) => (
                        <TableRow key={campaignLead.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {campaignLead.leads?.first_name} {campaignLead.leads?.last_name}
                              </div>
                              <div className="text-sm text-muted-foreground">{campaignLead.leads?.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{campaignLead.leads?.company_name}</div>
                              {campaignLead.leads?.title && (
                                <div className="text-sm text-muted-foreground">{campaignLead.leads?.title}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getLeadStatusColor(campaignLead.status || "pending")} variant="secondary">
                              {campaignLead.status || "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {campaignLead.sent_at ? new Date(campaignLead.sent_at).toLocaleString() : "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {campaignLead.opened_at ? new Date(campaignLead.opened_at).toLocaleString() : "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {campaignLead.replied_at ? new Date(campaignLead.replied_at).toLocaleString() : "-"}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No leads in this campaign</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}

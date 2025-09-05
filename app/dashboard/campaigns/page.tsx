import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Play, Pause, MoreHorizontal, Mail, Users } from "lucide-react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default async function CampaignsPage() {
  const supabase = createServerClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get campaigns for the current user
  const { data: campaigns, error: campaignsError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })

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

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return <Play className="h-3 w-3" />
      case "paused":
        return <Pause className="h-3 w-3" />
      default:
        return <Mail className="h-3 w-3" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Email Campaigns</h1>
            <p className="text-sm text-muted-foreground">Create and manage your email outreach campaigns</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/campaigns/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Campaigns ({campaigns?.length || 0})</CardTitle>
            <CardDescription>Manage your email outreach campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns && campaigns.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Leads</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Opened</TableHead>
                      <TableHead>Replied</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => {
                      const openRate =
                        campaign.sent_count > 0 ? ((campaign.opened_count / campaign.sent_count) * 100).toFixed(1) : "0"
                      const replyRate =
                        campaign.sent_count > 0
                          ? ((campaign.replied_count / campaign.sent_count) * 100).toFixed(1)
                          : "0"

                      return (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{campaign.name}</div>
                              <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {campaign.subject}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(campaign.status || "draft")} variant="secondary">
                              <div className="flex items-center gap-1">
                                {getStatusIcon(campaign.status || "draft")}
                                {campaign.status || "Draft"}
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{campaign.total_leads || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{campaign.sent_count || 0}</div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">{campaign.opened_count || 0}</div>
                              <div className="text-xs text-muted-foreground">{openRate}%</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">{campaign.replied_count || 0}</div>
                              <div className="text-xs text-muted-foreground">{replyRate}%</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {new Date(campaign.created_at).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/campaigns/${campaign.id}`}>View Details</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={`/dashboard/campaigns/${campaign.id}/edit`}>Edit</Link>
                                </DropdownMenuItem>
                                {campaign.status === "draft" && <DropdownMenuItem>Start Campaign</DropdownMenuItem>}
                                {campaign.status === "active" && <DropdownMenuItem>Pause Campaign</DropdownMenuItem>}
                                {campaign.status === "paused" && <DropdownMenuItem>Resume Campaign</DropdownMenuItem>}
                                <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Mail className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No campaigns yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first email campaign to start reaching out to leads
                </p>
                <Button asChild>
                  <Link href="/dashboard/campaigns/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

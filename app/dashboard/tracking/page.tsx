import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, MousePointer, Reply, Mail, Search, ExternalLink, Clock, User, Building2 } from "lucide-react"
import Link from "next/link"

export default async function EmailTrackingPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get all email tracking data with campaign and lead details
  const { data: emailTracking } = await supabase
    .from("email_tracking")
    .select(`
      *,
      campaigns (
        id,
        name,
        subject
      ),
      leads (
        id,
        first_name,
        last_name,
        email,
        company_name,
        title
      )
    `)
    .in(
      "campaign_id",
      (await supabase.from("campaigns").select("id").eq("user_id", data.user.id)).data?.map((c) => c.id) || [],
    )
    .order("sent_at", { ascending: false })

  // Get link tracking data
  const { data: linkTracking } = await supabase
    .from("link_tracking")
    .select("*")
    .in(
      "campaign_id",
      (await supabase.from("campaigns").select("id").eq("user_id", data.user.id)).data?.map((c) => c.id) || [],
    )
    .order("clicked_at", { ascending: false })

  // Calculate tracking statistics
  const totalEmails = emailTracking?.length || 0
  const openedEmails = emailTracking?.filter((e) => e.opened_at).length || 0
  const clickedEmails = emailTracking?.filter((e) => e.clicked_at).length || 0
  const repliedEmails = emailTracking?.filter((e) => e.replied_at).length || 0
  const totalClicks = linkTracking?.length || 0

  const openRate = totalEmails > 0 ? ((openedEmails / totalEmails) * 100).toFixed(1) : "0"
  const clickRate = totalEmails > 0 ? ((clickedEmails / totalEmails) * 100).toFixed(1) : "0"
  const replyRate = totalEmails > 0 ? ((repliedEmails / totalEmails) * 100).toFixed(1) : "0"

  const getStatusBadge = (email: any) => {
    if (email.replied_at) {
      return (
        <Badge className="bg-purple-100 text-purple-800" variant="secondary">
          Replied
        </Badge>
      )
    }
    if (email.clicked_at) {
      return (
        <Badge className="bg-blue-100 text-blue-800" variant="secondary">
          Clicked
        </Badge>
      )
    }
    if (email.opened_at) {
      return (
        <Badge className="bg-green-100 text-green-800" variant="secondary">
          Opened
        </Badge>
      )
    }
    if (email.bounced_at) {
      return (
        <Badge className="bg-red-100 text-red-800" variant="secondary">
          Bounced
        </Badge>
      )
    }
    return (
      <Badge className="bg-gray-100 text-gray-800" variant="secondary">
        Sent
      </Badge>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Email Tracking</h1>
            <p className="text-sm text-muted-foreground">Monitor email opens, clicks, and engagement</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/analytics">Analytics</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Tracking Statistics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Emails</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalEmails}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openRate}%</div>
                <p className="text-xs text-muted-foreground">{openedEmails} opened</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{clickRate}%</div>
                <p className="text-xs text-muted-foreground">{clickedEmails} clicked</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
                <Reply className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{replyRate}%</div>
                <p className="text-xs text-muted-foreground">{repliedEmails} replied</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalClicks}</div>
                <p className="text-xs text-muted-foreground">Link clicks</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by recipient, campaign, or subject..." className="pl-10" />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="opened">Opened</SelectItem>
                    <SelectItem value="clicked">Clicked</SelectItem>
                    <SelectItem value="replied">Replied</SelectItem>
                    <SelectItem value="bounced">Bounced</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all-campaigns">
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-campaigns">All Campaigns</SelectItem>
                    {/* Add campaign options dynamically */}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Email Tracking Table */}
          <Card>
            <CardHeader>
              <CardTitle>Email Activity ({emailTracking?.length || 0})</CardTitle>
              <CardDescription>Detailed tracking information for all sent emails</CardDescription>
            </CardHeader>
            <CardContent>
              {emailTracking && emailTracking.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Opened</TableHead>
                        <TableHead>Clicked</TableHead>
                        <TableHead>Replied</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailTracking.map((email: any) => (
                        <TableRow key={email.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                <span className="font-medium">
                                  {email.leads?.first_name} {email.leads?.last_name}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">{email.leads?.email}</div>
                              {email.leads?.company_name && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Building2 className="h-3 w-3" />
                                  {email.leads.company_name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{email.campaigns?.name}</div>
                              <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {email.subject}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(email)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-3 w-3" />
                              {email.sent_at ? new Date(email.sent_at).toLocaleString() : "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {email.opened_at ? (
                                <div className="flex items-center gap-1 text-green-600">
                                  <Eye className="h-3 w-3" />
                                  {new Date(email.opened_at).toLocaleString()}
                                </div>
                              ) : (
                                "-"
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {email.clicked_at ? (
                                <div className="flex items-center gap-1 text-blue-600">
                                  <MousePointer className="h-3 w-3" />
                                  {new Date(email.clicked_at).toLocaleString()}
                                </div>
                              ) : (
                                "-"
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {email.replied_at ? (
                                <div className="flex items-center gap-1 text-purple-600">
                                  <Reply className="h-3 w-3" />
                                  {new Date(email.replied_at).toLocaleString()}
                                </div>
                              ) : (
                                "-"
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No email tracking data</h3>
                  <p className="text-muted-foreground mb-4">Send some campaigns to start tracking email engagement</p>
                  <Button asChild>
                    <Link href="/dashboard/campaigns">View Campaigns</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Link Tracking */}
          {linkTracking && linkTracking.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Link Clicks ({linkTracking.length})</CardTitle>
                <CardDescription>Track which links are being clicked in your emails</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>URL</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Clicked At</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>User Agent</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {linkTracking.slice(0, 10).map((click: any) => (
                        <TableRow key={click.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <ExternalLink className="h-3 w-3" />
                              <span className="font-mono text-sm truncate max-w-[300px]">{click.original_url}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{click.campaign_id}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {click.clicked_at ? new Date(click.clicked_at).toLocaleString() : "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-mono">{click.ip_address || "Unknown"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {click.user_agent || "Unknown"}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}

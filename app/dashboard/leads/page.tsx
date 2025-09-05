import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Upload, Building2, Mail, Phone } from "lucide-react"
import Link from "next/link"
import { LeadRowActions } from "@/components/lead-row-actions"

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get leads for the current user
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("*")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "new":
        return "bg-blue-100 text-blue-800"
      case "contacted":
        return "bg-yellow-100 text-yellow-800"
      case "qualified":
        return "bg-green-100 text-green-800"
      case "unqualified":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lead Management</h1>
            <p className="text-sm text-muted-foreground">Manage your leads and prospects</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <span>Dashboard</span>
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/leads/import">
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/leads/add">
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search leads by name, company, or email..." className="pl-10" />
                </div>
                <Button variant="outline">Filter</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Leads ({leads?.length || 0})</CardTitle>
            <CardDescription>Manage and track your lead database</CardDescription>
          </CardHeader>
          <CardContent>
            {leads && leads.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {lead.first_name && lead.last_name
                                ? `${lead.first_name} ${lead.last_name}`
                                : lead.contact_name || "Unknown"}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {lead.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  <span>{lead.email}</span>
                                </div>
                              )}
                              {lead.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{lead.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {lead.company_name || lead.company || "Unknown"}
                            </div>
                            {lead.industry && <div className="text-sm text-muted-foreground">{lead.industry}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{lead.title || lead.position || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(lead.status || "new")} variant="secondary">
                            {lead.status || "New"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">{lead.source || "Manual"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {new Date(lead.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <LeadRowActions leadId={lead.id} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No leads yet</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by adding your first lead or importing from CSV
                </p>
                <div className="flex justify-center gap-2">
                  <Button asChild>
                    <Link href="/dashboard/leads/add">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Lead
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard/leads/import">
                      <Upload className="mr-2 h-4 w-4" />
                      Import CSV
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

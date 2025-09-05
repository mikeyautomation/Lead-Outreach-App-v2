import { notFound } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Mail, Phone, Building, MapPin, Globe, Linkedin } from "lucide-react"
import Link from "next/link"

interface Lead {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  company_name: string | null
  title: string | null
  linkedin_url: string | null
  company_website: string | null
  industry: string | null
  company_size: string | null
  location: string | null
  notes: string | null
  status: string
  source: string | null
  created_at: string
  updated_at: string
}

async function getLeadDetails(leadId: string): Promise<Lead | null> {
  const supabase = createServerClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .eq("user_id", user.id)
    .single()

  if (error || !lead) {
    return null
  }

  return lead
}

export default async function LeadDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lead = await getLeadDetails(id)

  if (!lead) {
    notFound()
  }

  const displayName =
    lead.first_name && lead.last_name
      ? `${lead.first_name} ${lead.last_name}`
      : lead.first_name || lead.last_name || "Unknown Contact"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/leads">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-muted-foreground">Lead Details</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{lead.email || "No email provided"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{lead.phone || "No phone provided"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span>{lead.title || "No title provided"}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{lead.location || "No location provided"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span>{lead.company_name || "No company provided"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              {lead.company_website ? (
                <a
                  href={lead.company_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {lead.company_website}
                </a>
              ) : (
                <span>No website provided</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Linkedin className="h-4 w-4 text-muted-foreground" />
              {lead.linkedin_url ? (
                <a
                  href={lead.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  LinkedIn Profile
                </a>
              ) : (
                <span>No LinkedIn provided</span>
              )}
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Industry: </span>
              <span>{lead.industry || "Not specified"}</span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Company Size: </span>
              <span>{lead.company_size || "Not specified"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Lead Status & Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Status: </span>
                <Badge
                  variant={lead.status === "new" ? "default" : lead.status === "contacted" ? "secondary" : "outline"}
                >
                  {lead.status}
                </Badge>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Source: </span>
                <Badge variant="outline">{lead.source || "Unknown"}</Badge>
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Notes: </span>
              <p className="mt-1 text-sm">{lead.notes || "No notes available"}</p>
            </div>
            <div className="text-xs text-muted-foreground">
              <p>Created: {new Date(lead.created_at).toLocaleDateString()}</p>
              <p>Updated: {new Date(lead.updated_at).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

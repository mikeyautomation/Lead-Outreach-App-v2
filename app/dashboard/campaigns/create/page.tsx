"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save, Users } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  company_name: string
  title: string
  status: string
}

export default function CreateCampaignPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    email_content: "",
  })

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: leadsData } = await supabase
        .from("leads")
        .select("id, first_name, last_name, email, company_name, title, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (leadsData) {
        setLeads(leadsData)
      }
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleLeadSelection = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads((prev) => [...prev, leadId])
    } else {
      setSelectedLeads((prev) => prev.filter((id) => id !== leadId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(leads.map((lead) => lead.id))
    } else {
      setSelectedLeads([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (selectedLeads.length === 0) {
      setError("Please select at least one lead for the campaign")
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Not authenticated")
      }

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          ...formData,
          user_id: user.id,
          status: "draft",
          total_leads: selectedLeads.length,
          sent_count: 0,
          opened_count: 0,
          replied_count: 0,
        })
        .select()
        .single()

      if (campaignError) throw campaignError

      // Create campaign_leads relationships
      const campaignLeads = selectedLeads.map((leadId) => ({
        campaign_id: campaign.id,
        lead_id: leadId,
        status: "pending",
      }))

      const { error: campaignLeadsError } = await supabase.from("campaign_leads").insert(campaignLeads)

      if (campaignLeadsError) throw campaignLeadsError

      router.push("/dashboard/campaigns")
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const defaultEmailTemplate = `Hi {{first_name}},

I hope this email finds you well. I came across {{company_name}} and was impressed by your work in the industry.

I'd love to connect and discuss how we might be able to help {{company_name}} achieve its goals.

Would you be open to a brief 15-minute call this week?

Best regards,
[Your Name]`

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
              <h1 className="text-2xl font-bold">Create Campaign</h1>
              <p className="text-sm text-muted-foreground">Set up a new email outreach campaign</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Campaign Details */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
                <CardDescription>Basic information about your campaign</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Q1 2024 Outreach"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange("subject", e.target.value)}
                    placeholder="Quick question about {{company_name}}"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_content">Email Content *</Label>
                  <Textarea
                    id="email_content"
                    value={formData.email_content || defaultEmailTemplate}
                    onChange={(e) => handleInputChange("email_content", e.target.value)}
                    placeholder="Write your email content here..."
                    rows={12}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Use variables like {`{{first_name}}`}, {`{{last_name}}`}, {`{{company_name}}`} for personalization
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Lead Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Leads ({selectedLeads.length} selected)</CardTitle>
                <CardDescription>Choose which leads to include in this campaign</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedLeads.length === leads.length && leads.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all" className="text-sm font-medium">
                      Select All ({leads.length} leads)
                    </Label>
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-2 border rounded-md p-4">
                    {leads.length > 0 ? (
                      leads.map((lead) => (
                        <div key={lead.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md">
                          <Checkbox
                            id={lead.id}
                            checked={selectedLeads.includes(lead.id)}
                            onCheckedChange={(checked) => handleLeadSelection(lead.id, checked as boolean)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {lead.first_name} {lead.last_name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {lead.status || "new"}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {lead.email} • {lead.company_name}
                            </div>
                            {lead.title && <div className="text-xs text-muted-foreground">{lead.title}</div>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No leads available</p>
                        <Button asChild variant="link" className="mt-2">
                          <Link href="/dashboard/leads/add">Add leads first</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {error && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading || selectedLeads.length === 0} className="flex-1">
              {isLoading ? (
                "Creating..."
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Campaign
                </>
              )}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/campaigns">Cancel</Link>
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}

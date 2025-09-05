"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createBrowserClient } from "@/lib/supabase/client"
import { ArrowLeft } from "lucide-react"

interface Campaign {
  id: string
  name: string
  subject: string
  email_content: string
  status: string
}

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  company: string
}

interface CampaignEditFormProps {
  campaign: Campaign
  leads: Lead[]
}

export function CampaignEditForm({ campaign, leads }: CampaignEditFormProps) {
  const [formData, setFormData] = useState({
    name: campaign.name,
    subject: campaign.subject,
    email_content: campaign.email_content,
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createBrowserClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from("campaigns")
        .update({
          name: formData.name,
          subject: formData.subject,
          email_content: formData.email_content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id)

      if (error) throw error

      router.push(`/dashboard/campaigns/${campaign.id}`)
    } catch (error) {
      console.error("Error updating campaign:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Edit Campaign</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="content">Email Content</Label>
              <Textarea
                id="content"
                rows={10}
                value={formData.email_content}
                onChange={(e) => setFormData({ ...formData, email_content: e.target.value })}
                placeholder="Use {{first_name}}, {{last_name}}, {{company}} for personalization"
                required
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Campaign"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

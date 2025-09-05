interface SmartLeadLead {
  email: string
  first_name?: string
  last_name?: string
  company_name?: string
  phone?: string
  website?: string
  custom_fields?: Record<string, any>
}

interface SmartLeadCampaign {
  name: string
  email_accounts: string[]
  schedule: {
    timezone: string
    days_of_week: number[]
    start_time: string
    end_time: string
    min_gap: number
    max_gap: number
  }
  settings: {
    daily_limit: number
    track_opens: boolean
    track_clicks: boolean
  }
  sequences: Array<{
    position: number
    subject: string
    message: string
    wait_days: number
  }>
}

class SmartLeadService {
  private static baseUrl = "https://server.smartlead.ai/api/v1"

  private static async makeRequest(endpoint: string, options: RequestInit = {}) {
    const apiKey = process.env.SMARTLEAD_API_KEY

    if (!apiKey) {
      throw new Error("SMARTLEAD_API_KEY environment variable is not set")
    }

    const url = `${this.baseUrl}${endpoint}${endpoint.includes("?") ? "&" : "?"}api_key=${apiKey}`

    console.log("[v0] Making SmartLead API request to:", endpoint)

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      })

      console.log("[v0] SmartLead API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] SmartLead API error response:", errorText)
        throw new Error(`SmartLead API Error: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log("[v0] SmartLead API success response:", result)
      return result
    } catch (error) {
      console.error("[v0] SmartLead API request failed:", error)
      throw error
    }
  }

  static async createCampaign(campaignData: {
    name: string
    subject: string
    email_content: string
    email_accounts?: string[]
  }) {
    console.log("[v0] Creating SmartLead campaign:", campaignData.name)

    const smartLeadCampaign: SmartLeadCampaign = {
      name: campaignData.name,
      email_accounts: campaignData.email_accounts || [process.env.SMTP_EMAIL || "default@example.com"],
      schedule: {
        timezone: "UTC",
        days_of_week: [1, 2, 3, 4, 5], // Monday to Friday
        start_time: "09:00",
        end_time: "17:00",
        min_gap: 2, // 2 minutes between emails
        max_gap: 5, // 5 minutes between emails
      },
      settings: {
        daily_limit: 50,
        track_opens: true,
        track_clicks: true,
      },
      sequences: [
        {
          position: 1,
          subject: campaignData.subject,
          message: campaignData.email_content,
          wait_days: 0,
        },
      ],
    }

    try {
      const result = await this.makeRequest("/campaigns", {
        method: "POST",
        body: JSON.stringify(smartLeadCampaign),
      })

      console.log("[v0] SmartLead campaign created:", result)
      return result
    } catch (error) {
      console.error("[v0] Error creating SmartLead campaign:", error)
      throw error
    }
  }

  static async addLeadsToSmartLeadCampaign(smartLeadCampaignId: string, leads: SmartLeadLead[]) {
    console.log("[v0] Adding leads to SmartLead campaign:", smartLeadCampaignId, leads.length)

    try {
      const result = await this.makeRequest(`/campaigns/${smartLeadCampaignId}/leads`, {
        method: "POST",
        body: JSON.stringify({ leads }),
      })

      console.log("[v0] Leads added to SmartLead campaign:", result)
      return result
    } catch (error) {
      console.error("[v0] Error adding leads to SmartLead campaign:", error)
      throw error
    }
  }

  static async startSmartLeadCampaign(smartLeadCampaignId: string) {
    console.log("[v0] Starting SmartLead campaign:", smartLeadCampaignId)

    try {
      const result = await this.makeRequest(`/campaigns/${smartLeadCampaignId}/status`, {
        method: "POST",
        body: JSON.stringify({ status: "START" }),
      })

      console.log("[v0] SmartLead campaign started:", result)
      return result
    } catch (error) {
      console.error("[v0] Error starting SmartLead campaign:", error)
      throw error
    }
  }

  static async replyToLead(campaignId: string, leadId: string, message: string) {
    console.log("[v0] Replying to lead via SmartLead:", campaignId, leadId)

    try {
      const result = await this.makeRequest(`/email-campaigns/${campaignId}/leads/${leadId}/reply`, {
        method: "POST",
        body: JSON.stringify({ message }),
      })

      console.log("[v0] Reply sent via SmartLead:", result)
      return result
    } catch (error) {
      console.error("[v0] Error sending reply via SmartLead:", error)
      throw error
    }
  }

  static personalizeContent(content: string, lead: any): string {
    let personalizedContent = content

    // Replace template variables with lead data
    const replacements = {
      "{{first_name}}": lead.first_name || lead.contact_name?.split(" ")[0] || "there",
      "{{last_name}}": lead.last_name || lead.contact_name?.split(" ").slice(1).join(" ") || "",
      "{{full_name}}": lead.contact_name || `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "there",
      "{{company}}": lead.company_name || lead.company || "your company",
      "{{company_name}}": lead.company_name || lead.company || "your company",
      "{{email}}": lead.email || "",
      "{{phone}}": lead.phone || "",
      "{{title}}": lead.title || lead.position || "",
      "{{position}}": lead.title || lead.position || "",
      "{{website}}": lead.company_website || "",
      "{{industry}}": lead.industry || "",
      "{{location}}": lead.location || "",
    }

    for (const [placeholder, value] of Object.entries(replacements)) {
      personalizedContent = personalizedContent.replace(new RegExp(placeholder, "g"), value)
    }

    return personalizedContent
  }
}

export { SmartLeadService }
export const { createCampaign, addLeadsToSmartLeadCampaign, startSmartLeadCampaign, replyToLead, personalizeContent } =
  SmartLeadService

// Email service for sending campaigns
// In production, this would integrate with Gmail API or other email providers

interface EmailTemplate {
  subject: string
  content: string
}

interface Lead {
  id: string
  first_name: string
  last_name: string
  email: string
  company_name: string
  title?: string
  [key: string]: any
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export class EmailService {
  // Simulate email sending with different providers/accounts
  private static emailAccounts = [
    { id: "account1", email: "sender1@company.com", active: true },
    { id: "account2", email: "sender2@company.com", active: true },
    { id: "account3", email: "sender3@company.com", active: true },
  ]

  private static currentAccountIndex = 0

  // Rotate between email accounts for better deliverability
  private static getNextAccount() {
    const account = this.emailAccounts[this.currentAccountIndex]
    this.currentAccountIndex = (this.currentAccountIndex + 1) % this.emailAccounts.length
    return account
  }

  // Process template variables like {{first_name}}, {{company_name}}
  static processTemplate(template: string, lead: Lead): string {
    let processed = template

    // Replace common variables
    const variables = {
      first_name: lead.first_name || "",
      last_name: lead.last_name || "",
      full_name: `${lead.first_name || ""} ${lead.last_name || ""}`.trim(),
      email: lead.email || "",
      company_name: lead.company_name || lead.company || "",
      title: lead.title || lead.position || "",
      company: lead.company_name || lead.company || "",
      position: lead.title || lead.position || "",
    }

    // Replace all template variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi")
      processed = processed.replace(regex, value)
    })

    return processed
  }

  // Simulate sending an email
  static async sendEmail(to: string, subject: string, content: string, campaignId?: string): Promise<EmailResult> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))

    // Simulate occasional failures (5% failure rate)
    if (Math.random() < 0.05) {
      return {
        success: false,
        error: "Failed to send email: SMTP connection timeout",
      }
    }

    const account = this.getNextAccount()
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    console.log(`[v0] Email sent via ${account.email} to ${to}`)
    console.log(`[v0] Subject: ${subject}`)
    console.log(`[v0] Message ID: ${messageId}`)

    return {
      success: true,
      messageId,
    }
  }

  // Send a batch of emails with rate limiting
  static async sendBatch(
    emails: Array<{
      to: string
      subject: string
      content: string
      leadId: string
      campaignId: string
    }>,
    onProgress?: (sent: number, total: number) => void,
  ): Promise<Array<{ leadId: string; result: EmailResult }>> {
    const results: Array<{ leadId: string; result: EmailResult }> = []

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i]

      try {
        const result = await this.sendEmail(email.to, email.subject, email.content, email.campaignId)

        results.push({
          leadId: email.leadId,
          result,
        })

        // Rate limiting: wait between emails (2-5 seconds)
        if (i < emails.length - 1) {
          const delay = 2000 + Math.random() * 3000
          await new Promise((resolve) => setTimeout(resolve, delay))
        }

        // Report progress
        if (onProgress) {
          onProgress(i + 1, emails.length)
        }
      } catch (error) {
        results.push({
          leadId: email.leadId,
          result: {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        })
      }
    }

    return results
  }

  // Validate email address
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Generate tracking pixel URL
  static generateTrackingPixel(campaignId: string, leadId: string): string {
    return `/api/track/open?campaign=${campaignId}&lead=${leadId}&t=${Date.now()}`
  }

  // Generate tracked links
  static generateTrackedLink(originalUrl: string, campaignId: string, leadId: string): string {
    const trackingId = `${campaignId}_${leadId}_${Date.now()}`
    return `/api/track/click?id=${trackingId}&url=${encodeURIComponent(originalUrl)}`
  }

  // Add tracking to email content
  static addTracking(content: string, campaignId: string, leadId: string): string {
    let trackedContent = content

    // Add tracking pixel at the end
    const trackingPixel = `<img src="${this.generateTrackingPixel(campaignId, leadId)}" width="1" height="1" style="display:none;" />`
    trackedContent += `\n\n${trackingPixel}`

    // Convert URLs to tracked links
    const urlRegex = /(https?:\/\/[^\s<>"]+)/gi
    trackedContent = trackedContent.replace(urlRegex, (url) => {
      const trackedUrl = this.generateTrackedLink(url, campaignId, leadId)
      return `<a href="${trackedUrl}" target="_blank">${url}</a>`
    })

    return trackedContent
  }
}

import nodemailer from "nodemailer"

export function personalizeContent(content: string, lead: any): string {
  if (!content || !lead) return content

  let personalizedContent = content

  // Replace common template variables
  const replacements = {
    "{{first_name}}": lead.first_name || lead.contact_name?.split(" ")[0] || "",
    "{{last_name}}": lead.last_name || lead.contact_name?.split(" ").slice(1).join(" ") || "",
    "{{full_name}}": lead.contact_name || `${lead.first_name || ""} ${lead.last_name || ""}`.trim(),
    "{{company}}": lead.company_name || lead.company || "",
    "{{title}}": lead.title || lead.position || "",
    "{{position}}": lead.position || lead.title || "",
    "{{email}}": lead.email || "",
    "{{phone}}": lead.phone || "",
    "{{industry}}": lead.industry || "",
    "{{location}}": lead.location || "",
    "{{company_website}}": lead.company_website || "",
    "{{linkedin_url}}": lead.linkedin_url || "",
  }

  // Replace all template variables
  Object.entries(replacements).forEach(([placeholder, value]) => {
    personalizedContent = personalizedContent.replace(new RegExp(placeholder, "g"), value || "")
  })

  console.log(`[v0] Personalized content for ${lead.email}: ${Object.keys(replacements).length} variables processed`)

  return personalizedContent
}

export function addTrackingPixel(htmlContent: string, trackingId: string): string {
  if (!htmlContent || !trackingId) return htmlContent

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://v0-leadscraperapp.vercel.app"
  const trackingPixelUrl = `${siteUrl}/api/track/open?id=${encodeURIComponent(trackingId)}`

  // Create tracking pixel HTML
  const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`

  // Try to insert before closing body tag, otherwise append to end
  if (htmlContent.includes("</body>")) {
    return htmlContent.replace("</body>", `${trackingPixel}</body>`)
  } else {
    return htmlContent + trackingPixel
  }
}

export async function sendEmail({
  to,
  subject,
  html,
  trackingId,
  lead,
}: {
  to: string
  subject: string
  html: string
  trackingId: string
  lead: any
}) {
  try {
    console.log(`[v0] SMTP Service: Attempting to send email to ${to}`)
    console.log(`[v0] SMTP Config: Using ${process.env.SMTP_EMAIL ? "environment" : "hardcoded"} credentials`)

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_EMAIL || "vanllanes1@gmail.com",
        pass: process.env.SMTP_PASSWORD || "hfku qhur oach vjqj",
      },
    })

    await transporter.verify()
    console.log(`[v0] SMTP connection verified successfully`)

    // Personalize the email content
    const personalizedHtml = personalizeContent(html, lead)

    // Add tracking pixel to the email content
    const finalHtml = addTrackingPixel(personalizedHtml, trackingId)

    const mailOptions = {
      from: process.env.SMTP_EMAIL || "vanllanes1@gmail.com",
      to,
      subject,
      html: finalHtml,
    }

    console.log(`[v0] Sending email with options:`, {
      to: mailOptions.to,
      subject: mailOptions.subject,
      from: mailOptions.from,
    })

    const result = await transporter.sendMail(mailOptions)

    console.log(`[v0] Email sent successfully:`, result.messageId)

    return {
      success: true,
      messageId: result.messageId,
      response: result.response,
    }
  } catch (error) {
    console.error(`[v0] SMTP Error:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

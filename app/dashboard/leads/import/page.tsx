"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload, FileText, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ImportLeadsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [showMapping, setShowMapping] = useState(false)
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
        setError("Please select a CSV file")
        return
      }
      setFile(selectedFile)
      setError(null)
    }
  }

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim())
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""))
    const data = []

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""))
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ""
        })
        data.push(row)
      }
    }

    return { headers, data }
  }

  const mapCSVToLead = (csvRow: any) => {
    const getFieldValue = (fieldName: string) => {
      const mappedColumn = columnMapping[fieldName]
      if (mappedColumn && csvRow[mappedColumn]) {
        return csvRow[mappedColumn]
      }

      // Fallback to automatic detection
      const autoMappings: Record<string, string[]> = {
        first_name: ["first_name", "firstname", "fname", "first"],
        last_name: ["last_name", "lastname", "lname", "last"],
        email: ["email", "email_address", "e_mail"],
        phone: ["phone", "phone_number", "telephone", "mobile"],
        company_name: ["company_name", "company", "name", "business_name", "organization"],
        title: ["title", "job_title", "position", "role"],
        industry: ["industry", "sector", "business_type"],
        company_size: ["company_size", "size", "employees", "team_size"],
        location: ["location", "city", "address", "region"],
        linkedin_url: ["linkedin_url", "linkedin", "linkedin_profile"],
        company_website: ["company_website", "website", "url", "web"],
      }

      const possibleColumns = autoMappings[fieldName] || []
      for (const col of possibleColumns) {
        if (csvRow[col]) return csvRow[col]
      }

      return ""
    }

    return {
      first_name: getFieldValue("first_name"),
      last_name: getFieldValue("last_name"),
      email: getFieldValue("email"),
      phone: getFieldValue("phone"),
      company_name: getFieldValue("company_name"),
      title: getFieldValue("title"),
      industry: getFieldValue("industry"),
      company_size: getFieldValue("company_size"),
      location: getFieldValue("location"),
      linkedin_url: getFieldValue("linkedin_url"),
      company_website: getFieldValue("company_website"),
      source: "csv_import",
      notes: `Imported from CSV. Additional data: ${Object.entries(csvRow)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")}`,
      status: "new",
      contact_name: "",
      company: "",
      position: "",
    }
  }

  const handleFilePreview = async () => {
    if (!file) return

    try {
      const text = await file.text()
      const { headers } = parseCSV(text)
      setCsvHeaders(headers)
      setShowMapping(true)
      setError(null)
    } catch (error) {
      setError("Error reading CSV file")
    }
  }

  const handleImport = async () => {
    if (!file) {
      setError("Please select a file")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Not authenticated")
      }

      const text = await file.text()
      const { data: csvData } = parseCSV(text)

      if (csvData.length === 0) {
        throw new Error("No data found in CSV file")
      }

      const leads = csvData.map((row) => {
        const lead = mapCSVToLead(row)
        return {
          ...lead,
          user_id: user.id,
          contact_name: `${lead.first_name} ${lead.last_name}`.trim() || "Unknown",
          company: lead.company_name || "Unknown",
          position: lead.title,
        }
      })

      console.log("[v0] Attempting to import", leads.length, "leads")

      // Filter out leads without email addresses to avoid conflicts
      const validLeads = leads.filter((lead) => lead.email && lead.email.trim() !== "")
      const invalidLeads = leads.filter((lead) => !lead.email || lead.email.trim() === "")

      console.log("[v0] Valid leads with email:", validLeads.length)
      console.log("[v0] Invalid leads without email:", invalidLeads.length)

      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      // Process leads in smaller batches to avoid conflicts
      const batchSize = 10
      for (let i = 0; i < validLeads.length; i += batchSize) {
        const batch = validLeads.slice(i, i + batchSize)

        try {
          // Use upsert with email as the conflict resolution key
          const { error: upsertError, count } = await supabase
            .from("leads")
            .upsert(batch, {
              onConflict: "email,user_id",
              ignoreDuplicates: false,
            })
            .select("id", { count: "exact" })

          if (upsertError) {
            console.log("[v0] Batch upsert error:", upsertError)
            // Try individual inserts for this batch
            for (const lead of batch) {
              try {
                const { error: individualError } = await supabase.from("leads").upsert([lead], {
                  onConflict: "email,user_id",
                  ignoreDuplicates: false,
                })

                if (individualError) {
                  console.log("[v0] Individual lead error:", individualError, "for lead:", lead.email)
                  errorCount++
                  errors.push(`${lead.email}: ${individualError.message}`)
                } else {
                  successCount++
                }
              } catch (err) {
                console.log("[v0] Individual lead exception:", err)
                errorCount++
                errors.push(`${lead.email}: ${err instanceof Error ? err.message : "Unknown error"}`)
              }
            }
          } else {
            successCount += batch.length
            console.log("[v0] Batch successful, processed", batch.length, "leads")
          }
        } catch (batchError) {
          console.log("[v0] Batch exception:", batchError)
          errorCount += batch.length
          errors.push(`Batch error: ${batchError instanceof Error ? batchError.message : "Unknown error"}`)
        }
      }

      // Handle leads without email addresses separately
      if (invalidLeads.length > 0) {
        try {
          const { error: invalidError } = await supabase.from("leads").insert(invalidLeads)
          if (invalidError) {
            console.log("[v0] Invalid leads error:", invalidError)
            errors.push(`${invalidLeads.length} leads without email: ${invalidError.message}`)
            errorCount += invalidLeads.length
          } else {
            successCount += invalidLeads.length
          }
        } catch (err) {
          console.log("[v0] Invalid leads exception:", err)
          errorCount += invalidLeads.length
          errors.push(`Leads without email: ${err instanceof Error ? err.message : "Unknown error"}`)
        }
      }

      if (successCount > 0) {
        let message = `Successfully imported ${successCount} leads`
        if (errorCount > 0) {
          message += ` (${errorCount} failed)`
        }
        setSuccess(message)

        if (errorCount === 0) {
          setTimeout(() => {
            router.push("/dashboard/leads")
          }, 2000)
        }
      }

      if (errorCount > 0 && successCount === 0) {
        throw new Error(
          `Failed to import leads. Errors: ${errors.slice(0, 3).join("; ")}${errors.length > 3 ? "..." : ""}`,
        )
      } else if (errorCount > 0) {
        setError(`Some leads failed to import: ${errors.slice(0, 2).join("; ")}${errors.length > 2 ? "..." : ""}`)
      }
    } catch (error: unknown) {
      console.log("[v0] Import error:", error)
      setError(error instanceof Error ? error.message : "An error occurred during import")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/leads">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Leads
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Import Leads</h1>
              <p className="text-sm text-muted-foreground">Import leads from a CSV file</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CSV File Upload</CardTitle>
              <CardDescription>Upload a CSV file containing your lead data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv-file">Select CSV File</Label>
                <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
              </div>

              {file && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}

              {file && !showMapping && (
                <Button onClick={handleFilePreview} variant="outline" className="w-full bg-transparent">
                  Preview & Map Columns
                </Button>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription className="text-green-600">{success}</AlertDescription>
                </Alert>
              )}

              {showMapping && (
                <Card>
                  <CardHeader>
                    <CardTitle>Map CSV Columns</CardTitle>
                    <CardDescription>
                      Map your CSV columns to the lead fields. Leave blank to skip a field.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { field: "first_name", label: "First Name" },
                        { field: "last_name", label: "Last Name" },
                        { field: "email", label: "Email" },
                        { field: "phone", label: "Phone" },
                        { field: "company_name", label: "Company Name" },
                        { field: "title", label: "Job Title" },
                        { field: "industry", label: "Industry" },
                        { field: "location", label: "Location" },
                      ].map(({ field, label }) => (
                        <div key={field} className="space-y-2">
                          <Label>{label}</Label>
                          <select
                            className="w-full p-2 border rounded-md"
                            value={columnMapping[field] || ""}
                            onChange={(e) =>
                              setColumnMapping((prev) => ({
                                ...prev,
                                [field]: e.target.value,
                              }))
                            }
                          >
                            <option value="">-- Select Column --</option>
                            {csvHeaders.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button onClick={handleImport} disabled={!file || isLoading} className="w-full">
                {isLoading ? (
                  "Importing..."
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Leads
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>CSV Format Requirements</CardTitle>
              <CardDescription>Your CSV file should include the following columns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Required Columns:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• first_name</li>
                    <li>• last_name</li>
                    <li>• email</li>
                    <li>• company_name</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Optional Columns:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• phone</li>
                    <li>• title (job title)</li>
                    <li>• industry</li>
                    <li>• company_size</li>
                    <li>• location</li>
                    <li>• linkedin_url</li>
                    <li>• company_website</li>
                    <li>• source</li>
                    <li>• notes</li>
                    <li>• status (new, contacted, qualified, unqualified)</li>
                  </ul>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Make sure your CSV file has headers in the first row and uses comma separators.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

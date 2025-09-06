"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
      const text = await file.text()
      const { data: csvData } = parseCSV(text)

      if (csvData.length === 0) {
        throw new Error("No data found in CSV file")
      }

      const leads = csvData.map((row) => {
        const lead = mapCSVToLead(row)
        return {
          ...lead,
          contact_name: `${lead.first_name} ${lead.last_name}`.trim() || "Unknown",
          company: lead.company_name || "Unknown",
          position: lead.title,
        }
      })

      console.log("[v0] Attempting to import", leads.length, "leads")

      const response = await fetch("/api/leads/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leads }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Import failed")
      }

      if (result.successCount > 0) {
        let message = `Successfully imported ${result.successCount} leads`
        if (result.errorCount > 0) {
          message += ` (${result.errorCount} failed)`
        }
        setSuccess(message)

        if (result.errorCount === 0) {
          setTimeout(() => {
            router.push("/dashboard/leads")
          }, 2000)
        }
      }

      if (result.errorCount > 0 && result.successCount === 0) {
        throw new Error(
          `Failed to import leads. First few errors: ${result.errors?.slice(0, 3).join("; ")}${result.errors?.length > 3 ? "..." : ""}`,
        )
      } else if (result.errorCount > 0) {
        setError(
          `Some leads failed to import: ${result.errors?.slice(0, 2).join("; ")}${result.errors?.length > 2 ? "..." : ""}`,
        )
      }
    } catch (error: unknown) {
      console.log("[v0] Import error:", error)
      const errorMessage = error instanceof Error ? error.message : "An error occurred during import"

      if (errorMessage.includes("constraint") || errorMessage.includes("unique")) {
        setError("Some leads have duplicate email addresses. Please check your CSV file and try again.")
      } else if (errorMessage.includes("permission") || errorMessage.includes("policy")) {
        setError("Permission denied. Please check your account permissions.")
      } else {
        setError(errorMessage)
      }
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

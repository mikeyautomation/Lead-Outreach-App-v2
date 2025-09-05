// Fetch and analyze the CSV file to understand its structure
const csvUrl =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/lead%20samples-lIGyoyYWVWFDuPm41Ptez0ePTdYBXt.csv"

async function analyzeCsv() {
  try {
    console.log("[v0] Fetching CSV file...")
    const response = await fetch(csvUrl)
    const csvText = await response.text()

    console.log("[v0] CSV Content:")
    console.log(csvText)

    // Parse CSV manually to see structure
    const lines = csvText.trim().split("\n")
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))

    console.log("[v0] CSV Headers:", headers)
    console.log("[v0] Number of rows:", lines.length - 1)

    // Show first few rows
    console.log("[v0] Sample rows:")
    for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
      const row = lines[i].split(",").map((cell) => cell.trim().replace(/"/g, ""))
      console.log(`Row ${i}:`, row)
    }
  } catch (error) {
    console.error("[v0] Error analyzing CSV:", error)
  }
}

analyzeCsv()

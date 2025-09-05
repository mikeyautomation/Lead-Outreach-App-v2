"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface CampaignPerformanceChartProps {
  data: Array<{
    name: string
    sent: number
    opened: number
    replied: number
    openRate: string
    replyRate: string
  }>
}

export function CampaignPerformanceChart({ data }: CampaignPerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">No campaign data available</div>
    )
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value, name) => [value, name === "sent" ? "Sent" : name === "opened" ? "Opened" : "Replied"]}
            labelFormatter={(label) => `Campaign: ${label}`}
          />
          <Legend />
          <Bar dataKey="sent" fill="hsl(var(--chart-1))" name="Sent" />
          <Bar dataKey="opened" fill="hsl(var(--chart-2))" name="Opened" />
          <Bar dataKey="replied" fill="hsl(var(--chart-3))" name="Replied" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

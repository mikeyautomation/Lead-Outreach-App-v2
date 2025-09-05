"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface EmailMetricsChartProps {
  campaigns: Array<{
    id: string
    name: string
    created_at: string
    sent_count: number
    opened_count: number
    replied_count: number
  }>
}

export function EmailMetricsChart({ campaigns }: EmailMetricsChartProps) {
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No email metrics data available
      </div>
    )
  }

  // Group campaigns by month and calculate cumulative metrics
  const monthlyData = campaigns.reduce((acc: any[], campaign) => {
    const date = new Date(campaign.created_at)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

    const existing = acc.find((item) => item.month === monthKey)
    if (existing) {
      existing.sent += campaign.sent_count || 0
      existing.opened += campaign.opened_count || 0
      existing.replied += campaign.replied_count || 0
    } else {
      acc.push({
        month: monthKey,
        sent: campaign.sent_count || 0,
        opened: campaign.opened_count || 0,
        replied: campaign.replied_count || 0,
      })
    }
    return acc
  }, [])

  // Sort by month and calculate rates
  const chartData = monthlyData
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((item) => ({
      ...item,
      openRate: item.sent > 0 ? ((item.opened / item.sent) * 100).toFixed(1) : 0,
      replyRate: item.sent > 0 ? ((item.replied / item.sent) * 100).toFixed(1) : 0,
    }))

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value, name) => [
              name === "openRate" || name === "replyRate" ? `${value}%` : value,
              name === "sent"
                ? "Emails Sent"
                : name === "openRate"
                  ? "Open Rate"
                  : name === "replyRate"
                    ? "Reply Rate"
                    : name,
            ]}
            labelFormatter={(label) => `Month: ${label}`}
          />
          <Legend />
          <Line type="monotone" dataKey="sent" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Emails Sent" />
          <Line type="monotone" dataKey="openRate" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Open Rate (%)" />
          <Line
            type="monotone"
            dataKey="replyRate"
            stroke="hsl(var(--chart-3))"
            strokeWidth={2}
            name="Reply Rate (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

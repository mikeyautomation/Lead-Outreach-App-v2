"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface ResponseRateChartProps {
  data: Array<{
    name: string
    sent: number
    opened: number
    replied: number
    openRate: string
    replyRate: string
  }>
}

export function ResponseRateChart({ data }: ResponseRateChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No response rate data available
      </div>
    )
  }

  const chartData = data.map((item) => ({
    name: item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name,
    openRate: Number(item.openRate),
    replyRate: Number(item.replyRate),
  }))

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
          <YAxis tick={{ fontSize: 12 }} label={{ value: "Rate (%)", angle: -90, position: "insideLeft" }} />
          <Tooltip
            formatter={(value, name) => [`${value}%`, name === "openRate" ? "Open Rate" : "Reply Rate"]}
            labelFormatter={(label) => `Campaign: ${label}`}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="openRate"
            stackId="1"
            stroke="hsl(var(--chart-2))"
            fill="hsl(var(--chart-2))"
            fillOpacity={0.6}
            name="Open Rate"
          />
          <Area
            type="monotone"
            dataKey="replyRate"
            stackId="2"
            stroke="hsl(var(--chart-3))"
            fill="hsl(var(--chart-3))"
            fillOpacity={0.6}
            name="Reply Rate"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

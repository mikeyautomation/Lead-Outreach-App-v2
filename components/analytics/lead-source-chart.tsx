"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"

interface LeadSourceChartProps {
  data: Array<{
    source: string
    count: number
  }>
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export function LeadSourceChart({ data }: LeadSourceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No lead source data available
      </div>
    )
  }

  const total = data.reduce((sum, item) => sum + item.count, 0)

  const chartData = data.map((item) => ({
    ...item,
    percentage: ((item.count / total) * 100).toFixed(1),
  }))

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ source, percentage }) => `${source} (${percentage}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [`${value} leads`, "Count"]}
            labelFormatter={(label) => `Source: ${label}`}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

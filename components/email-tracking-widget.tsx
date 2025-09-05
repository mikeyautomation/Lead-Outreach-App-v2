"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, MousePointer, Reply, Mail } from "lucide-react"

interface EmailTrackingWidgetProps {
  campaignId: string
  refreshInterval?: number
}

interface TrackingStats {
  totalSent: number
  totalOpened: number
  totalClicked: number
  totalReplied: number
  openRate: string
  clickRate: string
  replyRate: string
}

export function EmailTrackingWidget({ campaignId, refreshInterval = 30000 }: EmailTrackingWidgetProps) {
  const [stats, setStats] = useState<TrackingStats>({
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalReplied: 0,
    openRate: "0",
    clickRate: "0",
    replyRate: "0",
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching tracking stats:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()

    // Set up polling for real-time updates
    const interval = setInterval(fetchStats, refreshInterval)

    return () => clearInterval(interval)
  }, [campaignId, refreshInterval])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Tracking</CardTitle>
          <CardDescription>Loading tracking data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-time Tracking</CardTitle>
        <CardDescription>Live email engagement metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Sent</div>
              <div className="text-lg font-bold">{stats.totalSent}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-green-600" />
            <div>
              <div className="text-sm font-medium">Opened</div>
              <div className="text-lg font-bold text-green-600">
                {stats.totalOpened} ({stats.openRate}%)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MousePointer className="h-4 w-4 text-blue-600" />
            <div>
              <div className="text-sm font-medium">Clicked</div>
              <div className="text-lg font-bold text-blue-600">
                {stats.totalClicked} ({stats.clickRate}%)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Reply className="h-4 w-4 text-purple-600" />
            <div>
              <div className="text-sm font-medium">Replied</div>
              <div className="text-lg font-bold text-purple-600">
                {stats.totalReplied} ({stats.replyRate}%)
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
            <Badge variant="outline" className="text-xs">
              Live
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

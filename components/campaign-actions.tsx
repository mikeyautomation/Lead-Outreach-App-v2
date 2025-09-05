"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface CampaignActionsProps {
  campaignId: string
  status: string
  totalLeads: number
}

export function CampaignActions({ campaignId, status, totalLeads }: CampaignActionsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleStartCampaign = async () => {
    if (totalLeads === 0) {
      toast({
        title: "Cannot start campaign",
        description: "No leads selected for this campaign",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Campaign started",
          description: `Sending emails to ${data.totalEmails} leads`,
        })
        router.refresh()
      } else {
        throw new Error(data.error || "Failed to start campaign")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start campaign",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePauseCampaign = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/pause`, {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Campaign paused",
          description: "Campaign has been paused successfully",
        })
        router.refresh()
      } else {
        throw new Error(data.error || "Failed to pause campaign")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to pause campaign",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (status === "draft" || status === "paused") {
    return (
      <Button onClick={handleStartCampaign} disabled={isLoading} size="sm">
        <Play className="h-4 w-4 mr-2" />
        {isLoading ? "Starting..." : status === "paused" ? "Resume" : "Start Campaign"}
      </Button>
    )
  }

  if (status === "active") {
    return (
      <Button onClick={handlePauseCampaign} disabled={isLoading} variant="outline" size="sm">
        <Pause className="h-4 w-4 mr-2" />
        {isLoading ? "Pausing..." : "Pause"}
      </Button>
    )
  }

  return null
}

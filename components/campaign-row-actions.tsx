"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Play, Pause, Edit, Eye, Trash2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

interface Campaign {
  id: string
  name: string
  status: string
}

interface CampaignRowActionsProps {
  campaign: Campaign
}

export function CampaignRowActions({ campaign }: CampaignRowActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const supabase = createBrowserClient()

  console.log("[v0] CampaignRowActions component mounted for campaignId:", campaign.id)

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const dropdownWidth = 160
      const dropdownHeight = 200 // Approximate height

      let top = rect.bottom + 4
      let left = rect.left // Changed from rect.right - dropdownWidth to rect.left

      // Ensure dropdown stays within viewport bounds
      if (left + dropdownWidth > window.innerWidth - 8) {
        left = rect.right - dropdownWidth // If no space on right, align to right edge of button
      }
      if (left < 8) left = 8
      if (top + dropdownHeight > window.innerHeight - 8) {
        top = rect.top - dropdownHeight - 4
      }

      setDropdownPosition({ top, left })
    }
  }, [isOpen])

  const handleButtonClick = () => {
    console.log("[v0] Three dots button clicked, current isOpen:", isOpen)
    setIsOpen(!isOpen)
  }

  const handleDelete = async () => {
    console.log("[v0] Delete button clicked for campaignId:", campaign.id)

    if (!confirm(`Are you sure you want to delete the campaign "${campaign.name}"? This action cannot be undone.`)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "DELETE",
      })

      console.log("[v0] Delete response status:", response.status)
      console.log("[v0] Delete response ok:", response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Delete error response:", errorText)
        throw new Error(`Failed to delete campaign: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log("[v0] Delete success:", result)

      setIsOpen(false)
      router.refresh()
    } catch (error) {
      console.error("[v0] Error deleting campaign:", error)
      alert(`Error deleting campaign: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    console.log("[v0] Status change clicked for campaignId:", campaign.id, "newStatus:", newStatus)

    setIsLoading(true)
    try {
      let endpoint = ""
      if (newStatus === "active") {
        endpoint = `/api/campaigns/${campaign.id}/send`
      } else if (newStatus === "paused") {
        endpoint = `/api/campaigns/${campaign.id}/pause`
      }

      const response = await fetch(endpoint, {
        method: "POST",
      })

      console.log("[v0] Status change response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Status change error response:", errorText)
        throw new Error(`Failed to ${newStatus} campaign: ${response.status}`)
      }

      setIsOpen(false)
      router.refresh()
    } catch (error) {
      console.error("[v0] Error changing campaign status:", error)
      alert(`Error changing campaign status: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOutsideClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        onClick={handleButtonClick}
        disabled={isLoading}
        className="h-8 w-8 p-0 hover:bg-muted"
      >
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">Open menu</span>
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={handleOutsideClick} />
          <div
            className="fixed z-[9999] min-w-[160px] rounded-md border bg-white p-1 shadow-2xl ring-1 ring-black/5"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
          >
            <button
              onClick={() => {
                setIsOpen(false)
                router.push(`/dashboard/campaigns/${campaign.id}`)
              }}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
            >
              <Eye className="h-4 w-4" />
              View Details
            </button>

            <button
              onClick={() => {
                setIsOpen(false)
                router.push(`/dashboard/campaigns/${campaign.id}/edit`)
              }}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>

            {campaign.status === "draft" && (
              <button
                onClick={() => handleStatusChange("active")}
                disabled={isLoading}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Start Campaign
              </button>
            )}

            {campaign.status === "active" && (
              <button
                onClick={() => handleStatusChange("paused")}
                disabled={isLoading}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer disabled:opacity-50"
              >
                <Pause className="h-4 w-4" />
                Pause Campaign
              </button>
            )}

            {campaign.status === "paused" && (
              <button
                onClick={() => handleStatusChange("active")}
                disabled={isLoading}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Resume Campaign
              </button>
            )}

            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

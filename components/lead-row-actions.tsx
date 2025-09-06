"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface LeadRowActionsProps {
  leadId: string
}

export function LeadRowActions({ leadId }: LeadRowActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    console.log("[v0] LeadRowActions component mounted for leadId:", leadId)
  }, [leadId])

  const handleDelete = async () => {
    console.log("[v0] Delete button clicked for leadId:", leadId)
    if (!confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
      return
    }

    setIsDeleting(true)
    try {
      console.log("[v0] Making DELETE request to:", `/api/leads/${leadId}`)
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      })

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response ok:", response.ok)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.log("[v0] Error response data:", errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const responseData = await response.json()
      console.log("[v0] Success response data:", responseData)

      toast.success(responseData.message || "Lead deleted successfully")
      router.refresh()
    } catch (error) {
      console.error("[v0] Error deleting lead:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to delete lead"
      toast.error(`Failed to delete lead: ${errorMessage}`)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted cursor-pointer" disabled={isDeleting}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/leads/${leadId}/edit`} className="cursor-pointer">
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/leads/${leadId}`} className="cursor-pointer">
            View Details
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-600 cursor-pointer focus:text-red-600"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

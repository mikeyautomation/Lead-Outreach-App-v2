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
  const [isOpen, setIsOpen] = useState(false)
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
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete lead")
      }

      toast.success("Lead deleted successfully")
      router.refresh()
    } catch (error) {
      console.error("Error deleting lead:", error)
      toast.error("Failed to delete lead. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleButtonClick = () => {
    console.log("[v0] Three dots button clicked for leadId:", leadId)
    setIsOpen(!isOpen)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 hover:bg-muted"
          disabled={isDeleting}
          onClick={handleButtonClick}
        >
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

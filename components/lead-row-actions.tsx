"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface LeadRowActionsProps {
  leadId: string
}

export function LeadRowActions({ leadId }: LeadRowActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()

  useEffect(() => {
    console.log("[v0] LeadRowActions component mounted for leadId:", leadId)
  }, [leadId])

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const dropdownWidth = 160
      const dropdownHeight = 150 // Approximate height

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

  const handleDelete = async () => {
    console.log("[v0] Delete button clicked for leadId:", leadId)
    if (!confirm("Are you sure you want to delete this lead? This action cannot be undone.")) {
      return
    }

    setIsDeleting(true)
    setIsOpen(false) // Close dropdown when deleting
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

  const handleBackdropClick = () => {
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        className="h-8 w-8 p-0 hover:bg-muted cursor-pointer"
        disabled={isDeleting}
        onClick={() => {
          console.log("[v0] Three dots button clicked, current isOpen:", isOpen)
          setIsOpen(!isOpen)
        }}
      >
        <span className="sr-only">Open menu</span>
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={handleBackdropClick} />
          <div
            className="fixed z-[9999] min-w-[160px] rounded-md border bg-white p-1 shadow-2xl ring-1 ring-black/5"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
          >
            <Link
              href={`/dashboard/leads/${leadId}/edit`}
              className="flex cursor-pointer items-center rounded-sm px-3 py-2 text-sm hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              Edit
            </Link>
            <Link
              href={`/dashboard/leads/${leadId}`}
              className="flex cursor-pointer items-center rounded-sm px-3 py-2 text-sm hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              View Details
            </Link>
            <button
              className="flex w-full cursor-pointer items-center rounded-sm px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

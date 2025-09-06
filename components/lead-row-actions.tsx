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
  const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">("bottom")
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    console.log("[v0] LeadRowActions component mounted for leadId:", leadId)
  }, [leadId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const calculateDropdownPosition = () => {
    if (!buttonRef.current) return

    const buttonRect = buttonRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const dropdownHeight = 120 // Approximate dropdown height
    const spaceBelow = viewportHeight - buttonRect.bottom
    const spaceAbove = buttonRect.top

    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      setDropdownPosition("top")
    } else {
      setDropdownPosition("bottom")
    }
  }

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
    <div className="relative" ref={dropdownRef}>
      <Button
        ref={buttonRef}
        variant="ghost"
        className="h-8 w-8 p-0 hover:bg-muted cursor-pointer"
        disabled={isDeleting}
        onClick={() => {
          console.log("[v0] Three dots button clicked, current isOpen:", isOpen)
          if (!isOpen) {
            calculateDropdownPosition()
          }
          setIsOpen(!isOpen)
        }}
      >
        <span className="sr-only">Open menu</span>
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={handleBackdropClick} />
          <div
            className={`absolute right-0 z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 ${
              dropdownPosition === "top" ? "bottom-8" : "top-8"
            }`}
          >
            <Link
              href={`/dashboard/leads/${leadId}/edit`}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => setIsOpen(false)}
            >
              Edit
            </Link>
            <Link
              href={`/dashboard/leads/${leadId}`}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
              onClick={() => setIsOpen(false)}
            >
              View Details
            </Link>
            <button
              className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground text-red-600 focus:text-red-600"
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

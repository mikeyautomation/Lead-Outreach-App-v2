"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface SimpleLeadActionsProps {
  leadId: string
}

export function SimpleLeadActions({ leadId }: SimpleLeadActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    console.log("[v0] SimpleLeadActions mounted for leadId:", leadId)

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [leadId])

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log("[v0] Toggle button clicked for leadId:", leadId)
    setIsOpen(!isOpen)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    console.log("[v0] Delete clicked for leadId:", leadId)

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
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0"
        disabled={isDeleting}
      >
        <span className="sr-only">Open menu</span>
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-8 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          <Link
            href={`/dashboard/leads/${leadId}/edit`}
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block"
            onClick={() => setIsOpen(false)}
          >
            Edit
          </Link>
          <Link
            href={`/dashboard/leads/${leadId}`}
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block"
            onClick={() => setIsOpen(false)}
          >
            View Details
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-red-600 hover:text-red-600 focus:text-red-600 w-full text-left"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      )}
    </div>
  )
}

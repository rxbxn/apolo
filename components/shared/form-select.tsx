"use client"

import type React from "react"

import { Label } from "@/components/ui/label"

interface FormSelectProps {
  label: string
  options: { value: string; label: string }[]
  required?: boolean
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

export function FormSelect({ label, options, required, value, onChange }: FormSelectProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <select
        required={required}
        value={value}
        onChange={onChange}
        className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground"
      >
        <option value="">Selecciona una opción</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

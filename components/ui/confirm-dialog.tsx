"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle, Trash2, Info, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive" | "info" | "success"
  onConfirm: () => void | Promise<void>
}

const variantConfig = {
  default: {
    icon: Info,
    iconColor: "text-blue-500",
    confirmClass: "bg-primary hover:bg-primary/90"
  },
  destructive: {
    icon: Trash2,
    iconColor: "text-red-500",
    confirmClass: "bg-red-500 hover:bg-red-600"
  },
  info: {
    icon: Info,
    iconColor: "text-blue-500",
    confirmClass: "bg-blue-500 hover:bg-blue-600"
  },
  success: {
    icon: CheckCircle,
    iconColor: "text-green-500",
    confirmClass: "bg-green-500 hover:bg-green-600"
  }
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  onConfirm
}: ConfirmDialogProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("rounded-full p-2 bg-gray-100", config.iconColor)}>
              <Icon className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-gray-600 mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex gap-3 mt-6">
          <AlertDialogCancel className="flex-1">
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={cn("flex-1", config.confirmClass)}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
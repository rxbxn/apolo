"use client"

import { useState } from 'react'

interface UseConfirmProps {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive" | "info" | "success"
}

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<UseConfirmProps | null>(null)
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null)

  const confirm = (props: UseConfirmProps): Promise<boolean> => {
    setConfig(props)
    setIsOpen(true)
    
    return new Promise((resolve) => {
      setResolvePromise(() => resolve)
    })
  }

  const handleConfirm = () => {
    if (resolvePromise) {
      resolvePromise(true)
    }
    setIsOpen(false)
    setResolvePromise(null)
  }

  const handleCancel = () => {
    if (resolvePromise) {
      resolvePromise(false)
    }
    setIsOpen(false)
    setResolvePromise(null)
  }

  return {
    confirm,
    isOpen,
    config,
    handleConfirm,
    handleCancel,
    setIsOpen
  }
}
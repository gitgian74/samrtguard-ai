import { useState, useEffect } from 'react'

export function Toaster() {
  return <div id="toaster-root" className="fixed top-4 right-4 z-50" />
}

export function toast({ title, description, variant = 'default' }) {
  // Simple toast implementation
  console.log(`Toast: ${title} - ${description}`)
}

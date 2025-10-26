'use client'

import { usePathname } from 'next/navigation'
import NavBar from '../components/navbar/navBar'
import { ReactNode, useState, useEffect } from 'react'

export default function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Pages where navbar/sidebar should be hidden
  const authPages = ['/', '/session/start', '/session/end']
  const isAuthPage = authPages.includes(pathname)

  // Initialize component
  useEffect(() => {
    setMounted(true)
  }, [])

  // Handle responsive behavior and load saved sidebar state
  useEffect(() => {
    if (!mounted) return

    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      // Load saved sidebar state from localStorage
      const savedSidebarState = localStorage.getItem('sidebarOpen')
      
      if (!mobile) {
        // On desktop, use saved state or default to true
        setSidebarOpen(savedSidebarState ? JSON.parse(savedSidebarState) : true)
      } else {
        // On mobile, always start closed
        setSidebarOpen(false)
      }
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mounted])

  // Save sidebar state to localStorage when it changes
  const handleSidebarToggle = (open: boolean) => {
    setSidebarOpen(open)
    if (!isMobile) {
      localStorage.setItem('sidebarOpen', JSON.stringify(open))
    }
  }

  if (!mounted) {
    return null // Prevent hydration mismatch
  }

  if (isAuthPage) {
    // For auth pages, just return children without any wrapper
    return <>{children}</>
  }

  // For all other pages, show navbar/sidebar with proper layout
  return (
    <>
      <NavBar sidebarOpen={sidebarOpen} setSidebarOpen={handleSidebarToggle} />
      <div 
        className={`transition-all duration-200 ease-in-out ${
          isMobile 
            ? 'pt-16' // Only top padding on mobile
            : sidebarOpen 
              ? 'pt-16 ml-64' // Top padding + left margin for sidebar on desktop
              : 'pt-16' // Only top padding when sidebar is closed
        }`}
      >
        <div className="p-4">
          {children}
        </div>
      </div>
    </>
  )
}
'use client'

import { usePathname } from 'next/navigation'
import NavBar from '@/components/navbar/navBar'
import { ReactNode } from 'react'

export default function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  
  // Pages where navbar/sidebar should be hidden
  const authPages = ['/', '/session/start', '/session/end']
  const isAuthPage = authPages.includes(pathname)

  if (isAuthPage) {
    // For auth pages, just return children without any wrapper
    return <>{children}</>
  }

  // For all other pages, show navbar/sidebar with original styling
  return (
    <>
      <NavBar />
      <div className="pt-16 sm:ml-64">
        {children}
      </div>
    </>
  )
}
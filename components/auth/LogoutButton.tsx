// components/auth/LogoutButton.tsx
'use client'

import { useMsal } from '@azure/msal-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useSession } from '@/components/auth/SessionProvider'

interface LogoutButtonProps {
  className?: string
  showIcon?: boolean
  text?: string
}

export default function LogoutButton({
  className = '',
  showIcon = true,
  text = 'Log Out'
}: LogoutButtonProps) {
  const { instance } = useMsal()
  const router = useRouter()
  const { endSession } = useSession()
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = () => {
    setShowConfirmation(true)
  }

  const confirmLogout = async () => {
    try {
      await endSession()
      await instance.logoutRedirect({
        postLogoutRedirectUri: '/',
      })
    } catch (error) {
      console.error('Logout failed:', error)
      router.push('/')
    }
  }

  const cancelLogout = () => {
    setShowConfirmation(false)
  }

  const modal = showConfirmation && mounted ? (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-[60]" 
        onClick={cancelLogout}
      ></div>
      
      {/* Modal - Centered in main content area (accounting for sidebar) */}
      <div className="fixed top-0 right-0 bottom-0 left-0 sm:left-64 flex items-center justify-center z-[70] pointer-events-none">
        <div className="pointer-events-auto">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Logout</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>

            <div className="flex space-x-3">
              <button
                onClick={cancelLogout}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  ) : null

  return (
    <>
      <button
        onClick={handleLogout}
        className={className}
      >
        {showIcon && <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3 flex-shrink-0" />}
        {text}
      </button>

      {mounted && createPortal(modal, document.body)}
    </>
  )
}
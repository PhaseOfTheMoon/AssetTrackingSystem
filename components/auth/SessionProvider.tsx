'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useMsal } from '@azure/msal-react'

interface UserSession {
  sessionId: string | null
  staffId: string | null
  name: string | null
  email: string | null
  departmentId: string | null
  mobileNo: string | null
  microsoftUserId: string | null
  role: 'admin' | 'user'
}

interface SessionContextType {
  session: UserSession | null
  setSession: (session: UserSession | null) => void
  startSession: (staffData: any, microsoftUserId: string) => Promise<void>
  endSession: () => Promise<void>
  isLoading: boolean
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

//Define admin emails
const ADMIN_EMAILS = [
  '104385730@students.swinburne.edu.my',
  '104401021@students.swinburne.edu.my',
  '104401173@students.swinburne.edu.my'
]

// Helper function to determine user role based on email
function determineRole(email: string): 'admin' | 'user' {
  return ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'user'
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { accounts } = useMsal()

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('userSession')
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession))
      } catch (error) {
        console.error('Error loading session:', error)
        localStorage.removeItem('userSession')
      }
    }
    setIsLoading(false)
  }, [])

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (session) {
      localStorage.setItem('userSession', JSON.stringify(session))
    } else {
      localStorage.removeItem('userSession')
    }
  }, [session])

  const startSession = async (staffData: any, microsoftUserId: string) => {
    try {
      // Create session in database
      const response = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          microsoftUserId,
          staffId: staffData.staff_id,
          loginLocation: 'Web App'
        })
      })

      const data = await response.json()

      if (data.success) {
        const userRole = determineRole(staffData.email)
        const newSession: UserSession = {
          sessionId: data.session.session_id,
          staffId: staffData.staff_id,
          name: staffData.name,
          email: staffData.email,
          departmentId: staffData.department_id,
          mobileNo: staffData.mobile_no,
          microsoftUserId,
          role: userRole
        }
        setSession(newSession)
        console.log(`User logged in as: $(userRole)`, `Email: ${staffData.email}`)
      } else {
        console.error('Failed to start session:', data.error)
      }
    } catch (error) {
      console.error('Error starting session:', error)
    }
  }

  const endSession = async () => {
    if (!session?.sessionId) return

    try {
      await fetch('/api/sessions/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          staffId: session.staffId
        })
      })

      setSession(null)
    } catch (error) {
      console.error('Error ending session:', error)
      // Clear session anyway
      setSession(null)
    }
  }

  return (
    <SessionContext.Provider
      value={{
        session,
        setSession,
        startSession,
        endSession,
        isLoading
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
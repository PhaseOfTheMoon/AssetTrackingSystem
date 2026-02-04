// sessionProvider.tsx
/*
  - SessionProvider is like a classroom notebook where it remembers extra
  - details about the logged-in user, such as staff ID, role, department, etc.
  - For instance, NextAuth checks if you are logged in and SessionProvider checks
  - what kind of user are you inside the app.
  - It helps to update and manage user session data across the app, like
  - logging in and out.
  */
'use client' // The file needs useState, useEffect and useContext

/*
  - createContext: Creates a context for session data
  - useContext: Hook to access the session context
  - useState: Hook to manage session state
  - useEffect: Hook to handle side effects like fetching session data
  - ReactNode: Type for React children components
*/
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
/*
  - useSession: Hook from NextAuth to get authentication session
  - useNextAuthSession: The actual hook from NextAuth
*/
import { useSession as useNextAuthSession } from 'next-auth/react'

// Define the shape of the user session data
// It represents who is this user inside the system
interface UserSession {
  sessionId: string | null // Unique session identifier
  staffId: string | null // Staff ID of the logged-in user
  name: string | null // Name of the user
  email: string | null // Email of the user
  departmentId: string | null // Department ID of the user
  mobileNo: string | null // Mobile number of the user
  microsoftUserId: string | null // Microsoft user ID
  // role: string | null // Removed role from client session for security
}

// Define the context type for session management
// Component using this context can read, start and end sessions
// and know if things are loading
interface SessionContextType {
  session: UserSession | null // Current user session data
  setSession: (session: UserSession | null) => void // Function to update session data
  startSession: (staffData: any, microsoftUserId: string) => Promise<void> // Function to start a new session
  endSession: () => Promise<void> // Function to end the current session
  isLoading: boolean // Checks if session data is loading
}

// Create the session context
// Undefined is for just in case you forget the provider
const SessionContext = createContext<SessionContextType | undefined>(undefined) 

// This is the SessionProvider component that wraps the app
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null) // Session represents user info
  const [isLoading, setIsLoading] = useState(true) // Loading state to check if session is being fetched
  const { data: nextAuthSession, status } = useNextAuthSession() // Read NextAuth session
                                                                 // Who is the user, is the user still logged in?

  // Just use NextAuth session status
  useEffect(() => { // Sync session state with NextAuth session
    if (status === 'loading') { // If loading, don't redirect early
      setIsLoading(true)
      return
    }

    // If the user is authenticated in NextAuth and we have user data
    // Store relevant user info in our session state
    if (status === 'authenticated' && nextAuthSession?.user) {
      // Use NextAuth session data
      setSession({
        sessionId: null,
        staffId: (nextAuthSession.user as any).staffId || null,
        name: nextAuthSession.user.name || null,
        email: nextAuthSession.user.email || null,
        departmentId: null,
        mobileNo: null,
        microsoftUserId: (nextAuthSession.user as any).microsoftUserId || null,
        // role: (nextAuthSession.user as any).role || null, // Removed role from client session for security
      })
    } else {
      setSession(null) // Clears the session after user logs out
    }
    setIsLoading(false) // Sync complete
  }, [status, nextAuthSession])

  // Function to start a new session, calls backend and creates a server-side session
  const startSession = async (staffData: any, microsoftUserId: string) => {
    try { // Call backend API to create session
      const response = await 
      fetch('/api/sessions/start', // API route to create session
        {
          method: 'POST', // Create a new session
          credentials: 'include', // Sends cookies securely
          headers: { 'Content-Type': 'application/json' },
          /* Commented by Desmond @ 8-Jan-2026: Client should NEVER send
             - staffID
             - email
             - microsoftUserID
             - role, to backend for security reasons.
          body: JSON.stringify({
            staffId: staffData.id || staffData.staff_id, // Staff ID from staff data
            email: staffData.email, // Email from staff data
            microsoftUserId, // Microsoft user ID
        }),
        End */
      })

      const data = await response.json() // Reads the server response as JSON

      if (data.success && data.session) { // Only trust server-approved data
        const newSession: UserSession = { // Create new session object
          sessionId: data.session.sessionId, // Unique session ID from server
          staffId: data.session.staffId, // Staff ID from server session
          name: data.session.name, // Name from server session
          email: data.session.email, // Email from server session
          departmentId: data.session.departmentId, // Department ID from server session
          mobileNo: data.session.mobileNo, // Mobile number from server session
          microsoftUserId: data.session.microsoftUserId, // Microsoft user ID from server session
          // role: data.session.role, // Removed role from client session for security
        }
        setSession(newSession) // Update session state with new session data
      } else { // If server returns error
        throw new Error(data.error || 'Failed to start session') // Throw error for handling
      }
    } catch (error) { // Backend or API call failed
      console.error('Error starting session:', error) // Log error for debugging
      throw error // Rethrow error for further handling
    }
  }

  // Function to destroy session and clear cookies
  const endSession = async () => {
    try { // Call backend API to end session
      await fetch('/api/sessions/end', { // API route to end session
        method: 'POST', // End the session
        credentials: 'include', // Sends cookies securely
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) { // Backend or API call failed
      console.error('Error ending session:', error) // Log error for debugging
    } finally { // Always clear session state
      setSession(null) // Clear session state on client side
    }
  }

  return ( // Provide session context to child components
    <SessionContext.Provider value={{
        session,
        setSession,
        startSession,
        endSession,
        isLoading,
      }}> {/* Everything inside now has access to session info */}
      {children} {/* Render child components */}
    </SessionContext.Provider>
  )
}

// Safe shortcut to use the session context in components
// Prevents misuse and throw error if provider missing
export function useSession() {
  const context = useContext(SessionContext) // Access session context
  if (context === undefined) { // If used outside provider
    throw new Error('useSession must be used within a SessionProvider') // Throw error
  }
  return context // Return session context
}
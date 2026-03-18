// api/sessions/set-cookies/route.ts
import { NextRequest, NextResponse } from 'next/server' // NextRequest: How incoming visitors look like; NextResponse: How a reply is sent back
import { getServerSession } from 'next-auth' // Server-only function that reads and decodes the current next-auth session
import { cookies } from 'next/headers' // Gives the router handler write access to the cookie
import { z } from 'zod' // Verify that fields are filled correctly
import { authOptions } from '@/lib/auth'

/** Commented by Desmond @ 18-Mar-26
 ** CONSTANTS **/
const NEXT_AUTH_COOKIE_NAME =
  process.env.NODE_ENV === 'production' 
    ? '__Secure-next-auth.session-token' 
    : 'next-auth.session-token'

// Only visitors from our website can receive a cookie
const ALLOWED_ORIGINS: string[] = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

// This is a Zod schema (source of truth for what a valid request looks like)
const sessionCookieSchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required'), // Must be a non-empty text string
  role: z.enum(['admin', 'staff']), // Role must be exactly 'admin' or 'staff'
  email: z.string().email('Invalid email format').optional(), // Email must look like a real email
  action: z.enum(['set', 'clear']).default('set') // Action is either 'set' or 'clear': Give or take back cookies
})

// Types
type sessionPayload = { // Tells TypeScript exactly data the cookie has
  staffId: string
  role: 'admin' | 'staff'
  email: string | null
}

// Helper methods
/* Every request has a header, 'origin', that tells which website sent the request
   In development, it always says yes; In production, the guest is denied if not on origin list */
function isOriginAllowed(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true
  }

  if (ALLOWED_ORIGINS.length === 0) {
    console.warn(
      '[set-cookie] ALLOWED_ORIGINS is not configured - skipping origin check.' +
      'Set the environment variable to enforce CSRF origin validation.'
    )
    return true
  }
  const origin = request.headers.get('origin') ?? ''
  return ALLOWED_ORIGINS.includes(origin)
}

// Prints error message when error occurred
function errorResponse (message: string, status: number, logContext?: unknown): NextResponse {
  if (logContext !== undefined) {
    console.error(`[set-cookie] ${message}`, logContext)
  }
  return NextResponse.json(
    { success: false, error: message},
    { status }
  )
}

// POST route handler
/** Commented by Desmond @ 18-Mar-26
 * Handles the creation of a new user session
 * @params {NextRequest} request - The incoming HTTP request containing session data.
 * @returns {Promise<NextResponse>} A jSON response indicating success or failure.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // CSRF origin check: Checks if the visitor is from a trusted site
  if (!isOriginAllowed(request)) { // If the visitor is not from trusted site, forbid access
    return NextResponse.json(
      {success: false, error: 'Forbidden: Origin not allowed'},
      { status: 403 } // Forbidden: The server understands the request but refuses to authorize it
    )
  }

  // Content-Type check
  const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) { // If the form is not JSON, return an error
      return NextResponse.json( 
        { success: false, error: 'Invalid Content-Type. Expected application/json' },
        { status: 400 } // Bad request
      )
    }

  let body: unknown // Use 'unknown' instead of 'any': Not allowed until verified
  // Try to read body as JSON. If error, catch it here
  try {
    body = await request.json() // Raw data taken from HTTP request and tried to be read as JSON string
  } catch {
    return NextResponse.json(
      { success: false, message: 'Malformed JSON body' },
      { status: 400 } // Bad request
    )
  }

  // Safely validate the results using Zod
  const parseResult = sessionCookieSchema.safeParse(body)
  if (!parseResult.success) { // Ig anything fails or missing, return error
    const validationErrors = parseResult.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }))
    return NextResponse.json(
      { success: false, error: 'Validation failed', details: validationErrors },
      { status: 422 } // Unprocessable entity: The server understands the content type but cannot process due to semantic errors
    )
  }

  // Validate and parse the input
  const { staffId, role, email, action } = parseResult.data

  if (action === 'clear') { // The data can proceed once it is validated
    // Clear the session cookie
    (await cookies()).delete(NEXT_AUTH_COOKIE_NAME) // Remove the cookie once data is validated
    return NextResponse.json(
      { success: true, message: 'Session cleared' },
      { status: 200 } // OK: Server processed the request
    )
  }

  // Build a clean session payload object after zod has validated the request
  const sessionPayload: sessionPayload = {
    staffId,
    role,
    email: email ?? null
  }

  // Confirm the session data is valid. Return the validated payload
  // so the client knows it can proceed to call signIn()
  try {
    // Use getServerSession to check if a session already exists before
    // creating a new one to prevent duplicate sessions.
    const existingSession = await getServerSession(authOptions)
    if (existingSession) {
      return NextResponse.json(
        { success: true, message: 'Session already active' },
        { status: 200 }
      )
    }

    // Payload is valid and no duplicate session
    return NextResponse.json(
      { success: true, message: 'Session data validated. Call signIn() to create the session',
        staffId: sessionPayload.staffId,
        role: sessionPayload.role
      },
      { status: 200 }
    )
  } catch(err) {
    // Real error goes to the server log and caller gets a safe generic message
    return errorResponse('Failed to process session request', 500, err) // Internal server error
  }
}
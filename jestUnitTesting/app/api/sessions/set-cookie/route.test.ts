import { POST } from '@/app/api/sessions/set-cookie/route'
import { cookies } from 'next/headers'

const mockGetServerSession = jest.fn()

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any, init?: any) => ({
      json: async () => body,
      status: init?.status ?? 200,
    }),
  },
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({ delete: jest.fn() }),
}))

jest.mock('next-auth', () => ({
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

function makeRequest(body: object, contentType = 'application/json') {
  return {
    headers: {
      get: (key: string) => {
        if (key === 'content-type') {
          return contentType
        }
        if (key === 'origin') {
          return 'http://localhost:3000'
        }
        return null
      },
    },
    json: async () => body,
  } as any
}

const validBody = { staffId: 'S001', role: 'staff', action: 'set' }

describe('POST /api/sessions/set-cookie', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(null)
    // re-apply the resolved value after clearAllMocks resets it
    ;(cookies as jest.Mock).mockResolvedValue({ delete: jest.fn() })
  })

  /** valid body with no existing session should return session data validated */
  it('returns success when session data is valid and no existing session', async () => {
    const res = await POST(makeRequest(validBody))
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(body.staffId).toBe('S001')
    expect(body.role).toBe('staff')
  })

  /** wrong content type should return 400 */
  it('returns 400 when content type is not application/json', async () => {
    const res = await POST(makeRequest(validBody, 'text/plain'))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toContain('Invalid Content-Type')
  })

  /** malformed json body should return 400 */
  it('returns 400 when request body is malformed JSON', async () => {
    const badRequest = {
      headers: { get: (key: string) => key === 'content-type' ? 'application/json' : null },
      json: async () => { throw new Error('bad json') },
    } as any

    const res = await POST(badRequest)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.message).toBe('Malformed JSON body')
  })

  /** missing required fields should return 422 */
  it('returns 422 when required fields are missing', async () => {
    const res = await POST(makeRequest({ staffId: '', role: 'staff' }))
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.error).toBe('Validation failed')
  })

  /** invalid role value should return 422 */
  it('returns 422 when role is not admin or staff', async () => {
    const res = await POST(makeRequest({ staffId: 'S001', role: 'superadmin' }))
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.error).toBe('Validation failed')
  })

  /** action clear should delete the session cookie */
  it('clears session cookie when action is clear', async () => {
    const mockDelete = jest.fn()
    ;(cookies as jest.Mock).mockResolvedValue({ delete: mockDelete })

    const res = await POST(makeRequest({ staffId: 'S001', role: 'staff', action: 'clear' }))
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(body.message).toBe('Session cleared')
    expect(mockDelete).toHaveBeenCalled()
  })

  /** if session already exists return session already active */
  it('returns session already active when a session already exists', async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: 'test@swin.edu.my' } })

    const res = await POST(makeRequest(validBody))
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(body.message).toBe('Session already active')
  })

  /** if getServerSession throws return 500 */
  it('returns 500 when getServerSession throws an error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    mockGetServerSession.mockRejectedValue(new Error('session error'))

    const res = await POST(makeRequest(validBody))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Failed to process session request')

    consoleSpy.mockRestore()
  })

  /** in production with allowed origins set, request from allowed origin should pass */
  it('allows request from allowed origin in production', async () => {
    const original = process.env.NODE_ENV
    const originalOrigins = process.env.ALLOWED_ORIGINS
    process.env.NODE_ENV = 'production'
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000'

    const res = await POST(makeRequest(validBody))
    const body = await res.json()

    expect(body.success).toBe(true)

    process.env.NODE_ENV = original
    process.env.ALLOWED_ORIGINS = originalOrigins
  })

  /** in production with ALLOWED_ORIGINS empty, should warn and allow the request */
  it('allows request and warns when ALLOWED_ORIGINS is empty in production', async () => {
    const original = process.env.NODE_ENV
    const originalOrigins = process.env.ALLOWED_ORIGINS
    process.env.NODE_ENV = 'production'
    process.env.ALLOWED_ORIGINS = ''

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

    const res = await POST(makeRequest(validBody))
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ALLOWED_ORIGINS is not configured'))

    consoleSpy.mockRestore()
    process.env.NODE_ENV = original
    process.env.ALLOWED_ORIGINS = originalOrigins
  })
})

import { GET } from '@/app/api/auth/check-email/route'

const mockSingle = jest.fn()
const mockEq = jest.fn(() => ({ single: mockSingle }))
const mockSelect = jest.fn(() => ({ eq: mockEq }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

jest.mock('@/lib/supabase/server', () => ({
  get supabaseAdmin() {
    return { from: mockFrom }
  },
}))

// mock next/server so NextResponse works in jsdom without edge runtime
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any) => ({
      json: async () => body,
    }),
  },
}))

/** build a fake NextRequest with optional email query param */
function makeRequest(email?: string) {
  return {
    nextUrl: {
      searchParams: new URLSearchParams(email ? `email=${encodeURIComponent(email)}` : ''),
    },
  } as any
}

describe('GET /api/auth/check-email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle })
  })

  /** no email param should return message null */
  it('returns message null when no email is provided', async () => {
    const res = await GET(makeRequest())
    const body = await res.json()

    expect(body).toEqual({ message: null })
  })

  /** email not found in db means free to use */
  it('returns message null when email is not in the database', async () => {
    mockSingle.mockResolvedValue({ data: null })

    const res = await GET(makeRequest('notfound@swin.edu.my'))
    const body = await res.json()

    expect(body).toEqual({ message: null })
  })

  /** pending account should get the pending message */
  it('returns pending message when account status is pending', async () => {
    mockSingle.mockResolvedValue({ data: { email: 'pending@swin.edu.my', status: 'pending' } })

    const res = await GET(makeRequest('pending@swin.edu.my'))
    const body = await res.json()

    expect(body.message).toBe('Your registration is pending approval. Please wait for admin confirmation.')
  })

  /** approved account should get the already registered message */
  it('returns already registered message when account status is approved', async () => {
    mockSingle.mockResolvedValue({ data: { email: 'approved@swin.edu.my', status: 'approved' } })

    const res = await GET(makeRequest('approved@swin.edu.my'))
    const body = await res.json()

    expect(body.message).toBe('This email is already registered. Please login.')
  })

  /** rejected account should get the rejected message */
  it('returns rejected message when account status is rejected', async () => {
    mockSingle.mockResolvedValue({ data: { email: 'rejected@swin.edu.my', status: 'rejected' } })

    const res = await GET(makeRequest('rejected@swin.edu.my'))
    const body = await res.json()

    expect(body.message).toBe('Your previous registration was rejected. Please contact administrator.')
  })

  /** unknown status should still return message null */
  it('returns message null for unknown account status', async () => {
    mockSingle.mockResolvedValue({ data: { email: 'weird@swin.edu.my', status: 'unknown' } })

    const res = await GET(makeRequest('weird@swin.edu.my'))
    const body = await res.json()

    expect(body).toEqual({ message: null })
  })
})

import { GET } from '@/app/api/auth/check-staff-id/route'

const mockSingle = jest.fn()
const mockEq = jest.fn(() => ({ single: mockSingle }))
const mockSelect = jest.fn(() => ({ eq: mockEq }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

jest.mock('@/lib/supabase/server', () => ({
  get supabaseAdmin() {
    return { from: mockFrom }
  },
}))

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any) => ({
      json: async () => body,
    }),
  },
}))

function makeRequest(staffId?: string) {
  return {
    nextUrl: {
      searchParams: new URLSearchParams(staffId ? `staff_id=${encodeURIComponent(staffId)}` : ''),
    },
  } as any
}

describe('GET /api/auth/check-staff-id', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle })
  })

  /** no staff_id param should return exists false */
  it('returns exists false when no staff_id is provided', async () => {
    const res = await GET(makeRequest())
    const body = await res.json()

    expect(body).toEqual({ exists: false })
  })

  /** non-digit staff_id like letters should return exists false without hitting db */
  it('returns exists false when staff_id contains non-digits', async () => {
    const res = await GET(makeRequest('abc'))
    const body = await res.json()

    expect(body).toEqual({ exists: false })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  /** valid staff_id not in db should return exists false */
  it('returns exists false when staff_id is not found in database', async () => {
    mockSingle.mockResolvedValue({ data: null })

    const res = await GET(makeRequest('12345'))
    const body = await res.json()

    expect(body).toEqual({ exists: false })
  })

  /** valid staff_id found in db should return exists true */
  it('returns exists true when staff_id is already registered', async () => {
    mockSingle.mockResolvedValue({ data: { staff_id: '12345' } })

    const res = await GET(makeRequest('12345'))
    const body = await res.json()

    expect(body).toEqual({ exists: true })
  })

  /** staff_id with mixed letters and digits should return exists false without hitting db */
  it('returns exists false when staff_id has mixed letters and digits', async () => {
    const res = await GET(makeRequest('123abc'))
    const body = await res.json()

    expect(body).toEqual({ exists: false })
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

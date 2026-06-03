import { POST } from '@/app/api/auth/register/route'

const mockSingle = jest.fn()
const mockSelect = jest.fn(() => ({ single: mockSingle }))
const mockInsert = jest.fn(() => ({ select: mockSelect }))
const mockEq = jest.fn(() => ({ single: mockSingle }))
const mockSelectQuery = jest.fn(() => ({ eq: mockEq }))
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  get supabaseAdmin() {
    return { from: mockFrom }
  },
}))

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any, init?: any) => ({
      json: async () => body,
      status: init?.status ?? 200,
    }),
  },
}))

/** valid registration body */
const validBody = {
  staff_id: '12345',
  name: 'Jun Zhen Wong',
  email: 'junzhen@swin.edu.my',
  mobile_no: '0123456789',
  department_id: 'IT',
}

function makeRequest(body: object) {
  return { json: async () => body } as any
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // default: staff_id not taken, email not taken, insert succeeds
    mockFrom.mockImplementation((table: string) => {
      if (table === 'Staff') {
        return { select: mockSelectQuery, insert: mockInsert }
      }
      return { select: mockSelectQuery }
    })
    mockSelectQuery.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSingle.mockResolvedValue({ data: null })
    mockInsert.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ single: mockSingle })
  })

  /** valid body with all fields should register successfully */
  it('returns success when all fields are valid and not duplicated', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: null }) // staff_id check
      .mockResolvedValueOnce({ data: null }) // email check
      .mockResolvedValueOnce({ data: { staff_id: '12345', name: 'Jun Zhen Wong', email: 'junzhen@swin.edu.my' }, error: null }) // insert

    const res = await POST(makeRequest(validBody))
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(body.staff.staff_id).toBe('12345')
  })

  /** missing staff_id should return 400 validation error */
  it('returns 400 when staff_id is missing', async () => {
    const res = await POST(makeRequest({ ...validBody, staff_id: '' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBeTruthy()
  })

  /** non-digit staff_id should return 400 */
  it('returns 400 when staff_id contains letters', async () => {
    const res = await POST(makeRequest({ ...validBody, staff_id: 'abc' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toContain('digits only')
  })

  /** invalid email format should return 400 */
  it('returns 400 when email format is invalid', async () => {
    const res = await POST(makeRequest({ ...validBody, email: 'notanemail' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBeTruthy()
  })

  /** duplicate staff_id should return 409 */
  it('returns 409 when staff_id is already registered', async () => {
    mockSingle.mockResolvedValueOnce({ data: { staff_id: '12345' } }) // staff_id taken

    const res = await POST(makeRequest(validBody))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toContain('already registered')
  })

  /** duplicate email with pending status should return 409 */
  it('returns 409 with pending message when email is pending', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: null }) // staff_id free
      .mockResolvedValueOnce({ data: { email: 'junzhen@swin.edu.my', status: 'pending' } }) // email taken

    const res = await POST(makeRequest(validBody))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toContain('pending approval')
  })

  /** duplicate email with approved status should return 409 */
  it('returns 409 with login message when email is already approved', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: { email: 'junzhen@swin.edu.my', status: 'approved' } })

    const res = await POST(makeRequest(validBody))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toContain('already registered')
  })

  /** duplicate email with rejected status should return 403 */
  it('returns 403 when email was previously rejected', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: { email: 'junzhen@swin.edu.my', status: 'rejected' } })

    const res = await POST(makeRequest(validBody))
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body.error).toContain('rejected')
  })

  /** db insert error should return 500 */
  it('returns 500 when database insert fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    mockSingle
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'insert failed' } })

    const res = await POST(makeRequest(validBody))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Failed to submit registration')

    consoleSpy.mockRestore()
  })

  /** unexpected error like request.json() throwing should return 500 */
  it('returns 500 on unexpected error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    const badRequest = { json: async () => { throw new Error('parse error') } } as any

    const res = await POST(badRequest)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Internal server error')

    consoleSpy.mockRestore()
  })
})

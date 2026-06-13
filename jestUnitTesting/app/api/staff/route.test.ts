import { GET, POST, PUT, DELETE } from '@/app/api/staff/route'

const mockValidateSession = jest.fn()
const mockSingle = jest.fn()
const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockEq = jest.fn()
const mockIlike = jest.fn()
const mockOrder = jest.fn()
const mockRange = jest.fn()
const mockFrom = jest.fn()

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any, init?: any) => ({
      json: async () => body,
      status: init?.status ?? 200,
    }),
  },
}))

jest.mock('@/lib/apiAuth', () => ({
  validateSession: (...args: any[]) => mockValidateSession(...args),
}))

jest.mock('@/lib/supabase/server', () => ({
  get supabaseAdmin() {
    return { from: mockFrom }
  },
}))

/** authorized session mock */
const authorized = { authorized: true, response: null }

/** unauthorized session mock */
const unauthorized = {
  authorized: false,
  response: { json: async () => ({ error: 'Unauthorized' }), status: 401 },
}

function makeRequest(url: string, body?: object) {
  return {
    url,
    json: async () => body,
    headers: { get: () => 'application/json' },
  } as any
}

describe('GET /api/staff', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateSession.mockResolvedValue(authorized)

    const queryChain = {
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      select: jest.fn().mockReturnThis(),
    }
    mockFrom.mockReturnValue(queryChain)
  })

  /** unauthorized request should return the auth error response */
  it('returns unauthorized when session is not valid', async () => {
    mockValidateSession.mockResolvedValue(unauthorized)

    const res = await GET(makeRequest('http://localhost/api/staff'))

    expect(res.status).toBe(401)
  })

  /** valid request should return data and pagination info */
  it('returns staff list with pagination on success', async () => {
    const mockStaff = [{ staff_id: 'S001', name: 'Jun Zhen' }]
    const queryChain = {
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: mockStaff, error: null, count: 1 }),
      select: jest.fn().mockReturnThis(),
    }
    mockFrom.mockReturnValue(queryChain)

    const res = await GET(makeRequest('http://localhost/api/staff?page=1&limit=10'))
    const body = await res.json()

    expect(body.data).toEqual(mockStaff)
    expect(body.totalItems).toBe(1)
  })

  /** search param should trigger ilike query */
  it('applies search filter when search param is provided', async () => {
    const mockStaff = [{ staff_id: 'S001', name: 'Jun Zhen' }]
    const ilikeMock = jest.fn().mockReturnThis()
    const queryChain = {
      eq: jest.fn().mockReturnThis(),
      ilike: ilikeMock,
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: mockStaff, error: null, count: 1 }),
      select: jest.fn().mockReturnThis(),
    }
    mockFrom.mockReturnValue(queryChain)

    const res = await GET(makeRequest('http://localhost/api/staff?search=Jun&searchField=name'))
    const body = await res.json()

    expect(body.data).toEqual(mockStaff)
    expect(ilikeMock).toHaveBeenCalled()
  })

  /** invalid searchField should fall back to name */
  it('falls back to name when searchField is invalid', async () => {
    const ilikeMock = jest.fn().mockReturnThis()
    const queryChain = {
      eq: jest.fn().mockReturnThis(),
      ilike: ilikeMock,
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      select: jest.fn().mockReturnThis(),
    }
    mockFrom.mockReturnValue(queryChain)

    await GET(makeRequest('http://localhost/api/staff?search=test&searchField=invalid_field'))

    expect(ilikeMock).toHaveBeenCalledWith('name', expect.any(String))
  })

  /** invalid sortBy should fall back to created_dt */
  it('falls back to created_dt when sortBy is invalid', async () => {
    const orderMock = jest.fn().mockReturnThis()
    const queryChain = {
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: orderMock,
      range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      select: jest.fn().mockReturnThis(),
    }
    mockFrom.mockReturnValue(queryChain)

    await GET(makeRequest('http://localhost/api/staff?sortBy=invalid'))

    expect(orderMock).toHaveBeenCalledWith('created_dt', expect.any(Object))
  })

  /** asc sortOrder should be passed correctly */
  it('uses ascending sort order when sortOrder is asc', async () => {
    const orderMock = jest.fn().mockReturnThis()
    const queryChain = {
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: orderMock,
      range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      select: jest.fn().mockReturnThis(),
    }
    mockFrom.mockReturnValue(queryChain)

    await GET(makeRequest('http://localhost/api/staff?sortOrder=asc'))

    expect(orderMock).toHaveBeenCalledWith(expect.any(String), { ascending: true })
  })

  /** db error should return 500 */
  it('returns 500 when database query fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    const queryChain = {
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: null, error: { message: 'db error' }, count: null }),
      select: jest.fn().mockReturnThis(),
    }
    mockFrom.mockReturnValue(queryChain)

    const res = await GET(makeRequest('http://localhost/api/staff'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Failed to fetch staff list')

    consoleSpy.mockRestore()
  })
})

describe('POST /api/staff', () => {
  const validBody = {
    staff_id: '12345',
    name: 'Jun Zhen',
    email: 'junzhen@swin.edu.my',
    mobile_no: '0123456789',
    department_id: 'IT',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateSession.mockResolvedValue(authorized)
  })

  /** helper to set up the supabase chain for POST */
  function setupPostMocks(existingData: any, insertResult: any) {
    const checkSingle = jest.fn().mockResolvedValue({ data: existingData })
    const checkEq = jest.fn().mockReturnValue({ single: checkSingle })
    const checkSelect = jest.fn().mockReturnValue({ eq: checkEq })

    const insertSingle = jest.fn().mockResolvedValue(insertResult)
    const insertSelectInner = jest.fn().mockReturnValue({ single: insertSingle })
    const insertChain = jest.fn().mockReturnValue({ select: insertSelectInner })

    mockFrom.mockReturnValue({ select: checkSelect, insert: insertChain })
  }

  /** unauthorized request should return auth error */
  it('returns unauthorized when session is not valid', async () => {
    mockValidateSession.mockResolvedValue(unauthorized)

    const res = await POST(makeRequest('http://localhost/api/staff', validBody))

    expect(res.status).toBe(401)
  })

  /** invalid body should return 400 */
  it('returns 400 when body fails validation', async () => {
    const res = await POST(makeRequest('http://localhost/api/staff', { staff_id: 'abc' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid input')
  })

  /** duplicate staff id should return 409 */
  it('returns 409 when staff_id already exists', async () => {
    setupPostMocks({ staff_id: '12345' }, null)

    const res = await POST(makeRequest('http://localhost/api/staff', validBody))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body.error).toBe('Staff ID already exists')
  })

  /** successful insert should return 201 */
  it('returns 201 on successful staff creation', async () => {
    setupPostMocks(null, { data: validBody, error: null })

    const res = await POST(makeRequest('http://localhost/api/staff', validBody))
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
  })

  /** db unique constraint error should return 409 */
  it('returns 409 when db returns unique constraint error code 23505', async () => {
    setupPostMocks(null, { data: null, error: { code: '23505', message: 'duplicate' } })

    const res = await POST(makeRequest('http://localhost/api/staff', validBody))
    const body = await res.json()

    expect(res.status).toBe(409)
  })

  /** unexpected error like json parse failure should return 500 */
  it('returns 500 on unexpected error in POST', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    const badRequest = { json: async () => { throw new Error('parse error') } } as any

    const res = await POST(badRequest)
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Internal server error')

    consoleSpy.mockRestore()
  })
})

describe('PUT /api/staff', () => {
  const validBody = { staff_id: '12345', name: 'Updated Name' }

  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateSession.mockResolvedValue(authorized)
  })

  function setupPutMocks(result: any) {
    const putSingle = jest.fn().mockResolvedValue(result)
    const putSelect = jest.fn().mockReturnValue({ single: putSingle })
    const putEq = jest.fn().mockReturnValue({ select: putSelect })
    const putUpdate = jest.fn().mockReturnValue({ eq: putEq })
    mockFrom.mockReturnValue({ update: putUpdate })
  }

  /** unauthorized request should return auth error */
  it('returns unauthorized when session is not valid', async () => {
    mockValidateSession.mockResolvedValue(unauthorized)

    const res = await PUT(makeRequest('http://localhost/api/staff', validBody))

    expect(res.status).toBe(401)
  })

  /** invalid body should return 400 */
  it('returns 400 when body fails validation', async () => {
    const res = await PUT(makeRequest('http://localhost/api/staff', { staff_id: '' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('Invalid input')
  })

  /** successful update should return success true */
  it('returns success true on successful update', async () => {
    setupPutMocks({ data: validBody, error: null })

    const res = await PUT(makeRequest('http://localhost/api/staff', validBody))
    const body = await res.json()

    expect(body.success).toBe(true)
  })

  /** db error should return 500 */
  it('returns 500 when database update fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    setupPutMocks({ data: null, error: { message: 'update failed' } })

    const res = await PUT(makeRequest('http://localhost/api/staff', validBody))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Failed to update staff member')

    consoleSpy.mockRestore()
  })
})

describe('DELETE /api/staff', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateSession.mockResolvedValue(authorized)
    mockEq.mockResolvedValue({ error: null })
    mockDelete.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ delete: mockDelete })
  })

  /** unauthorized request should return auth error */
  it('returns unauthorized when session is not valid', async () => {
    mockValidateSession.mockResolvedValue(unauthorized)

    const res = await DELETE(makeRequest('http://localhost/api/staff?staff_id=12345'))

    expect(res.status).toBe(401)
  })

  /** missing staff_id param should return 400 */
  it('returns 400 when staff_id is missing', async () => {
    const res = await DELETE(makeRequest('http://localhost/api/staff'))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('Staff ID is required')
  })

  /** successful delete should return success true */
  it('returns success true on successful delete', async () => {
    const res = await DELETE(makeRequest('http://localhost/api/staff?staff_id=12345'))
    const body = await res.json()

    expect(body.success).toBe(true)
  })

  /** db error should return 500 */
  it('returns 500 when database delete fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    mockEq.mockResolvedValue({ error: { message: 'delete failed' } })

    const res = await DELETE(makeRequest('http://localhost/api/staff?staff_id=12345'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Failed to delete staff member')

    consoleSpy.mockRestore()
  })
})

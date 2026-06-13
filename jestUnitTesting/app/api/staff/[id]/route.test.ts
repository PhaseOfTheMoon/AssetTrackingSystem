import { GET, PUT } from '@/app/api/staff/[id]/route'

const mockValidateSession = jest.fn()
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

const authorized = { authorized: true, response: null }
const unauthorized = {
  authorized: false,
  response: { json: async () => ({ error: 'Unauthorized' }), status: 401 },
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function makeRequest(body?: object) {
  return { json: async () => body } as any
}

function setupGetChain(result: any) {
  const single = jest.fn().mockResolvedValue(result)
  const eq = jest.fn().mockReturnValue({ single })
  const select = jest.fn().mockReturnValue({ eq })
  mockFrom.mockReturnValue({ select })
}

describe('GET /api/staff/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateSession.mockResolvedValue(authorized)
  })

  /** unauthorized request should return auth error */
  it('returns unauthorized when session is not valid', async () => {
    mockValidateSession.mockResolvedValue(unauthorized)

    const res = await GET(makeRequest(), makeParams('S001'))

    expect(res.status).toBe(401)
  })

  /** found staff record should return success true with data */
  it('returns staff data when found', async () => {
    const staffData = { staff_id: 'S001', name: 'Jun Zhen' }
    setupGetChain({ data: staffData, error: null })

    const res = await GET(makeRequest(), makeParams('S001'))
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(body.data).toEqual(staffData)
  })

  /** db error should return 400 with error message */
  it('returns 400 when db returns an error', async () => {
    setupGetChain({ data: null, error: { message: 'not found' } })

    const res = await GET(makeRequest(), makeParams('S999'))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error).toBe('not found')
  })

  /** unexpected error should return 500 */
  it('returns 500 on unexpected error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    mockFrom.mockImplementation(() => { throw new Error('crash') })

    const res = await GET(makeRequest(), makeParams('S001'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.success).toBe(false)

    consoleSpy.mockRestore()
  })
})

describe('PUT /api/staff/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateSession.mockResolvedValue(authorized)
  })

  /** unauthorized request should return auth error */
  it('returns unauthorized when session is not valid', async () => {
    mockValidateSession.mockResolvedValue(unauthorized)

    const res = await PUT(makeRequest({ name: 'New Name' }), makeParams('S001'))

    expect(res.status).toBe(401)
  })

  /** successful update should return success true with updated data */
  it('returns success true with updated data', async () => {
    const updatedData = { staff_id: 'S001', name: 'New Name' }
    const single = jest.fn().mockResolvedValue({ data: updatedData, error: null })
    const select = jest.fn().mockReturnValue({ single })
    const eq = jest.fn().mockReturnValue({ select })
    const update = jest.fn().mockReturnValue({ eq })
    mockFrom.mockReturnValue({ update })

    const res = await PUT(makeRequest({ name: 'New Name' }), makeParams('S001'))
    const body = await res.json()

    expect(body.success).toBe(true)
    expect(body.data).toEqual(updatedData)
  })

  /** staff_id in body should be stripped and not updated */
  it('removes staff_id from update data to prevent pk change', async () => {
    const single = jest.fn().mockResolvedValue({ data: { staff_id: 'S001', name: 'New Name' }, error: null })
    const select = jest.fn().mockReturnValue({ single })
    const eq = jest.fn().mockReturnValue({ select })
    const updateMock = jest.fn().mockReturnValue({ eq })
    mockFrom.mockReturnValue({ update: updateMock })

    await PUT(makeRequest({ staff_id: 'S999', name: 'New Name' }), makeParams('S001'))

    const updateCallArg = updateMock.mock.calls[0][0]
    expect(updateCallArg.staff_id).toBeUndefined()
    expect(updateCallArg.name).toBe('New Name')
  })

  /** db error should return 400 with error message */
  it('returns 400 when db returns an error', async () => {
    const single = jest.fn().mockResolvedValue({ data: null, error: { message: 'update failed' } })
    const select = jest.fn().mockReturnValue({ single })
    const eq = jest.fn().mockReturnValue({ select })
    const update = jest.fn().mockReturnValue({ eq })
    mockFrom.mockReturnValue({ update })

    const res = await PUT(makeRequest({ name: 'New Name' }), makeParams('S001'))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  /** unexpected error should return 500 */
  it('returns 500 on unexpected error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    const badRequest = { json: async () => { throw new Error('parse error') } } as any

    const res = await PUT(badRequest, makeParams('S001'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.success).toBe(false)

    consoleSpy.mockRestore()
  })
})

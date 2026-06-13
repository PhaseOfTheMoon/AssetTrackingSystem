import { GET, PUT } from '@/app/api/department/[id]/route'
import { validateSession } from '@/lib/apiAuth'

const mockSingle = jest.fn()
const mockEq = jest.fn(() => ({ single: mockSingle, select: jest.fn().mockReturnThis() }))
const mockSelect = jest.fn(() => ({ eq: mockEq }))
const mockUpdate = jest.fn(() => ({ eq: mockEq }))
const mockFrom = jest.fn(() => ({ select: mockSelect, update: mockUpdate }))

jest.mock('@/lib/supabase/server', () => ({
  get supabaseAdmin() {
    return { from: mockFrom }
  }
}))

jest.mock('@/lib/apiAuth', () => ({
  validateSession: jest.fn()
}))

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any, init?: any) => ({
      json: async () => body,
      status: init?.status ?? 200,
    })
  }
}))

function makeRequest(body: object) {
  return { json: async () => body } as any
}

describe('Department [id] API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default to an authorized admin session
    ;(validateSession as jest.Mock).mockResolvedValue({
      authorized: true,
      session: { user: { staffId: 'ADMIN123' } }
    })
  })

  describe('GET /api/department/[id]', () => {
    it('returns 401/403 if unauthorized', async () => {
      ;(validateSession as jest.Mock).mockResolvedValueOnce({
        authorized: false,
        response: { status: 401, json: async () => ({ error: 'Unauthorized' }) }
      })

      const res = await GET({} as any, { params: Promise.resolve({ id: 'IT-01' }) })
      expect(res.status).toBe(401)
    })

    it('returns department data successfully', async () => {
      mockSingle.mockResolvedValueOnce({ data: { department_id: 'IT-01', name: 'IT' }, error: null })

      const res = await GET({} as any, { params: Promise.resolve({ id: 'IT-01' }) })
      const body = await res.json()

      expect(body.success).toBe(true)
      expect(body.data.name).toBe('IT')
    })
  })

  describe('PUT /api/department/[id]', () => {
    it('returns 400 if validation fails (empty payload)', async () => {
      const res = await PUT(makeRequest({}), { params: Promise.resolve({ id: 'IT-01' }) })
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe('No valid fields to update')
    })

    it('updates department data successfully', async () => {
      mockSingle.mockResolvedValueOnce({ data: { department_id: 'IT-01', name: 'New Name' }, error: null })

      const res = await PUT(makeRequest({ name: 'New Name', level: 2 }), { params: Promise.resolve({ id: 'IT-01' }) })
      const body = await res.json()

      expect(body.success).toBe(true)
      expect(body.data.name).toBe('New Name')
    })
  })
})
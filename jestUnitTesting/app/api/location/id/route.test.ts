import { GET, PUT } from '@/app/api/location/[id]/route'
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

describe('Location [id] API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default to an authorized admin session
    ;(validateSession as jest.Mock).mockResolvedValue({
      authorized: true,
      session: { user: { staffId: 'ADMIN123' } }
    })
  })

  describe('GET /api/location/[id]', () => {
    it('returns 401/403 if unauthorized', async () => {
      ;(validateSession as jest.Mock).mockResolvedValueOnce({
        authorized: false,
        response: { status: 401, json: async () => ({ error: 'Unauthorized' }) }
      })

      const res = await GET({} as any, { params: Promise.resolve({ id: 'L-01' }) })
      
      expect(res.status).toBe(401)
    })

    it('returns location data successfully', async () => {
      mockSingle.mockResolvedValueOnce({ data: { location_id: 'L-01', name: 'Main Server Room' }, error: null })

      const res = await GET({} as any, { params: Promise.resolve({ id: 'L-01' }) })
      const body = await res.json()

      expect(body.success).toBe(true)
      expect(body.data.name).toBe('Main Server Room')
    })
  })

  describe('PUT /api/location/[id]', () => {
    it('returns 400 if validation fails due to empty payload', async () => {
      const res = await PUT(makeRequest({}), { params: Promise.resolve({ id: 'L-01' }) })
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.error).toBe('No valid fields to update')
    })

    it('updates location data successfully', async () => {
      mockSingle.mockResolvedValueOnce({ data: { location_id: 'L-01', name: 'Updated Room', level: 2 }, error: null })

      const res = await PUT(makeRequest({ name: 'Updated Room', level: 2 }), { params: Promise.resolve({ id: 'L-01' }) })
      const body = await res.json()

      expect(body.success).toBe(true)
      expect(body.data.name).toBe('Updated Room')
    })
  })
})
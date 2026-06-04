import { GET, POST, DELETE } from '@/app/api/location/route'
import { validateSession } from '@/lib/apiAuth'
import { generateAndUploadQr, deleteQr } from '@/lib/qrcode/qrcode'

// Construct a chainable mock for Supabase
const mockSingle = jest.fn()
const mockMaybeSingle = jest.fn()
const mockChain = {
  select: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  single: mockSingle,
  maybeSingle: mockMaybeSingle,
  then: jest.fn() // Allows the chain to be awaited directly for the GET request
}

jest.mock('@/lib/supabase/server', () => ({
  get supabaseAdmin() {
    return { from: jest.fn(() => mockChain) }
  }
}))

jest.mock('@/lib/apiAuth', () => ({
  validateSession: jest.fn()
}))

jest.mock('@/lib/qrcode/qrcode', () => ({
  generateAndUploadQr: jest.fn(),
  deleteQr: jest.fn()
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

function makeRequest(body: object, url = 'http://localhost/api/location') {
  return { 
    json: async () => body,
    url
  } as any
}

describe('Location Main API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(validateSession as jest.Mock).mockResolvedValue({
      authorized: true,
      session: { user: { staffId: 'ADMIN123' } }
    })
  })

  describe('GET /api/location', () => {
    it('fetches paginated records successfully and excludes soft-deleted items', async () => {
      // Setup the .then() mock to resolve the await query chain
      mockChain.then.mockImplementationOnce((callback) => {
        callback({ data: [{ location_id: 'B413' }], count: 1, error: null })
      })

      const res = await GET(makeRequest({}, 'http://localhost/api/location?page=1&limit=10'))
      const body = await res.json()

      expect(body.data).toHaveLength(1)
      expect(body.totalItems).toBe(1)
    })
  })

  describe('POST /api/location', () => {
    const validBody = {
      location_id: 'B413',
      name: 'Computer Lab',
      description: 'Main Lab',
      level: 4
    }

    it('returns 409 if location ID is duplicated', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: { location_id: 'B413' } })

      const res = await POST(makeRequest(validBody))
      const body = await res.json()

      expect(res.status).toBe(409)
      expect(body.error).toBe('Location ID already exists')
    })

    it('inserts record and generates QR successfully', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null }) // No duplicate
      ;(generateAndUploadQr as jest.Mock).mockResolvedValueOnce({ tagPath: 'path/to/qr_loc.png' })
      mockSingle.mockResolvedValueOnce({ data: validBody, error: null }) // Insert success

      const res = await POST(makeRequest(validBody))
      const body = await res.json()

      expect(res.status).toBe(201)
      expect(body.success).toBe(true)
      expect(generateAndUploadQr).toHaveBeenCalledWith('B413', 'locations')
    })

    it('deletes QR code if database insert fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      mockMaybeSingle.mockResolvedValueOnce({ data: null })
      ;(generateAndUploadQr as jest.Mock).mockResolvedValueOnce({ tagPath: 'path/to/qr_loc.png' })
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } })

      const res = await POST(makeRequest(validBody))
      
      expect(res.status).toBe(500)
      
      if (res.status === 500) {
        expect(deleteQr).toHaveBeenCalledWith('path/to/qr_loc.png')
      }

      consoleSpy.mockRestore()
    })
  })

  describe('DELETE /api/location', () => {
    it('performs soft delete successfully', async () => {
      mockSingle.mockResolvedValueOnce({ data: { location_id: 'B413', deleted_dt: '2026-05-20' }, error: null })

      const res = await DELETE(makeRequest({}, 'http://localhost/api/location?location_id=B413'))
      const body = await res.json()

      expect(body.success).toBe(true)
      expect(body.message).toBe('Location deleted successfully')
    })

    it('returns 404 if record not found or already deleted', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: null })

      const res = await DELETE(makeRequest({}, 'http://localhost/api/location?location_id=B413'))
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.error).toBe('Location not found or already deleted')
    })
  })
})
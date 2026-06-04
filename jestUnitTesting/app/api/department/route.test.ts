import { GET, POST, DELETE } from '@/app/api/department/route'
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

function makeRequest(body: object, url = 'http://localhost/api/department') {
  return { 
    json: async () => body,
    url
  } as any
}

describe('Department Main API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(validateSession as jest.Mock).mockResolvedValue({
      authorized: true,
      session: { user: { staffId: 'ADMIN123' } }
    })
  })

  describe('GET /api/department', () => {
    it('fetches paginated records successfully', async () => {
      // Setup the .then() mock to resolve the await query chain
      mockChain.then.mockImplementationOnce((callback) => {
        callback({ data: [{ department_id: 'HR' }], count: 1, error: null })
      })

      const res = await GET(makeRequest({}, 'http://localhost/api/department?page=1&limit=10'))
      const body = await res.json()

      expect(body.data).toHaveLength(1)
      expect(body.totalItems).toBe(1)
    })
  })

  describe('POST /api/department', () => {
    const validBody = {
      department_id: 'IT-01',
      name: 'Information Tech',
      level: 1
    }

    it('returns 409 if department ID is duplicated', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: { department_id: 'IT-01' } })

      const res = await POST(makeRequest(validBody))
      const body = await res.json()

      expect(res.status).toBe(409)
      expect(body.error).toBe('Department ID already exists')
    })

    it('inserts record and generates QR successfully', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null }) // No duplicate
      ;(generateAndUploadQr as jest.Mock).mockResolvedValueOnce({ tagPath: 'path/to/qr.png' })
      mockSingle.mockResolvedValueOnce({ data: validBody, error: null }) // Insert success

      const res = await POST(makeRequest(validBody))
      const body = await res.json()

      expect(body.success).toBe(true)
      expect(generateAndUploadQr).toHaveBeenCalledWith('IT-01', 'departments')
    })

    it('deletes QR code if database insert fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      mockMaybeSingle.mockResolvedValueOnce({ data: null })
      ;(generateAndUploadQr as jest.Mock).mockResolvedValueOnce({ tagPath: 'path/to/qr.png' })
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } })

      const res = await POST(makeRequest(validBody))
      
      expect(res.status).toBe(500)
      
      if (res.status === 500) {
        expect(deleteQr).toHaveBeenCalledWith('path/to/qr.png')
      }

      consoleSpy.mockRestore()
    })
  })

  describe('DELETE /api/department', () => {
    it('performs soft delete successfully', async () => {
      mockSingle.mockResolvedValueOnce({ data: { department_id: 'IT-01', deleted_dt: '2026-05-20' }, error: null })

      const res = await DELETE(makeRequest({}, 'http://localhost/api/department?department_id=IT-01'))
      const body = await res.json()

      expect(body.success).toBe(true)
      expect(body.message).toBe('Department deleted successfully')
    })

    it('returns 404 if record not found or already deleted', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: null })

      const res = await DELETE(makeRequest({}, 'http://localhost/api/department?department_id=IT-01'))
      const body = await res.json()

      expect(res.status).toBe(404)
      expect(body.error).toBe('Department not found or already deleted')
    })
  })
})
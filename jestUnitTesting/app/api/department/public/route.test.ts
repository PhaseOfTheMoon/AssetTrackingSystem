import { GET } from '@/app/api/department/public/route'
import { NextResponse } from 'next/server'

const mockOrder = jest.fn()
const mockSelect = jest.fn(() => ({ order: mockOrder }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

jest.mock('@/lib/supabase/server', () => ({
  get supabaseAdmin() {
    return { from: mockFrom }
  }
}))

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({
      json: async () => body,
      status: init?.status ?? 200,
    })
  }
}))

describe('GET /api/department/public', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns a list of departments successfully', async () => {
    const mockData = [
      { department_id: 'IT', name: 'Information Technology' },
      { department_id: 'HR', name: 'Human Resources' }
    ]

    mockOrder.mockResolvedValueOnce({ data: mockData, error: null })

    const res = await GET()
    const body = await res.json()

    expect(body.data).toHaveLength(2)
    expect(body.data[0].department_id).toBe('IT')
  })

  it('returns 500 when database fetch fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'DB Error' } })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('Failed to fetch departments')

    consoleSpy.mockRestore()
  })
})
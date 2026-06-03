// mock NextAuth so it doesnt try to set up real oauth
jest.mock('next-auth', () => {
  const handler = jest.fn().mockResolvedValue({ status: 200 })
  return jest.fn().mockReturnValue(handler)
})

// mock the auth options so we dont need real azure credentials
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: (body: any, init?: any) => ({ json: async () => body, status: init?.status ?? 200 }),
  },
}))

import { GET, POST } from '@/app/api/auth/[...nextauth]/route'
import NextAuth from 'next-auth'

describe('GET and POST /api/auth/[...nextauth]', () => {
  /** GET handler should be exported and be a function */
  it('exports GET as a function', () => {
    expect(typeof GET).toBe('function')
  })

  /** POST handler should be exported and be a function */
  it('exports POST as a function', () => {
    expect(typeof POST).toBe('function')
  })

  /** GET and POST should be the same nextauth handler */
  it('GET and POST are the same handler', () => {
    expect(GET).toBe(POST)
  })

  /** NextAuth should be called once with authOptions to create the handler */
  it('NextAuth is called with authOptions to create the handler', () => {
    expect(NextAuth).toHaveBeenCalledWith({})
  })
})

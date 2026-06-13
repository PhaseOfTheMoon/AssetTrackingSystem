import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ScannerPage from '@/app/(app)/user/scanner/page'
import { useAuth } from '@/hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

// Mock the Auth Hook
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn()
}))

// Mock Next.js Navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn()
}))

// Mock the Scanner Content with a proper input state to satisfy TypeScript
jest.mock('@/components/scanner/scannerContext', () => {
  const { useState } = require('react')
  
  return function MockScannerContent({ onItemScanned, children }: any) {
    const [scanValue, setScanValue] = useState('')
    
    return (
      <div data-testid="mock-scanner">
        <input 
          data-testid="scan-input" 
          onChange={(e) => setScanValue(e.target.value)} 
        />
        <button 
          data-testid="simulate-scan-btn" 
          onClick={() => onItemScanned({ code: scanValue })}
        >
          Scan
        </button>
        {children}
      </div>
    )
  }
})

jest.mock('@/components/scanner/successContent', () => {
  return function MockSuccess() {
    return <div data-testid="mock-success">Success Page</div>
  }
})

jest.mock('@/components/scanner/confirmationContext', () => {
  return function MockConfirmation() {
    return <div data-testid="mock-confirmation">Confirmation Page</div>
  }
})

describe('ScannerPage', () => {
  const mockPush = jest.fn()
  const mockReplace = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    // Default Router Mock
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace
    })

    // Default Auth Mock (Authenticated)
    ;(useAuth as jest.Mock).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      session: { staffId: 'ADMIN123' }
    })

    // Default Search Params (Normal Asset Scan)
    ;(useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => {
        if (key === 'type') {
          return 'asset'
        }
        return null
      }
    })

    // Default Fetch Mock
    global.fetch = jest.fn()
  })

  it('renders nothing when authentication is loading', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      isLoading: true,
      isAuthenticated: false
    })

    const { container } = render(<ScannerPage />)

    expect(container).toBeEmptyDOMElement()
  })

  it('renders the scanner interface for a standard asset scan', () => {
    render(<ScannerPage />)

    expect(screen.getByTestId('mock-scanner')).toBeInTheDocument()
  })

  it('automatically fetches and applies QR context when scanLocation param is present', async () => {
    ;(useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => {
        if (key === 'type') {
          return 'location'
        }
        if (key === 'scanLocation') {
          return 'B403'
        }
        return null
      }
    })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { location_id: 'B403', name: 'Computer Lab' }
      })
    })

    render(<ScannerPage />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('scannedCode=B403'))
    })
  })

  it('shows an error modal if a scanned staff ID does not exist', async () => {
    ;(useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => {
        if (key === 'type') {
          return 'staff'
        }
        return null
      }
    })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: 'Not found'
      })
    })

    render(<ScannerPage />)

    // Type safely using the input field instead of the button property
    const input = screen.getByTestId('scan-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'INVALID_STAFF' } })
    
    const scanBtn = screen.getByTestId('simulate-scan-btn')
    fireEvent.click(scanBtn)

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText(/Staff ID not found/i)).toBeInTheDocument()
    })
  })

  it('opens the staff confirmation modal when a valid staff ID is scanned', async () => {
    ;(useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => {
        if (key === 'type') {
          return 'staff'
        }
        return null
      }
    })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { staff_id: '10277', name: 'Daryl Lim' }
      })
    })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        count: 2
      })
    })

    render(<ScannerPage />)

    const input = screen.getByTestId('scan-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: '10277' } })
    
    const scanBtn = screen.getByTestId('simulate-scan-btn')
    fireEvent.click(scanBtn)

    await waitFor(() => {
      expect(screen.getByText('Staff Confirmed')).toBeInTheDocument()
      expect(screen.getByText('Daryl Lim')).toBeInTheDocument()
      expect(screen.getByText(/Currently owns 2 asset/i)).toBeInTheDocument()
    })
  })

  it('prevents adding the same asset to the cart twice', async () => {
    ;(useSearchParams as jest.Mock).mockReturnValue({
      get: (key: string) => {
        if (key === 'type') {
          return 'location'
        }
        if (key === 'scanLocation') {
          return 'B403'
        }
        return null
      }
    })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { location_id: 'B403', name: 'Computer Lab' }
      })
    })

    render(<ScannerPage />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { asset_id: 'LAPTOP-01', name: 'Dell XPS' }
      })
    })

    const input = screen.getByTestId('scan-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'LAPTOP-01' } })
    
    const scanBtn = screen.getByTestId('simulate-scan-btn')
    fireEvent.click(scanBtn)

    await waitFor(() => {
      expect(screen.getByText('Dell XPS')).toBeInTheDocument()
    })

    // Click scan again with the SAME asset ID currently in the input
    fireEvent.click(scanBtn)

    await waitFor(() => {
      expect(screen.getByText(/already in cart/i)).toBeInTheDocument()
    })
  })

  it('transitions to confirmation page for normal asset scans', async () => {
    render(<ScannerPage />)

    const input = screen.getByTestId('scan-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'NEW-LAPTOP-02' } })
    
    const scanBtn = screen.getByTestId('simulate-scan-btn')
    fireEvent.click(scanBtn)

    await waitFor(() => {
      expect(screen.getByTestId('mock-confirmation')).toBeInTheDocument()
    })
  })
})
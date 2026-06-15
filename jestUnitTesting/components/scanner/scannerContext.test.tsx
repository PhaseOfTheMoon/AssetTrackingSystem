import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import ScannerContext from '@/components/scanner/scannerContext'
import '@testing-library/jest-dom'

// ----------------------------------------------------
// Mocks
// ----------------------------------------------------
const mockStart = jest.fn()
const mockStop = jest.fn()
const mockClear = jest.fn()

let triggerScanSuccess: (text: string, result: any) => void

jest.mock('html5-qrcode', () => ({
  Html5Qrcode: jest.fn().mockImplementation(() => ({
    // Fix: Intercept the 3rd argument passed by the component (onScanSuccess)
    start: mockStart.mockImplementation((_cameraId, _configuration, successCb) => {
      triggerScanSuccess = successCb
      return Promise.resolve()
    }),
    stop: mockStop.mockResolvedValue(undefined),
    clear: mockClear,
    isScanning: true
  }))
}))

window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined)

describe('ScannerContext Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // TEST 1: Initial State
  it('shows the placeholder initially', () => {
    render(
      <ScannerContext
        title="Asset Scanner"
        description="Scan stuff"
        icon={() => <svg />}
        onItemScanned={jest.fn()}
        onBack={jest.fn()}
        parentScan={null}
        onCancel={jest.fn()}
      />
    )

    expect(screen.getByText(/Scan Asset/i)).toBeInTheDocument()
    expect(screen.getByText('Position the code within the frame')).toBeInTheDocument()
  })

  // TEST 2: Starting the Scanner
  it('initializes scanner when clicked', async () => {
    render(
      <ScannerContext
        title="Asset Scanner"
        description="Scan stuff"
        icon={() => <svg />}
        onItemScanned={jest.fn()}
        onBack={jest.fn()}
        parentScan={null}
        onCancel={jest.fn()}
      />
    )

    fireEvent.click(screen.getByText(/Scan Asset/i))

    expect(mockStart).toHaveBeenCalled()
    expect(screen.getByText('Stop Scanning')).toBeInTheDocument()
  })

  // TEST 3: Completing a Scan
  it('calls onItemScanned when a code is detected', async () => {
    const mockOnItemScanned = jest.fn()

    render(
      <ScannerContext
        title="Asset Scanner"
        description="Scan stuff"
        icon={() => <svg />}
        onItemScanned={mockOnItemScanned}
        onBack={jest.fn()}
        parentScan={null}
        onCancel={jest.fn()}
      />
    )

    fireEvent.click(screen.getByText(/Scan Asset/i))

    // Wait for the async effect hook to spin up Html5Qrcode and bind the reference
    await waitFor(() => {
      expect(triggerScanSuccess).toBeDefined()
    })

    // Simulate the camera reading a valid code array hook cleanly
    await act(async () => {
      triggerScanSuccess('SCANNED-CODE-123', {})
    })

    expect(mockOnItemScanned).toHaveBeenCalled()
    const calledArg = mockOnItemScanned.mock.calls[0][0]
    expect(calledArg.code).toBe('SCANNED-CODE-123')
  })

  // TEST 4: Parent Scan Logic (The Tagging UI)
  it('updates UI when parentScan is provided', () => {
    const parentInfo = { type: 'location', id: 'L001', name: 'Warehouse' }

    render(
      <ScannerContext
        title="Asset Scanner"
        description="Scan stuff"
        icon={() => <svg />}
        onItemScanned={jest.fn()}
        onBack={jest.fn()}
        parentScan={parentInfo}
        onCancel={jest.fn()}
      />
    )

    expect(screen.getByText('Now Scan an Asset')).toBeInTheDocument()
    expect(screen.getByText('Warehouse')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })
})
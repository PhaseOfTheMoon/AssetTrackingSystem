import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToastProvider, useToast } from '@/components/ui/toast'

jest.mock('@heroicons/react/24/outline', () => ({
  CheckCircleIcon: () => <svg data-testid="check-icon" />,
  XCircleIcon: () => <svg data-testid="x-circle-icon" />,
  ExclamationCircleIcon: () => <svg data-testid="warning-icon" />,
  XMarkIcon: () => <svg data-testid="x-mark-icon" />
}))

// helper component that exposes showToast to the test
function TestComponent() {
  const { showToast } = useToast()
  return (
    <>
      <button onClick={() => showToast('Success message', 'success')}>Show Success</button>
      <button onClick={() => showToast('Error message', 'error')}>Show Error</button>
      <button onClick={() => showToast('Warning message', 'warning')}>Show Warning</button>
    </>
  )
}

describe('ToastProvider', () => {
  it('renders its children', () => {
    render(
      <ToastProvider>
        <div data-testid="child">Hello</div>
      </ToastProvider>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  // success toast should appear with the correct message
  it('shows a success toast when showToast is called', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
    await act(async () => {
      fireEvent.click(screen.getByText('Show Success'))
    })
    expect(screen.getByText('Success message')).toBeInTheDocument()
  })

  // error toast should appear with the correct message
  it('shows an error toast when showToast is called with error type', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
    await act(async () => {
      fireEvent.click(screen.getByText('Show Error'))
    })
    expect(screen.getByText('Error message')).toBeInTheDocument()
  })

  // warning toast should appear with the correct message
  it('shows a warning toast when showToast is called with warning type', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
    await act(async () => {
      fireEvent.click(screen.getByText('Show Warning'))
    })
    expect(screen.getByText('Warning message')).toBeInTheDocument()
  })

  // clicking the close button should remove the toast from the DOM
  it('dismisses the toast when the close button is clicked', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
    await act(async () => {
      fireEvent.click(screen.getByText('Show Success'))
    })
    expect(screen.getByText('Success message')).toBeInTheDocument()

    await act(async () => {
      const xIcon = screen.getByTestId('x-mark-icon')
      fireEvent.click(xIcon.closest('button')!)
    })
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()
  })

  // the toast should auto-dismiss after 3 seconds
  it('auto-dismisses the toast after 3 seconds', () => {
    jest.useFakeTimers()
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )
    act(() => {
      fireEvent.click(screen.getByText('Show Success'))
    })
    expect(screen.getByText('Success message')).toBeInTheDocument()

    // advance past the 3000ms auto-dismiss timer
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(screen.queryByText('Success message')).not.toBeInTheDocument()

    jest.useRealTimers()
  })
})

describe('useToast', () => {
  // useToast must be called inside ToastProvider, otherwise it should throw
  it('throws an error when used outside ToastProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

    function BadComponent() {
      useToast()
      return null
    }

    expect(() => render(<BadComponent />)).toThrow(
      'useToast must be used within a ToastProvider'
    )
    spy.mockRestore()
  })
})

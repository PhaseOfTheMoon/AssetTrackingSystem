// Commented by Irene
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ApprovalsPage from '@/app/(app)/admin/staff/approvals/page';
import { useAdminAccess } from '@/hooks/useAdminAccess';

// fake out dependencies so we control them in tests
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn(),
}));

// simple breadcrumb mock — just renders the label text
jest.mock('@/components/ui/breadcrumb', () => {
  return function MockBreadcrumb({ customItems }: any) {
    return (
      <div data-testid="breadcrumb">
        {customItems.map((item: any, index: number) => (
          <span key={index}>{item.label}</span>
        ))}
      </div>
    );
  };
});

// replace heroicons with plain SVGs so we don't need the real icon library
jest.mock('@heroicons/react/24/outline', () => ({
  CheckCircleIcon: () => <svg data-testid="check-icon">Check</svg>,
  XCircleIcon: () => <svg data-testid="x-icon">X</svg>,
  ClockIcon: () => <svg data-testid="clock-icon">Clock</svg>,
  ArrowPathIcon: ({ className }: any) => <svg data-testid="refresh-icon" className={className}>Refresh</svg>,
}));

// mock fetch, alert, and confirm so tests can control and spy on them
global.fetch = jest.fn();
global.alert = jest.fn();
global.confirm = jest.fn();

describe('ApprovalsPage', () => {
  const mockPush = jest.fn();
  const mockSession = {
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
  };

  // sample data for the 3 different staff statuses
  const mockPendingStaff = [
    {
      staff_id: 'S001',
      name: 'Pending User',
      email: 'pending@example.com',
      mobile_no: '0123456789',
      department_id: 'IT',
      status: 'pending',
      created_dt: '2024-01-01T10:00:00.000Z',
    },
  ];

  const mockApprovedStaff = [
    {
      staff_id: 'S002',
      name: 'Approved User',
      email: 'approved@example.com',
      mobile_no: '0987654321',
      department_id: 'HR',
      status: 'approved',
      created_dt: '2024-01-02T10:00:00.000Z',
    },
  ];

  const mockRejectedStaff = [
    {
      staff_id: 'S003',
      name: 'Rejected User',
      email: 'rejected@example.com',
      mobile_no: '0111111111',
      department_id: 'Finance',
      status: 'rejected',
      created_dt: '2024-01-03T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  // show "Loading..." while the session is still being fetched
  it('shows loading state when session is loading', () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: null,
      isLoading: true,
    });

    render(<ApprovalsPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders approvals page with tabs', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) });

    await act(async () => {
      render(<ApprovalsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Staff Registration Approvals')).toBeInTheDocument();
      expect(screen.getByText(/Pending \(0\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Approved \(0\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Rejected \(0\)/i)).toBeInTheDocument();
    });
  });

  it('fetches and displays pending staff', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: mockPendingStaff }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) });

    await act(async () => {
      render(<ApprovalsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Pending User')).toBeInTheDocument();
      expect(screen.getByText('pending@example.com')).toBeInTheDocument();
      expect(screen.getByText(/Pending \(1\)/i)).toBeInTheDocument();
    });
  });

  it('switches to approved tab and displays approved staff', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: mockApprovedStaff }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) });

    await act(async () => {
      render(<ApprovalsPage />);
    });

    await waitFor(() => expect(screen.getByText(/Approved \(1\)/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Approved \(1\)/i));

    await waitFor(() => {
      expect(screen.getByText('Approved User')).toBeInTheDocument();
      expect(screen.getByText('approved@example.com')).toBeInTheDocument();
    });
  });

  it('switches to rejected tab and displays rejected staff', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: mockRejectedStaff }) });

    await act(async () => {
      render(<ApprovalsPage />);
    });

    await waitFor(() => expect(screen.getByText(/Rejected \(1\)/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Rejected \(1\)/i));

    await waitFor(() => {
      expect(screen.getByText('Rejected User')).toBeInTheDocument();
      expect(screen.getByText('rejected@example.com')).toBeInTheDocument();
    });
  });

  it('shows approve and reject buttons on pending tab', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: mockPendingStaff }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) });

    await act(async () => {
      render(<ApprovalsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });
  });

  it('handles approve button click with confirmation', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: mockPendingStaff }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) });

    (global.confirm as jest.Mock).mockReturnValue(true);

    await act(async () => {
      render(<ApprovalsPage />);
    });

    await waitFor(() => {
      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);
    });

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to approve this registration?');
      expect(global.alert).toHaveBeenCalledWith('Staff member approved successfully!');
    });
  });

  it('handles reject button click with confirmation', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: mockPendingStaff }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) });

    (global.confirm as jest.Mock).mockReturnValue(true);

    await act(async () => {
      render(<ApprovalsPage />);
    });

    await waitFor(() => {
      const rejectButton = screen.getByText('Reject');
      fireEvent.click(rejectButton);
    });

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to reject this registration?');
      expect(global.alert).toHaveBeenCalledWith('Staff member rejected successfully!');
    });
  });

  it('cancels approve when user clicks cancel on confirmation', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: mockPendingStaff }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) });

    (global.confirm as jest.Mock).mockReturnValue(false);

    await act(async () => {
      render(<ApprovalsPage />);
    });

    await waitFor(() => {
      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);
    });

    expect(global.confirm).toHaveBeenCalled();
    expect(global.alert).not.toHaveBeenCalled();
  });

  it('handles API error during approval', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: mockPendingStaff }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: false, error: 'Database error' }) });

    (global.confirm as jest.Mock).mockReturnValue(true);

    await act(async () => {
      render(<ApprovalsPage />);
    });

    await waitFor(() => {
      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Error: Database error');
    });
  });

  it('handles API error during rejection', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: mockPendingStaff }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: false, error: 'Database error' }) });

    (global.confirm as jest.Mock).mockReturnValue(true);

    await act(async () => {
      render(<ApprovalsPage />);
    });

    await waitFor(() => {
      const rejectButton = screen.getByText('Reject');
      fireEvent.click(rejectButton);
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Error: Database error');
    });
  });

  it('handles network error during approval', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: mockPendingStaff }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockRejectedValueOnce(new Error('Network error'));

    (global.confirm as jest.Mock).mockReturnValue(true);

    await act(async () => {
      render(<ApprovalsPage />);
    });

    await waitFor(() => {
      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Failed to approve staff member');
      expect(consoleError).toHaveBeenCalled();
    });

    consoleError.mockRestore();
  });

  it('refreshes all staff lists when refresh button is clicked', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) });

    await act(async () => {
      render(<ApprovalsPage />);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    // Add new mock responses for refresh
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: mockPendingStaff }) });
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) });
    (global.fetch as jest.Mock).mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) });

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });

    await act(async () => {
      fireEvent.click(refreshButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(6);
      expect(screen.getByText(/Pending \(1\)/i)).toBeInTheDocument();
    }, { timeout: 15000 });
  }, 20000);

  it('shows empty state messages for each tab', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) });

    await act(async () => {
      render(<ApprovalsPage />);
    });

    // Pending tab empty state
    await waitFor(() => {
      expect(screen.getByText('No pending registrations')).toBeInTheDocument();
    }, { timeout: 15000 });

    // Approved tab empty state
    const approvedTab = screen.getByText(/Approved \(0\)/i);
    await act(async () => {
      fireEvent.click(approvedTab);
    });

    await waitFor(() => {
      expect(screen.getByText('No approved staff')).toBeInTheDocument();
    }, { timeout: 15000 });

    // Rejected tab empty state
    const rejectedTab = screen.getByText(/Rejected \(0\)/i);
    await act(async () => {
      fireEvent.click(rejectedTab);
    });

    await waitFor(() => {
      expect(screen.getByText('No rejected registrations')).toBeInTheDocument();
    }, { timeout: 15000 });
  }, 20000);

  // dates should be formatted consistently regardless of the test runner's locale
  it('formats dates correctly', async () => {
    const localeStub = jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('1 Jan 2024');

    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: mockPendingStaff }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) });

    await act(async () => {
      render(<ApprovalsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('1 Jan 2024')).toBeInTheDocument();
    }, { timeout: 15000 });

    localeStub.mockRestore();
  }, 20000);

  it('renders breadcrumb with correct items', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) });

    await act(async () => {
      render(<ApprovalsPage />);
    });

    const breadcrumb = screen.getByTestId('breadcrumb');
    expect(breadcrumb).toBeInTheDocument();
    expect(breadcrumb).toHaveTextContent('Home');
    expect(breadcrumb).toHaveTextContent('Staff');
    expect(breadcrumb).toHaveTextContent('Approvals');
  });

  it('disables buttons while processing', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session: mockSession,
      isLoading: false,
    });

    // Keep a reference so we can settle the promise at the end and avoid memory leaks
    let resolveRequest!: (value: any) => void;
    const pendingRequest = new Promise<any>(resolve => { resolveRequest = resolve });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: mockPendingStaff }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockResolvedValueOnce({ json: () => Promise.resolve({ success: true, staff: [] }) })
      .mockReturnValueOnce(pendingRequest);

    (global.confirm as jest.Mock).mockReturnValue(true);

    await act(async () => {
      render(<ApprovalsPage />);
    });

    await waitFor(() => {
      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);
    });

    // Buttons should be disabled during processing
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const actionButtons = buttons.filter(btn =>
        btn.textContent === 'Approve' || btn.textContent === 'Reject'
      );
      actionButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    }, { timeout: 15000 });

    // Settle the pending request so React does not warn about unmounted state updates
    resolveRequest({ json: () => Promise.resolve({ success: true }) });
  }, 20000);
});

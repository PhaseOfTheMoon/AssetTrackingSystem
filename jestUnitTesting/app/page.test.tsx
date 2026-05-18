import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import LoginClient from '@/app/(auth)/login/loginClient';

// mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
}));

// mock the toast hook
jest.mock('@/components/ui/Toast', () => ({
  useToast: jest.fn(),
}));

describe('LoginClient', () => {
  const mockPush = jest.fn();
  const mockShowToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });

    // clear sessionStorage between tests
    sessionStorage.clear();
  });

  it('renders login page with Microsoft sign in button', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' });

    render(<LoginClient />);

    expect(screen.getByText('Asset Tracking System')).toBeInTheDocument();
    expect(screen.getByText('Sign in with Microsoft')).toBeInTheDocument();
    expect(screen.getByText('Register for Access')).toBeInTheDocument();
  });

  // status='loading' means NextAuth is still checking — show spinner not the sign-in button
  it('shows loading spinner when session status is loading', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'loading' });

    render(<LoginClient />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Sign in with Microsoft')).not.toBeInTheDocument();
  });

  it('renders registration link pointing to /register', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' });

    render(<LoginClient />);

    const registerLink = screen.getByText('Register for Access');
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
  });

  it('calls signIn with azure-ad when the Microsoft button is clicked', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' });

    render(<LoginClient />);

    fireEvent.click(screen.getByText('Sign in with Microsoft'));

    expect(signIn).toHaveBeenCalledWith('azure-ad');
  });

  it('redirects admin to /admin/dashboard after login', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Admin', email: 'admin@example.com', role: 'admin' } },
      status: 'authenticated',
    });

    await act(async () => {
      render(<LoginClient />);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/admin/dashboard');
    });
  });

  it('redirects staff to /user/dashboard after login', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Staff', email: 'staff@example.com', role: 'staff' } },
      status: 'authenticated',
    });

    await act(async () => {
      render(<LoginClient />);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/user/dashboard');
    });
  });

  // dashboard reads this flag to show the welcome toast after redirect
  it('stores loginSuccess in sessionStorage before redirecting', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Admin', email: 'admin@example.com', role: 'admin' } },
      status: 'authenticated',
    });

    await act(async () => {
      render(<LoginClient />);
    });

    await waitFor(() => {
      expect(sessionStorage.getItem('loginSuccess')).toBe('true');
    });
  });

  it('does not redirect when status is unauthenticated', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' });

    render(<LoginClient />);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows warning toast for pending accounts', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Pending', email: 'pending@example.com', role: 'pending' } },
      status: 'authenticated',
    });

    await act(async () => {
      render(<LoginClient />);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Your account is pending admin approval',
        'warning'
      );
    });

    // should NOT redirect
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows error toast for rejected accounts', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Rejected', email: 'rejected@example.com', role: 'rejected' } },
      status: 'authenticated',
    });

    await act(async () => {
      render(<LoginClient />);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Your account has been rejected',
        'error'
      );
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows warning toast for unregistered accounts', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Unknown', email: 'unknown@example.com', role: 'unregistered' } },
      status: 'authenticated',
    });

    await act(async () => {
      render(<LoginClient />);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Your account is not registered in the system. Please register for access',
        'warning'
      );
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  // useRef guard prevents the redirect effect from running more than once
  it('does not redirect a second time if the component re-renders', async () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Admin', email: 'admin@example.com', role: 'admin' } },
      status: 'authenticated',
    });

    const { rerender } = await act(async () => render(<LoginClient />));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    // rerender with same props — push should still only have been called once
    await act(async () => {
      rerender(<LoginClient />);
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});

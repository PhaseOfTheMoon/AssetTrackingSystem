import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import UnauthorisedPage from '@/app/(app)/unauthorized/page';

// mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

// mock heroicons so the SVG doesn't cause issues in jsdom
jest.mock('@heroicons/react/24/outline', () => ({
  ShieldExclamationIcon: () => <svg data-testid="shield-icon" />,
}));

describe('UnauthorisedPage', () => {
  const mockPush = jest.fn();
  const mockBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: mockBack });
    (signOut as jest.Mock).mockResolvedValue(undefined);
  });

  it('renders Access Denied heading and description', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null });

    render(<UnauthorisedPage />);

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText(/You don't have permission to access this page/i)).toBeInTheDocument();
    expect(screen.getByText(/This page is restricted to administrators only/i)).toBeInTheDocument();
  });

  // always visible — every user needs a way out
  it('always renders the Go Back button', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null });

    render(<UnauthorisedPage />);

    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });

  it('always renders the Return to Login button', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null });

    render(<UnauthorisedPage />);

    expect(screen.getByText('Return to Login')).toBeInTheDocument();
  });

  it('shows Go to Your Dashboard button for role staff', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { role: 'staff' } },
    });

    render(<UnauthorisedPage />);

    expect(screen.getByText('Go to Your Dashboard')).toBeInTheDocument();
  });

  // admins shouldn't reach this page — no dashboard shortcut for them
  it('does not show Go to Your Dashboard button for role admin', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { role: 'admin' } },
    });

    render(<UnauthorisedPage />);

    expect(screen.queryByText('Go to Your Dashboard')).not.toBeInTheDocument();
  });

  it('does not show Go to Your Dashboard button for role pending', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { role: 'pending' } },
    });

    render(<UnauthorisedPage />);

    expect(screen.queryByText('Go to Your Dashboard')).not.toBeInTheDocument();
  });

  it('does not show Go to Your Dashboard button when there is no session', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null });

    render(<UnauthorisedPage />);

    expect(screen.queryByText('Go to Your Dashboard')).not.toBeInTheDocument();
  });

  it('calls router.back() when Go Back is clicked', () => {
    (useSession as jest.Mock).mockReturnValue({ data: null });

    render(<UnauthorisedPage />);

    fireEvent.click(screen.getByText('Go Back'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to /user/dashboard when Go to Your Dashboard is clicked', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { role: 'staff' } },
    });

    render(<UnauthorisedPage />);

    fireEvent.click(screen.getByText('Go to Your Dashboard'));

    expect(mockPush).toHaveBeenCalledWith('/user/dashboard');
  });

  it('calls signOut with callbackUrl /login when Return to Login is clicked', async () => {
    (useSession as jest.Mock).mockReturnValue({ data: null });

    render(<UnauthorisedPage />);

    fireEvent.click(screen.getByText('Return to Login'));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/login' });
    });
  });
});

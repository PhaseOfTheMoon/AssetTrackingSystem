import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import ProfilePage from '@/app/(app)/profile/page';

// mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// mock next-auth/react — useSession is called directly by the page for field display
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// mock useAuth — controls the isLoading / isAuthenticated gate
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// mock Breadcrumb so we can assert on items without rendering the real component
jest.mock('@/components/ui/Breadcrumb', () => {
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

// mock fetch and alert
global.fetch = jest.fn();
global.alert = jest.fn();

// fully-populated session user matching what the page reads from session?.user
const mockSessionUser = {
  name: 'Jun Zhen Wong',
  email: 'junzhen@swin.edu.my',
  staffId: 'S001',
  mobileNo: '0123456789',
  departmentId: 'IT',
};

describe('ProfilePage', () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, replace: mockReplace });
  });

  it('renders nothing while auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: true, isAuthenticated: false });
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'loading' });
    // fetch never needed — resolve to avoid warnings
    (global.fetch as jest.Mock).mockResolvedValue({ json: () => Promise.resolve({ success: true, assets: [] }) });

    const { container } = render(<ProfilePage />);

    expect(container).toBeEmptyDOMElement();
  });

  // useAuth handles the redirect internally — page just returns null
  it('renders nothing when user is not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: false });
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' });
    (global.fetch as jest.Mock).mockResolvedValue({ json: () => Promise.resolve({ success: true, assets: [] }) });

    const { container } = render(<ProfilePage />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the profile page when authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    await act(async () => { render(<ProfilePage />); });

    expect(screen.getByText('User Profile')).toBeInTheDocument();
  });

  it('displays all user fields from the session', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    await act(async () => { render(<ProfilePage />); });

    expect(screen.getByText('Jun Zhen Wong')).toBeInTheDocument();
    expect(screen.getByText('junzhen@swin.edu.my')).toBeInTheDocument();
    expect(screen.getByText('S001')).toBeInTheDocument();
    expect(screen.getByText('0123456789')).toBeInTheDocument();
    expect(screen.getByText('IT')).toBeInTheDocument();
  });

  it('shows N/A for missing optional fields', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    // staffId is missing so no asset fetch will happen either
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    await act(async () => { render(<ProfilePage />); });

    // email, staffId, mobileNo, departmentId are all missing — each shows N/A
    const naItems = screen.getAllByText('N/A');
    expect(naItems.length).toBeGreaterThanOrEqual(4);
  });

  it('shows Loading... in fields while NextAuth session status is loading', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({ data: null, status: 'loading' });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    render(<ProfilePage />);

    // 5 fields total — name, email, staffId, mobileNo, departmentId
    const loadingItems = screen.getAllByText('Loading...');
    expect(loadingItems.length).toBe(5);
  });

  it('renders breadcrumb with Home and Profile', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    await act(async () => { render(<ProfilePage />); });

    const breadcrumb = screen.getByTestId('breadcrumb');
    expect(breadcrumb).toHaveTextContent('Home');
    expect(breadcrumb).toHaveTextContent('Profile');
  });

  it('shows Loading assets... while the fetch is in progress', () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    // never resolves so the loading state stays visible
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<ProfilePage />);

    expect(screen.getByText('Loading assets...')).toBeInTheDocument();
  });

  it('shows no assets message when API returns empty list', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    await act(async () => { render(<ProfilePage />); });

    await waitFor(() => {
      expect(screen.getByText('No assets assigned yet')).toBeInTheDocument();
    });
  });

  it('does not fetch assets when staffId is missing from session', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'No ID User' } }, // no staffId
      status: 'authenticated',
    });

    await act(async () => { render(<ProfilePage />); });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls POST /api/staff/assets with the correct staffId', async () => {
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: [] }),
    });

    await act(async () => { render(<ProfilePage />); });

    expect(global.fetch).toHaveBeenCalledWith('/api/staff/assets', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ staffId: 'S001' }),
    }));
  });

  it('handles fetch error gracefully and stops loading', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    await act(async () => { render(<ProfilePage />); });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching assets:', expect.any(Error));
      // loading state should be gone — no more "Loading assets..." spinner
      expect(screen.queryByText('Loading assets...')).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('renders asset name and category for fetched assets', async () => {
    const mockAssets = [
      { id: 1, asset_id: 'A001', asset: { name: 'Dell Laptop', asset_id: 'A001', category: 'Computer' } },
      { id: 2, asset_id: 'A002', asset: { name: 'Samsung Monitor', asset_id: 'A002', category: 'Display' } },
    ];

    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => { render(<ProfilePage />); });

    await waitFor(() => {
      expect(screen.getByText('Dell Laptop')).toBeInTheDocument();
      expect(screen.getByText('Samsung Monitor')).toBeInTheDocument();
      expect(screen.getByText(/Computer/)).toBeInTheDocument();
      expect(screen.getByText(/Display/)).toBeInTheDocument();
    });
  });

  it('shows Unknown Asset and N/A when asset data is null', async () => {
    const mockAssets = [{ id: 1, asset_id: 'A001', asset: null }];

    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => { render(<ProfilePage />); });

    await waitFor(() => {
      expect(screen.getByText('Unknown Asset')).toBeInTheDocument();
    });
  });

  it('shows only the first 3 assets when more than 3 are returned', async () => {
    const mockAssets = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      asset_id: `A00${i + 1}`,
      asset: { name: `Asset ${i + 1}`, asset_id: `A00${i + 1}`, category: 'Other' },
    }));

    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => { render(<ProfilePage />); });

    await waitFor(() => {
      expect(screen.getByText('Asset 1')).toBeInTheDocument();
      expect(screen.getByText('Asset 2')).toBeInTheDocument();
      expect(screen.getByText('Asset 3')).toBeInTheDocument();
      expect(screen.queryByText('Asset 4')).not.toBeInTheDocument();
      expect(screen.queryByText('Asset 5')).not.toBeInTheDocument();
    });
  });

  it('shows View All button only when there are more than 3 assets', async () => {
    const mockAssets = Array.from({ length: 4 }, (_, i) => ({
      id: i + 1,
      asset_id: `A00${i + 1}`,
      asset: { name: `Asset ${i + 1}`, asset_id: `A00${i + 1}`, category: 'Other' },
    }));

    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => { render(<ProfilePage />); });

    await waitFor(() => {
      expect(screen.getByText(/View All Assets \(4\)/i)).toBeInTheDocument();
    });
  });

  it('does not show View All button when there are 3 or fewer assets', async () => {
    const mockAssets = Array.from({ length: 3 }, (_, i) => ({
      id: i + 1,
      asset_id: `A00${i + 1}`,
      asset: { name: `Asset ${i + 1}`, asset_id: `A00${i + 1}`, category: 'Other' },
    }));

    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => { render(<ProfilePage />); });

    await waitFor(() => {
      expect(screen.queryByText(/View All Assets/i)).not.toBeInTheDocument();
    });
  });

  it('fires the placeholder alert when View All button is clicked', async () => {
    const mockAssets = Array.from({ length: 4 }, (_, i) => ({
      id: i + 1,
      asset_id: `A00${i + 1}`,
      asset: { name: `Asset ${i + 1}`, asset_id: `A00${i + 1}`, category: 'Other' },
    }));

    (useAuth as jest.Mock).mockReturnValue({ isLoading: false, isAuthenticated: true });
    (useSession as jest.Mock).mockReturnValue({
      data: { user: mockSessionUser },
      status: 'authenticated',
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({ success: true, assets: mockAssets }),
    });

    await act(async () => { render(<ProfilePage />); });

    await waitFor(() => {
      fireEvent.click(screen.getByText(/View All Assets/i));
      expect(global.alert).toHaveBeenCalledWith('Assigned Assets page - to be implemented');
    });
  });
});

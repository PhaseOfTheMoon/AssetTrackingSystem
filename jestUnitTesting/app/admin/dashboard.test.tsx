import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import DashboardPage from '@/app/(app)/admin/dashboard/page';
import { useAdminAccess } from '@/hooks/useAdminAccess';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// page.tsx uses useAdminAccess, NOT useSession directly
jest.mock('@/hooks/useAdminAccess', () => ({
  useAdminAccess: jest.fn(),
}));

// lowercase 'breadcrumb' to match the actual import in page.tsx
jest.mock('@/components/ui/breadcrumb', () => {
  return function MockBreadcrumb() {
    return <div data-testid="breadcrumb">Breadcrumb</div>;
  };
});

jest.mock('@/components/charts/realtimeChart', () => {
  return function MockRealtimeChart({ config, entityView }: any) {
    return (
      <div data-testid="realtime-chart">
        {config.title} - {entityView}
      </div>
    );
  };
});

// Mock heroicons so they don't break jsdom
jest.mock('@heroicons/react/24/outline', () => ({
  ComputerDesktopIcon: () => <svg data-testid="icon-computer" />,
  BuildingOfficeIcon:  () => <svg data-testid="icon-building" />,
  UsersIcon:           () => <svg data-testid="icon-users" />,
  MapPinIcon:          () => <svg data-testid="icon-mappin" />,
  ArrowPathIcon:       ({ className }: any) => <svg data-testid="icon-arrowpath" className={className} />,
}));

global.fetch = jest.fn();

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Default session shape returned by useAdminAccess */
const mockSession = {
  user: { name: 'Test User', email: 'test@example.com' },
};

/** Mount the page with session + fetch already resolved */
const renderDashboard = async () => {
  await act(async () => {
    render(<DashboardPage />);
  });
};

// ── Setup ─────────────────────────────────────────────────────────────────────

describe('DashboardPage', () => {
  const mockPush    = jest.fn();
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({
      push:    mockPush,
      replace: mockReplace,
    });

    // Simulate a fully-loaded admin session
    (useAdminAccess as jest.Mock).mockReturnValue({
      session:   mockSession,
      isLoading: false,
    });

    // Default fetch mock — returns realistic data for each endpoint
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/assets'))     return Promise.resolve({ json: () => Promise.resolve({ totalItems: 150 }) });
      if (url.includes('/api/department')) return Promise.resolve({ json: () => Promise.resolve({ data: [{ id: 1 }, { id: 2 }] }) });
      if (url.includes('/api/staff'))      return Promise.resolve({ json: () => Promise.resolve({ staff: [{ id: 1 }, { id: 2 }, { id: 3 }] }) });
      if (url.includes('/api/location'))   return Promise.resolve({ json: () => Promise.resolve({ data: [{ id: 1 }] }) });
      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
  });

  // ── SESSION / AUTH ──────────────────────────────────────────────────────────

  it('shows loading screen while session is loading', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session:   null,
      isLoading: true,
    });
    await act(async () => { render(<DashboardPage />); });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows loading screen when there is no session', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session:   null,
      isLoading: false,
    });
    await act(async () => { render(<DashboardPage />); });
    // Component returns the loading skeleton when session is falsy — no redirect
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  // ── HEADER ──────────────────────────────────────────────────────────────────

  it('renders the Dashboard heading', async () => {
    await renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    });
  });

  it('renders welcome message with user name from session', async () => {
    await renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Test User/i)).toBeInTheDocument();
    });
  });

  it('falls back to "User" in welcome message when name is absent', async () => {
    (useAdminAccess as jest.Mock).mockReturnValue({
      session:   { user: {} },   // name is undefined
      isLoading: false,
    });
    await renderDashboard();
    await waitFor(() => {
      expect(screen.getByText(/Welcome back, User/i)).toBeInTheDocument();
    });
  });

  it('renders the breadcrumb', async () => {
    await renderDashboard();
    expect(screen.getByTestId('breadcrumb')).toBeInTheDocument();
  });

  // ── STAT CARDS ──────────────────────────────────────────────────────────────

  it('renders all four stat card titles', async () => {
    await renderDashboard();
    await waitFor(() => {
      // getAllByText used for titles that also appear elsewhere in the page
      expect(screen.getAllByText('Total Assets').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Departments').length).toBeGreaterThan(0);
      expect(screen.getByText('Staff Members')).toBeInTheDocument();
      expect(screen.getAllByText('Locations').length).toBeGreaterThan(0);
    });
  });

  it('displays fetched stat values after data loads', async () => {
    await renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // totalAssets
      expect(screen.getByText('2')).toBeInTheDocument();   // totalDepartments
      expect(screen.getByText('3')).toBeInTheDocument();   // totalStaff
      expect(screen.getByText('1')).toBeInTheDocument();   // totalLocations
    });
  });

  it('shows animate-pulse skeleton while data is loading', async () => {
    // Keep fetch pending so loading stays true
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    await act(async () => { render(<DashboardPage />); });
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('navigates to /admin/assetTracking/assets when Total Assets card is clicked', async () => {
    await renderDashboard();
    await waitFor(() => {
      const card = screen.getAllByText('Total Assets')[0].closest('div[class*="cursor-pointer"]');
      expect(card).not.toBeNull();
      fireEvent.click(card!);
      expect(mockPush).toHaveBeenCalledWith('/admin/assetTracking/assets');
    });
  });

  it('navigates to /admin/department/units when Departments card is clicked', async () => {
    await renderDashboard();
    await waitFor(() => {
      // 'Departments' appears in both the stat card and the Quick Actions button.
      // Index 0 is the stat card (rendered first in the DOM).
      const allDepts = screen.getAllByText('Departments');
      const card = allDepts[0].closest('div[class*="cursor-pointer"]');
      expect(card).not.toBeNull();
      fireEvent.click(card!);
      expect(mockPush).toHaveBeenCalledWith('/admin/department/units');
    });
  });

  it('navigates to /admin/staff/list when Staff Members card is clicked', async () => {
    await renderDashboard();
    await waitFor(() => {
      const card = screen.getByText('Staff Members').closest('div[class*="cursor-pointer"]');
      fireEvent.click(card!);
      expect(mockPush).toHaveBeenCalledWith('/admin/staff/list');
    });
  });

  it('navigates to /admin/location/rooms when Locations card is clicked', async () => {
    await renderDashboard();
    await waitFor(() => {
      const card = screen.getAllByText('Locations')[0].closest('div[class*="cursor-pointer"]');
      fireEvent.click(card!);
      expect(mockPush).toHaveBeenCalledWith('/admin/location/rooms');
    });
  });

  // ── QUICK ACTIONS ───────────────────────────────────────────────────────────

  it('renders all three quick action buttons', async () => {
    await renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('View All Assets')).toBeInTheDocument();
      expect(screen.getByText('Manage Staff')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Departments/i })).toBeInTheDocument();
    });
  });

  it('navigates to assets page when "View All Assets" is clicked', async () => {
    await renderDashboard();
    await waitFor(() => {
      fireEvent.click(screen.getByText('View All Assets'));
      expect(mockPush).toHaveBeenCalledWith('/admin/assetTracking/assets');
    });
  });

  it('navigates to staff page when "Manage Staff" is clicked', async () => {
    await renderDashboard();
    await waitFor(() => {
      fireEvent.click(screen.getByText('Manage Staff'));
      expect(mockPush).toHaveBeenCalledWith('/admin/staff/list');
    });
  });

  it('navigates to departments page when "Departments" quick action is clicked', async () => {
    await renderDashboard();
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /Departments/i }));
      expect(mockPush).toHaveBeenCalledWith('/admin/department/units');
    });
  });

  // ── REFRESH ─────────────────────────────────────────────────────────────────

  it('renders the Refresh button', async () => {
    await renderDashboard();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
  });

  it('calls fetch 4 times on initial load', async () => {
    await renderDashboard();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });

  it('calls fetch 4 more times (8 total) when Refresh is clicked', async () => {
    await renderDashboard();
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(4));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(8);
    }, { timeout: 3000 });
  });

  it('ArrowPathIcon has animate-spin class while loading', async () => {
    // Keep fetch pending so loading stays true through render
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    await act(async () => { render(<DashboardPage />); });
    const icon = screen.getByTestId('icon-arrowpath');
    // SVG elements expose className as an SVGAnimatedString object, not a plain string.
    // Use getAttribute('class') or classList.contains() instead.
    expect(icon.getAttribute('class')).toContain('animate-spin');
  });

  // ── ANALYTICS / CHART ───────────────────────────────────────────────────────

  it('renders the Analytics heading', async () => {
    await renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });
  });

  it('renders the entity-view dropdown with three options', async () => {
    await renderDashboard();
    await waitFor(() => {
      const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
      expect(dropdown).toBeInTheDocument();
      expect(dropdown.options.length).toBe(3);
      expect(dropdown.value).toBe('assets'); // default
    });
  });

  it('updates entityView when dropdown selection changes to "department"', async () => {
    await renderDashboard();
    await waitFor(() => {
      const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(dropdown, { target: { value: 'department' } });
      expect(dropdown.value).toBe('department');
    });
  });

  it('updates entityView when dropdown selection changes to "location"', async () => {
    await renderDashboard();
    await waitFor(() => {
      const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(dropdown, { target: { value: 'location' } });
      expect(dropdown.value).toBe('location');
    });
  });

  it('renders the RealtimeChart with correct initial entityView prop', async () => {
    await renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('realtime-chart')).toHaveTextContent('assets');
    });
  });

  // ── RECENT ACTIVITY ─────────────────────────────────────────────────────────

  it('renders the Recent Activity section heading', async () => {
    await renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });
  });

  it('shows placeholder text inside Recent Activity', async () => {
    await renderDashboard();
    await waitFor(() => {
      expect(
        screen.getByText('Recent activity tracking will be implemented here')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Asset assignments, updates, and system changes')
      ).toBeInTheDocument();
    });
  });

  // ── ERROR HANDLING ──────────────────────────────────────────────────────────

  it('logs an error and does not crash when fetch throws', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await renderDashboard();

    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Error fetching dashboard data:',
        expect.any(Error)
      );
    });
    consoleError.mockRestore();
  });

  it('sets all stats to 0 gracefully when API returns empty bodies', async () => {
    (global.fetch as jest.Mock).mockImplementation(() =>
      Promise.resolve({ json: () => Promise.resolve({}) })
    );
    await renderDashboard();
    await waitFor(() => {
      // All four stat values render as '0'
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBe(4);
    });
  });
});

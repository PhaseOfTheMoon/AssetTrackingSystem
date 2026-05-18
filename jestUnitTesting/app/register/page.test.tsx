import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import RegisterPage from '@/app/(auth)/register/page';

// mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

// mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>;
});

global.fetch = jest.fn();
global.alert = jest.fn();
jest.useFakeTimers();

// mock department list returned by /api/department/public
const mockDepartments = [
  { department_id: 'IT', name: 'Information Technology' },
  { department_id: 'HR', name: 'Human Resources' },
];

describe('RegisterPage', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

    // default: /api/department/public returns the mock list
    // /api/auth/check-staff-id and /api/auth/check-email return no conflict
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      if (url.includes('/api/auth/check-staff-id')) {
        return Promise.resolve({ json: () => Promise.resolve({ exists: false }) });
      }
      if (url.includes('/api/auth/check-email')) {
        return Promise.resolve({ json: () => Promise.resolve({ message: null }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, staff: { staff_id: 'S001' } }) });
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders all form fields including the new Staff ID field', async () => {
    await act(async () => { render(<RegisterPage />); });

    expect(screen.getByText('Staff Registration')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., 12345')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., John Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., john@swin.edu.my')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., 0123456789')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Submit Registration')).toBeInTheDocument();
  });

  it('renders department field as a select dropdown, not a text input', async () => {
    await act(async () => { render(<RegisterPage />); });

    const select = screen.getByRole('combobox');
    expect(select.tagName).toBe('SELECT');
  });

  it('populates department dropdown from the public API on mount', async () => {
    await act(async () => { render(<RegisterPage />); });

    await waitFor(() => {
      expect(screen.getByText('Information Technology')).toBeInTheDocument();
      expect(screen.getByText('Human Resources')).toBeInTheDocument();
    });
  });

  it('shows Select a department as the default dropdown option', async () => {
    await act(async () => { render(<RegisterPage />); });

    expect(screen.getByText('Select a department')).toBeInTheDocument();
  });

  it('renders Back to Login link pointing to /', async () => {
    await act(async () => { render(<RegisterPage />); });

    const link = screen.getByText('← Back to Login');
    expect(link.closest('a')).toHaveAttribute('href', '/');
  });

  it('shows the admin approval note', async () => {
    await act(async () => { render(<RegisterPage />); });

    expect(screen.getByText(/an administrator will review and approve/i)).toBeInTheDocument();
  });

  it('shows digits-only hint text under Staff ID field', async () => {
    await act(async () => { render(<RegisterPage />); });

    expect(screen.getByText(/Digits only/i)).toBeInTheDocument();
  });

  it('strips letters from Staff ID on every keystroke', async () => {
    await act(async () => { render(<RegisterPage />); });

    const staffIdInput = screen.getByPlaceholderText('e.g., 12345');
    fireEvent.change(staffIdInput, { target: { value: 'abc123' } });

    // only the digits '123' should remain
    expect(staffIdInput).toHaveValue('123');
  });

  // URLs contain no digits so the whole value gets stripped to empty
  it('results in empty field when a URL is typed in Staff ID', async () => {
    await act(async () => { render(<RegisterPage />); });

    const staffIdInput = screen.getByPlaceholderText('e.g., 12345');
    fireEvent.change(staffIdInput, { target: { value: 'https://evil.com' } });

    // only digits survive — 'https://evil.com' has no digits so value is empty
    expect(staffIdInput).toHaveValue('');
  });

  it('accepts a valid numeric Staff ID without errors', async () => {
    await act(async () => { render(<RegisterPage />); });

    const staffIdInput = screen.getByPlaceholderText('e.g., 12345');
    fireEvent.change(staffIdInput, { target: { value: '104385730' } });

    expect(staffIdInput).toHaveValue('104385730');
    expect(screen.queryByText(/Staff ID must/i)).not.toBeInTheDocument();
  });

  it('strips sensitive characters from email on every keystroke', async () => {
    await act(async () => { render(<RegisterPage />); });

    const emailInput = screen.getByPlaceholderText('e.g., john@swin.edu.my');
    fireEvent.change(emailInput, { target: { value: 'test<script>@swin.edu.my' } });

    // < and > are stripped
    expect(emailInput).toHaveValue('testscript@swin.edu.my');
  });

  it('shows inline error for invalid email format', async () => {
    await act(async () => { render(<RegisterPage />); });

    const emailInput = screen.getByPlaceholderText('e.g., john@swin.edu.my');
    fireEvent.change(emailInput, { target: { value: 'notanemail' } });

    expect(screen.getByText('Invalid email format.')).toBeInTheDocument();
  });

  it('does not show email error for a valid email address', async () => {
    await act(async () => { render(<RegisterPage />); });

    const emailInput = screen.getByPlaceholderText('e.g., john@swin.edu.my');
    fireEvent.change(emailInput, { target: { value: 'valid@swin.edu.my' } });

    expect(screen.queryByText('Invalid email format.')).not.toBeInTheDocument();
  });

  it('shows error when Staff ID is already registered (on blur)', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      if (url.includes('/api/auth/check-staff-id')) {
        return Promise.resolve({ json: () => Promise.resolve({ exists: true }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ message: null }) });
    });

    await act(async () => { render(<RegisterPage />); });

    const staffIdInput = screen.getByPlaceholderText('e.g., 12345');
    fireEvent.change(staffIdInput, { target: { value: '12345' } });

    await act(async () => { fireEvent.blur(staffIdInput); });

    await waitFor(() => {
      expect(screen.getByText('This Staff ID is already registered.')).toBeInTheDocument();
    });
  });

  it('shows error when email is already registered (on blur)', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      if (url.includes('/api/auth/check-email')) {
        return Promise.resolve({ json: () => Promise.resolve({ message: 'This email is already registered.' }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ exists: false }) });
    });

    await act(async () => { render(<RegisterPage />); });

    const emailInput = screen.getByPlaceholderText('e.g., john@swin.edu.my');
    fireEvent.change(emailInput, { target: { value: 'taken@swin.edu.my' } });

    await act(async () => { fireEvent.blur(emailInput); });

    await waitFor(() => {
      expect(screen.getByText('This email is already registered.')).toBeInTheDocument();
    });
  });

  it('shows all fields required alert when form is empty', async () => {
    await act(async () => { render(<RegisterPage />); });

    const form = screen.getByText('Submit Registration').closest('form');
    await act(async () => { if (form) fireEvent.submit(form); });

    expect(global.alert).toHaveBeenCalledWith('All fields are required!');
    // the register API should not be called
    expect(global.fetch).toHaveBeenCalledTimes(1); // only the departments fetch on mount
  });

  it('blocks submit and alerts when field errors are present', async () => {
    await act(async () => { render(<RegisterPage />); });

    // wait for department dropdown to populate so we can select one
    await waitFor(() => {
      expect(screen.getByText('Information Technology')).toBeInTheDocument();
    });

    // type an invalid email to set a fieldError
    const emailInput = screen.getByPlaceholderText('e.g., john@swin.edu.my');
    fireEvent.change(emailInput, { target: { value: 'bademail' } });

    // fill all other fields so only the email error remains
    fireEvent.change(screen.getByPlaceholderText('e.g., 12345'), { target: { value: '12345' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., John Doe'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., 0123456789'), { target: { value: '0123456789' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'IT' } });

    const form = screen.getByText('Submit Registration').closest('form');
    await act(async () => { if (form) fireEvent.submit(form); });

    expect(global.alert).toHaveBeenCalledWith('Please fix the errors before submitting.');
  });

  // fills every field with valid data — reused by the success tests below
  async function fillValidForm() {
    await waitFor(() => {
      // wait for department options to appear before selecting
      expect(screen.getByText('Information Technology')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g., 12345'), { target: { value: '104385730' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., John Doe'), { target: { value: 'Jun Zhen Wong' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., john@swin.edu.my'), { target: { value: 'junzhen@swin.edu.my' } });
    fireEvent.change(screen.getByPlaceholderText('e.g., 0123456789'), { target: { value: '0123456789' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'IT' } });
  }

  it('shows success alert with Staff ID on successful registration', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      if (url.includes('/api/auth/register')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, staff: { staff_id: '104385730' } }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ exists: false, message: null }) });
    });

    await act(async () => { render(<RegisterPage />); });
    await fillValidForm();

    await act(async () => { fireEvent.click(screen.getByText('Submit Registration')); });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Registration submitted successfully!')
      );
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('104385730')
      );
    });
  });

  it('clears form fields after successful registration', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      if (url.includes('/api/auth/register')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, staff: { staff_id: '104385730' } }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ exists: false, message: null }) });
    });

    await act(async () => { render(<RegisterPage />); });
    await fillValidForm();

    await act(async () => { fireEvent.click(screen.getByText('Submit Registration')); });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g., 12345')).toHaveValue('');
      expect(screen.getByPlaceholderText('e.g., John Doe')).toHaveValue('');
      expect(screen.getByPlaceholderText('e.g., john@swin.edu.my')).toHaveValue('');
      expect(screen.getByPlaceholderText('e.g., 0123456789')).toHaveValue('');
    });
  });

  it('redirects to / after 2 seconds on successful registration', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      if (url.includes('/api/auth/register')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, staff: { staff_id: '104385730' } }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ exists: false, message: null }) });
    });

    await act(async () => { render(<RegisterPage />); });
    await fillValidForm();

    await act(async () => { fireEvent.click(screen.getByText('Submit Registration')); });
    await waitFor(() => { expect(global.alert).toHaveBeenCalled(); });

    act(() => { jest.advanceTimersByTime(2000); });

    expect(mockPush).toHaveBeenCalledWith('/');
  });

  // register call never resolves — keeps the loading state visible
  it('disables submit button and shows Submitting... while in-flight', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      return new Promise(() => {});
    });

    await act(async () => { render(<RegisterPage />); });
    await fillValidForm();

    await act(async () => { fireEvent.click(screen.getByText('Submit Registration')); });

    await waitFor(() => {
      const btn = screen.getByText('Submitting...');
      expect(btn).toBeDisabled();
    });
  });

  it('shows API error message when registration fails', async () => {
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      if (url.includes('/api/auth/register')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ success: false, error: 'Email already registered' }) });
      }
      return Promise.resolve({ json: () => Promise.resolve({ exists: false, message: null }) });
    });

    await act(async () => { render(<RegisterPage />); });
    await fillValidForm();

    await act(async () => { fireEvent.click(screen.getByText('Submit Registration')); });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Registration failed: Email already registered');
    });
  });

  it('shows fallback alert on network error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/department/public')) {
        return Promise.resolve({ json: () => Promise.resolve({ data: mockDepartments }) });
      }
      if (url.includes('/api/auth/register')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({ json: () => Promise.resolve({ exists: false, message: null }) });
    });

    await act(async () => { render(<RegisterPage />); });
    await fillValidForm();

    await act(async () => { fireEvent.click(screen.getByText('Submit Registration')); });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Failed to submit registration. Please try again.');
      expect(consoleSpy).toHaveBeenCalledWith('Registration error:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});

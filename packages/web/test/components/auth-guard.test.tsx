/**
 * AuthGuard Component Tests
 *
 * Tests for the authentication guard components:
 * - AuthGuard - protects routes requiring authentication
 * - PublicRouteGuard - redirects connected users from public pages
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthGuard, PublicRouteGuard } from '@/components/auth-guard';

// =============================================================================
// Mocks
// =============================================================================

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

let mockIdentity = {
  isConnected: false,
  isLoading: false,
  address: null as string | null,
  userId: null as string | null,
};

vi.mock('@/hooks/useAppIdentity', () => ({
  useAppIdentity: () => mockIdentity,
}));

// =============================================================================
// Test Helpers
// =============================================================================

function setIdentity(overrides: Partial<typeof mockIdentity>) {
  mockIdentity = { ...mockIdentity, ...overrides };
}

// =============================================================================
// AuthGuard Tests
// =============================================================================

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdentity = {
      isConnected: false,
      isLoading: false,
      address: null,
      userId: null,
    };
  });

  describe('loading state', () => {
    it('shows loading identity message while checking auth', async () => {
      setIdentity({ isConnected: false, isLoading: true });
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/Loading identity/)).toBeInTheDocument();
      });
    });

    it('does not show children while loading', async () => {
      setIdentity({ isConnected: false, isLoading: true });
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });

    it('does not redirect while loading', async () => {
      setIdentity({ isConnected: false, isLoading: true });
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/Loading identity/)).toBeInTheDocument();
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('authentication required (default)', () => {
    it('renders children when user is connected', async () => {
      setIdentity({ isConnected: true, isLoading: false });
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    it('shows wallet connection required when not connected', async () => {
      setIdentity({ isConnected: false, isLoading: false });
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/Wallet connection required/)).toBeInTheDocument();
      });
    });

    it('redirects to default route when not connected', async () => {
      setIdentity({ isConnected: false, isLoading: false });
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/');
      });
    });

    it('redirects to custom route when specified', async () => {
      setIdentity({ isConnected: false, isLoading: false });
      render(
        <AuthGuard redirectTo="/login">
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/login');
      });
    });

    it('does not redirect when user is connected', async () => {
      setIdentity({ isConnected: true, isLoading: false });
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('does not show children when not connected', async () => {
      setIdentity({ isConnected: false, isLoading: false });
      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      });
    });
  });

  describe('authentication not required', () => {
    it('renders children even when not connected', async () => {
      setIdentity({ isConnected: false, isLoading: false });
      render(
        <AuthGuard requireAuth={false}>
          <div>Public Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Public Content')).toBeInTheDocument();
      });
    });

    it('does not redirect when not connected', async () => {
      setIdentity({ isConnected: false, isLoading: false });
      render(
        <AuthGuard requireAuth={false}>
          <div>Public Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Public Content')).toBeInTheDocument();
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('renders children when connected', async () => {
      setIdentity({ isConnected: true, isLoading: false });
      render(
        <AuthGuard requireAuth={false}>
          <div>Public Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Public Content')).toBeInTheDocument();
      });
    });

    it('does not show wallet required message', async () => {
      setIdentity({ isConnected: false, isLoading: false });
      render(
        <AuthGuard requireAuth={false}>
          <div>Public Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.queryByText(/Wallet connection required/)).not.toBeInTheDocument();
      });
    });
  });

  describe('children rendering', () => {
    it('renders complex children correctly', async () => {
      setIdentity({ isConnected: true, isLoading: false });
      render(
        <AuthGuard>
          <div>
            <h1>Dashboard</h1>
            <p>Welcome back!</p>
          </div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Welcome back!')).toBeInTheDocument();
      });
    });

    it('renders multiple children', async () => {
      setIdentity({ isConnected: true, isLoading: false });
      render(
        <AuthGuard>
          <div>First Child</div>
          <div>Second Child</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('First Child')).toBeInTheDocument();
        expect(screen.getByText('Second Child')).toBeInTheDocument();
      });
    });
  });

  describe('redirect paths', () => {
    it('redirects to /home when specified', async () => {
      setIdentity({ isConnected: false, isLoading: false });
      render(
        <AuthGuard redirectTo="/home">
          <div>Protected</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/home');
      });
    });

    it('redirects to /auth when specified', async () => {
      setIdentity({ isConnected: false, isLoading: false });
      render(
        <AuthGuard redirectTo="/auth">
          <div>Protected</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/auth');
      });
    });
  });
});

// =============================================================================
// PublicRouteGuard Tests
// =============================================================================

describe('PublicRouteGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdentity = {
      isConnected: false,
      isLoading: false,
      address: null,
      userId: null,
    };
  });

  describe('default behavior (no redirect)', () => {
    it('renders children when not connected', async () => {
      setIdentity({ isConnected: false, isLoading: false });
      render(
        <PublicRouteGuard>
          <div>Landing Page</div>
        </PublicRouteGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Landing Page')).toBeInTheDocument();
      });
    });

    it('does not redirect when not connected', async () => {
      setIdentity({ isConnected: false, isLoading: false });
      render(
        <PublicRouteGuard>
          <div>Landing Page</div>
        </PublicRouteGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Landing Page')).toBeInTheDocument();
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('renders children when connected (redirectWhenConnected=false)', async () => {
      setIdentity({ isConnected: true, isLoading: false });
      render(
        <PublicRouteGuard>
          <div>Landing Page</div>
        </PublicRouteGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Landing Page')).toBeInTheDocument();
      });
    });

    it('does not redirect when connected (redirectWhenConnected=false)', async () => {
      setIdentity({ isConnected: true, isLoading: false });
      render(
        <PublicRouteGuard>
          <div>Landing Page</div>
        </PublicRouteGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Landing Page')).toBeInTheDocument();
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('redirect when connected', () => {
    it('redirects to default route when connected', async () => {
      setIdentity({ isConnected: true, isLoading: false });
      render(
        <PublicRouteGuard redirectWhenConnected>
          <div>Landing Page</div>
        </PublicRouteGuard>
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/markets');
      });
    });

    it('redirects to custom route when specified', async () => {
      setIdentity({ isConnected: true, isLoading: false });
      render(
        <PublicRouteGuard redirectWhenConnected redirectTo="/dashboard">
          <div>Landing Page</div>
        </PublicRouteGuard>
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('shows redirecting message when connected and redirecting', async () => {
      setIdentity({ isConnected: true, isLoading: false });
      render(
        <PublicRouteGuard redirectWhenConnected>
          <div>Landing Page</div>
        </PublicRouteGuard>
      );

      await waitFor(() => {
        expect(screen.getByText(/Redirecting to dashboard/)).toBeInTheDocument();
      });
    });

    it('does not show children when redirecting', async () => {
      setIdentity({ isConnected: true, isLoading: false });
      render(
        <PublicRouteGuard redirectWhenConnected>
          <div>Landing Page</div>
        </PublicRouteGuard>
      );

      await waitFor(() => {
        expect(screen.queryByText('Landing Page')).not.toBeInTheDocument();
      });
    });

    it('does not redirect while loading', async () => {
      setIdentity({ isConnected: true, isLoading: true });
      render(
        <PublicRouteGuard redirectWhenConnected>
          <div>Landing Page</div>
        </PublicRouteGuard>
      );

      // Wait a bit to ensure no redirect happens
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('does not redirect when not connected', async () => {
      setIdentity({ isConnected: false, isLoading: false });
      render(
        <PublicRouteGuard redirectWhenConnected>
          <div>Landing Page</div>
        </PublicRouteGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Landing Page')).toBeInTheDocument();
      });

      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('redirect paths', () => {
    it('redirects to /app when specified', async () => {
      setIdentity({ isConnected: true, isLoading: false });
      render(
        <PublicRouteGuard redirectWhenConnected redirectTo="/app">
          <div>Landing</div>
        </PublicRouteGuard>
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/app');
      });
    });

    it('redirects to /portfolio when specified', async () => {
      setIdentity({ isConnected: true, isLoading: false });
      render(
        <PublicRouteGuard redirectWhenConnected redirectTo="/portfolio">
          <div>Landing</div>
        </PublicRouteGuard>
      );

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/portfolio');
      });
    });
  });

  describe('children rendering', () => {
    it('renders complex children correctly', async () => {
      setIdentity({ isConnected: false, isLoading: false });
      render(
        <PublicRouteGuard>
          <div>
            <h1>Welcome to Calibr</h1>
            <p>Get started today</p>
          </div>
        </PublicRouteGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome to Calibr')).toBeInTheDocument();
        expect(screen.getByText('Get started today')).toBeInTheDocument();
      });
    });

    it('renders multiple children', async () => {
      setIdentity({ isConnected: false, isLoading: false });
      render(
        <PublicRouteGuard>
          <header>Header</header>
          <main>Main Content</main>
          <footer>Footer</footer>
        </PublicRouteGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Header')).toBeInTheDocument();
        expect(screen.getByText('Main Content')).toBeInTheDocument();
        expect(screen.getByText('Footer')).toBeInTheDocument();
      });
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdentity = {
      isConnected: false,
      isLoading: false,
      address: null,
      userId: null,
    };
  });

  it('AuthGuard handles identity state change from loading to connected', async () => {
    setIdentity({ isConnected: false, isLoading: true });
    const { rerender } = render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByText(/Loading identity/)).toBeInTheDocument();
    });

    // Simulate identity loading complete and connected
    setIdentity({ isConnected: true, isLoading: false });
    rerender(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('AuthGuard handles identity state change from loading to disconnected', async () => {
    setIdentity({ isConnected: false, isLoading: true });
    const { rerender } = render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByText(/Loading identity/)).toBeInTheDocument();
    });

    // Simulate identity loading complete and not connected
    setIdentity({ isConnected: false, isLoading: false });
    rerender(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(screen.getByText(/Wallet connection required/)).toBeInTheDocument();
    });
  });

  it('PublicRouteGuard handles user connecting after initial render', async () => {
    setIdentity({ isConnected: false, isLoading: false });
    const { rerender } = render(
      <PublicRouteGuard redirectWhenConnected>
        <div>Landing Page</div>
      </PublicRouteGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Landing Page')).toBeInTheDocument();
    });

    // Simulate user connecting
    setIdentity({ isConnected: true, isLoading: false });
    rerender(
      <PublicRouteGuard redirectWhenConnected>
        <div>Landing Page</div>
      </PublicRouteGuard>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/markets');
    });
  });

  it('handles empty children gracefully', async () => {
    setIdentity({ isConnected: true, isLoading: false });
    render(<AuthGuard>{null}</AuthGuard>);

    // Should not throw
    await waitFor(() => {
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  it('handles undefined children gracefully', async () => {
    setIdentity({ isConnected: true, isLoading: false });
    render(<AuthGuard>{undefined}</AuthGuard>);

    // Should not throw
    await waitFor(() => {
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });
});

// =============================================================================
// Styling Tests
// =============================================================================

describe('Styling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdentity = {
      isConnected: false,
      isLoading: false,
      address: null,
      userId: null,
    };
  });

  it('loading state has animate-pulse class', async () => {
    setIdentity({ isConnected: false, isLoading: true });
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      const loadingElement = screen.getByText(/Loading identity/);
      expect(loadingElement).toHaveClass('animate-pulse');
    });
  });

  it('wallet required state has animate-pulse class', async () => {
    setIdentity({ isConnected: false, isLoading: false });
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      const element = screen.getByText(/Wallet connection required/);
      expect(element).toHaveClass('animate-pulse');
    });
  });

  it('redirecting state has animate-pulse class', async () => {
    setIdentity({ isConnected: true, isLoading: false });
    render(
      <PublicRouteGuard redirectWhenConnected>
        <div>Landing Page</div>
      </PublicRouteGuard>
    );

    await waitFor(() => {
      const element = screen.getByText(/Redirecting to dashboard/);
      expect(element).toHaveClass('animate-pulse');
    });
  });

  it('loading states are centered', async () => {
    setIdentity({ isConnected: false, isLoading: true });
    const { container } = render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('min-h-screen');
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
      expect(wrapper).toHaveClass('justify-center');
    });
  });

  it('loading states have primary color', async () => {
    setIdentity({ isConnected: false, isLoading: true });
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      const loadingElement = screen.getByText(/Loading identity/);
      expect(loadingElement).toHaveClass('text-[hsl(var(--primary))]');
    });
  });
});

// =============================================================================
// Props Validation Tests
// =============================================================================

describe('Props', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdentity = {
      isConnected: false,
      isLoading: false,
      address: null,
      userId: null,
    };
  });

  it('AuthGuard defaults requireAuth to true', async () => {
    setIdentity({ isConnected: false, isLoading: false });
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('AuthGuard defaults redirectTo to /', async () => {
    setIdentity({ isConnected: false, isLoading: false });
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('PublicRouteGuard defaults redirectWhenConnected to false', async () => {
    setIdentity({ isConnected: true, isLoading: false });
    render(
      <PublicRouteGuard>
        <div>Landing Page</div>
      </PublicRouteGuard>
    );

    await waitFor(() => {
      expect(screen.getByText('Landing Page')).toBeInTheDocument();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('PublicRouteGuard defaults redirectTo to /markets', async () => {
    setIdentity({ isConnected: true, isLoading: false });
    render(
      <PublicRouteGuard redirectWhenConnected>
        <div>Landing Page</div>
      </PublicRouteGuard>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/markets');
    });
  });
});

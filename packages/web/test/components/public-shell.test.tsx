/**
 * PublicShell Component Tests
 *
 * Tests for the public routes shell wrapper:
 * - Children rendering
 * - PublicRouteGuard integration with conditional redirect
 * - Header rendering
 * - Pathname-based redirect behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublicShell } from '@/components/public-shell';

// =============================================================================
// Mocks
// =============================================================================

// Mock pathname
let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

// Capture PublicRouteGuard props
let capturedGuardProps: { redirectWhenConnected?: boolean; redirectTo?: string } = {};

vi.mock('@/components/auth-guard', () => ({
  PublicRouteGuard: ({
    children,
    redirectWhenConnected,
    redirectTo,
  }: {
    children: React.ReactNode;
    redirectWhenConnected?: boolean;
    redirectTo?: string;
  }) => {
    capturedGuardProps = { redirectWhenConnected, redirectTo };
    return <div data-testid="public-route-guard">{children}</div>;
  },
}));

vi.mock('@/components/header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

// =============================================================================
// Test Helpers
// =============================================================================

function resetMocks() {
  mockPathname = '/';
  capturedGuardProps = {};
}

function setPathname(path: string) {
  mockPathname = path;
}

// =============================================================================
// Tests
// =============================================================================

describe('PublicShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  describe('rendering', () => {
    it('renders children', () => {
      render(
        <PublicShell>
          <div data-testid="child-content">Test Content</div>
        </PublicShell>
      );
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <PublicShell>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </PublicShell>
      );
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('PublicRouteGuard integration', () => {
    it('wraps content with PublicRouteGuard', () => {
      render(
        <PublicShell>
          <div>Content</div>
        </PublicShell>
      );
      expect(screen.getByTestId('public-route-guard')).toBeInTheDocument();
    });

    it('sets redirectTo to /markets', () => {
      render(
        <PublicShell>
          <div>Content</div>
        </PublicShell>
      );
      expect(capturedGuardProps.redirectTo).toBe('/markets');
    });

    it('children are inside PublicRouteGuard', () => {
      render(
        <PublicShell>
          <div data-testid="nested-child">Nested</div>
        </PublicShell>
      );
      const guard = screen.getByTestId('public-route-guard');
      const child = screen.getByTestId('nested-child');
      expect(guard).toContainElement(child);
    });
  });

  describe('landing page redirect', () => {
    it('sets redirectWhenConnected to true on landing page', () => {
      setPathname('/');
      render(
        <PublicShell>
          <div>Content</div>
        </PublicShell>
      );
      expect(capturedGuardProps.redirectWhenConnected).toBe(true);
    });
  });

  describe('non-landing page behavior', () => {
    it('sets redirectWhenConnected to false on /verify', () => {
      setPathname('/verify');
      render(
        <PublicShell>
          <div>Content</div>
        </PublicShell>
      );
      expect(capturedGuardProps.redirectWhenConnected).toBe(false);
    });

    it('sets redirectWhenConnected to false on /about', () => {
      setPathname('/about');
      render(
        <PublicShell>
          <div>Content</div>
        </PublicShell>
      );
      expect(capturedGuardProps.redirectWhenConnected).toBe(false);
    });

    it('sets redirectWhenConnected to false on any non-root path', () => {
      setPathname('/some-other-page');
      render(
        <PublicShell>
          <div>Content</div>
        </PublicShell>
      );
      expect(capturedGuardProps.redirectWhenConnected).toBe(false);
    });
  });

  describe('Header integration', () => {
    it('renders Header component', () => {
      render(
        <PublicShell>
          <div>Content</div>
        </PublicShell>
      );
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('Header is inside PublicRouteGuard', () => {
      render(
        <PublicShell>
          <div>Content</div>
        </PublicShell>
      );
      const guard = screen.getByTestId('public-route-guard');
      const header = screen.getByTestId('header');
      expect(guard).toContainElement(header);
    });
  });

  describe('component structure', () => {
    it('Header appears before children', () => {
      const { container } = render(
        <PublicShell>
          <div data-testid="content">Content</div>
        </PublicShell>
      );

      const guard = container.querySelector('[data-testid="public-route-guard"]');
      const children = guard?.children;

      expect(children?.[0]).toHaveAttribute('data-testid', 'header');
      expect(children?.[1]).toHaveAttribute('data-testid', 'content');
    });

    it('maintains correct nesting order', () => {
      const { container } = render(
        <PublicShell>
          <main data-testid="main">Main Content</main>
        </PublicShell>
      );

      const guard = container.querySelector('[data-testid="public-route-guard"]') as HTMLElement;
      const header = container.querySelector('[data-testid="header"]') as HTMLElement;
      const main = container.querySelector('[data-testid="main"]') as HTMLElement;

      expect(guard).toContainElement(header);
      expect(guard).toContainElement(main);
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  it('handles empty children', () => {
    render(
      <PublicShell>
        <></>
      </PublicShell>
    );
    expect(screen.getByTestId('public-route-guard')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('handles null children', () => {
    render(
      <PublicShell>
        {null}
      </PublicShell>
    );
    expect(screen.getByTestId('public-route-guard')).toBeInTheDocument();
  });

  it('handles text node children', () => {
    render(
      <PublicShell>
        Plain text content
      </PublicShell>
    );
    expect(screen.getByText('Plain text content')).toBeInTheDocument();
  });

  it('handles deeply nested children', () => {
    render(
      <PublicShell>
        <div data-testid="level-1">
          <div data-testid="level-2">
            <div data-testid="level-3">Deep Content</div>
          </div>
        </div>
      </PublicShell>
    );
    expect(screen.getByTestId('level-3')).toBeInTheDocument();
    expect(screen.getByText('Deep Content')).toBeInTheDocument();
  });

  it('re-renders correctly when pathname changes', () => {
    setPathname('/');
    const { rerender } = render(
      <PublicShell>
        <div>Content</div>
      </PublicShell>
    );
    expect(capturedGuardProps.redirectWhenConnected).toBe(true);

    setPathname('/verify');
    rerender(
      <PublicShell>
        <div>Content</div>
      </PublicShell>
    );
    expect(capturedGuardProps.redirectWhenConnected).toBe(false);
  });
});

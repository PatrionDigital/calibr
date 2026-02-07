/**
 * AppShell Component Tests
 *
 * Tests for the authenticated app shell wrapper:
 * - Children rendering
 * - AuthGuard integration with correct props
 * - Header rendering
 * - Component structure and nesting
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppShell } from '@/components/app-shell';

// =============================================================================
// Mocks
// =============================================================================

// Capture AuthGuard props
let capturedAuthGuardProps: { requireAuth?: boolean; redirectTo?: string } = {};

vi.mock('@/components/auth-guard', () => ({
  AuthGuard: ({
    children,
    requireAuth,
    redirectTo,
  }: {
    children: React.ReactNode;
    requireAuth?: boolean;
    redirectTo?: string;
  }) => {
    capturedAuthGuardProps = { requireAuth, redirectTo };
    return <div data-testid="auth-guard">{children}</div>;
  },
}));

vi.mock('@/components/header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

// =============================================================================
// Tests
// =============================================================================

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedAuthGuardProps = {};
  });

  describe('rendering', () => {
    it('renders children', () => {
      render(
        <AppShell>
          <div data-testid="child-content">Test Content</div>
        </AppShell>
      );
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <AppShell>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </AppShell>
      );
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('AuthGuard integration', () => {
    it('wraps content with AuthGuard', () => {
      render(
        <AppShell>
          <div data-testid="content">Content</div>
        </AppShell>
      );
      expect(screen.getByTestId('auth-guard')).toBeInTheDocument();
    });

    it('sets requireAuth to true', () => {
      render(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );
      expect(capturedAuthGuardProps.requireAuth).toBe(true);
    });

    it('sets redirectTo to root path', () => {
      render(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );
      expect(capturedAuthGuardProps.redirectTo).toBe('/');
    });

    it('children are inside AuthGuard', () => {
      render(
        <AppShell>
          <div data-testid="nested-child">Nested</div>
        </AppShell>
      );
      const authGuard = screen.getByTestId('auth-guard');
      const child = screen.getByTestId('nested-child');
      expect(authGuard).toContainElement(child);
    });
  });

  describe('Header integration', () => {
    it('renders Header component', () => {
      render(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });

    it('Header is inside AuthGuard', () => {
      render(
        <AppShell>
          <div>Content</div>
        </AppShell>
      );
      const authGuard = screen.getByTestId('auth-guard');
      const header = screen.getByTestId('header');
      expect(authGuard).toContainElement(header);
    });
  });

  describe('component structure', () => {
    it('Header appears before children', () => {
      const { container } = render(
        <AppShell>
          <div data-testid="content">Content</div>
        </AppShell>
      );

      const authGuard = container.querySelector('[data-testid="auth-guard"]');
      const children = authGuard?.children;

      expect(children?.[0]).toHaveAttribute('data-testid', 'header');
      expect(children?.[1]).toHaveAttribute('data-testid', 'content');
    });

    it('maintains correct nesting order', () => {
      const { container } = render(
        <AppShell>
          <main data-testid="main">Main Content</main>
        </AppShell>
      );

      // Structure: AuthGuard > (Header + children)
      const authGuard = container.querySelector('[data-testid="auth-guard"]') as HTMLElement;
      const header = container.querySelector('[data-testid="header"]') as HTMLElement;
      const main = container.querySelector('[data-testid="main"]') as HTMLElement;

      expect(authGuard).toContainElement(header);
      expect(authGuard).toContainElement(main);
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedAuthGuardProps = {};
  });

  it('handles empty children', () => {
    render(
      <AppShell>
        <></>
      </AppShell>
    );
    expect(screen.getByTestId('auth-guard')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('handles null children', () => {
    render(
      <AppShell>
        {null}
      </AppShell>
    );
    expect(screen.getByTestId('auth-guard')).toBeInTheDocument();
  });

  it('handles text node children', () => {
    render(
      <AppShell>
        Plain text content
      </AppShell>
    );
    expect(screen.getByText('Plain text content')).toBeInTheDocument();
  });

  it('handles deeply nested children', () => {
    render(
      <AppShell>
        <div data-testid="level-1">
          <div data-testid="level-2">
            <div data-testid="level-3">Deep Content</div>
          </div>
        </div>
      </AppShell>
    );
    expect(screen.getByTestId('level-3')).toBeInTheDocument();
    expect(screen.getByText('Deep Content')).toBeInTheDocument();
  });

  it('re-renders correctly', () => {
    const { rerender } = render(
      <AppShell>
        <div>First</div>
      </AppShell>
    );

    expect(screen.getByText('First')).toBeInTheDocument();

    rerender(
      <AppShell>
        <div>Second</div>
      </AppShell>
    );

    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.queryByText('First')).not.toBeInTheDocument();
  });
});

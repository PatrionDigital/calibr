/**
 * Header Component Tests
 *
 * Tests for the main application header:
 * - Logo and branding
 * - Version string display
 * - Navigation items rendering
 * - Active state styling based on pathname
 * - ConnectWallet integration
 * - Responsive navigation visibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from '@/components/header';

// =============================================================================
// Mocks
// =============================================================================

// Mock pathname
let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

// Mock ConnectWallet
vi.mock('@/components/connect-wallet', () => ({
  ConnectWallet: () => <div data-testid="connect-wallet">ConnectWallet</div>,
}));

// Mock version string
vi.mock('@/lib/version', () => ({
  getVersionString: () => 'v0.3.66-test',
}));

// =============================================================================
// Test Helpers
// =============================================================================

function resetMocks() {
  mockPathname = '/';
}

function setPathname(path: string) {
  mockPathname = path;
}

// =============================================================================
// Tests
// =============================================================================

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMocks();
  });

  describe('branding', () => {
    it('renders CALIBR.XYZ logo', () => {
      render(<Header />);
      expect(screen.getByText('CALIBR.XYZ')).toBeInTheDocument();
    });

    it('logo links to home', () => {
      render(<Header />);
      const logo = screen.getByText('CALIBR.XYZ');
      expect(logo.closest('a')).toHaveAttribute('href', '/');
    });

    it('logo has primary color styling', () => {
      render(<Header />);
      const logo = screen.getByText('CALIBR.XYZ');
      expect(logo).toHaveClass('text-[hsl(var(--primary))]');
    });

    it('logo has bold font', () => {
      render(<Header />);
      const logo = screen.getByText('CALIBR.XYZ');
      expect(logo).toHaveClass('font-bold');
    });
  });

  describe('version string', () => {
    it('displays version string', () => {
      render(<Header />);
      expect(screen.getByText('v0.3.66-test')).toBeInTheDocument();
    });

    it('version has muted foreground color', () => {
      render(<Header />);
      const version = screen.getByText('v0.3.66-test');
      expect(version).toHaveClass('text-[hsl(var(--muted-foreground))]');
    });

    it('version has monospace font', () => {
      render(<Header />);
      const version = screen.getByText('v0.3.66-test');
      expect(version).toHaveClass('font-mono');
    });

    it('version has small text size', () => {
      render(<Header />);
      const version = screen.getByText('v0.3.66-test');
      expect(version).toHaveClass('text-xs');
    });
  });

  describe('navigation items', () => {
    it('renders HOME link', () => {
      render(<Header />);
      const link = screen.getByRole('link', { name: 'HOME' });
      expect(link).toHaveAttribute('href', '/');
    });

    it('renders MARKETS link', () => {
      render(<Header />);
      const link = screen.getByRole('link', { name: 'MARKETS' });
      expect(link).toHaveAttribute('href', '/markets');
    });

    it('renders PORTFOLIO link', () => {
      render(<Header />);
      const link = screen.getByRole('link', { name: 'PORTFOLIO' });
      expect(link).toHaveAttribute('href', '/portfolio');
    });

    it('renders FORECASTS link', () => {
      render(<Header />);
      const link = screen.getByRole('link', { name: 'FORECASTS' });
      expect(link).toHaveAttribute('href', '/forecasts');
    });

    it('renders VERIFY link', () => {
      render(<Header />);
      const link = screen.getByRole('link', { name: 'VERIFY' });
      expect(link).toHaveAttribute('href', '/verify');
    });

    it('renders SETTINGS link', () => {
      render(<Header />);
      const link = screen.getByRole('link', { name: 'SETTINGS' });
      expect(link).toHaveAttribute('href', '/settings');
    });

    it('renders all 6 navigation links', () => {
      render(<Header />);
      const nav = screen.getByRole('navigation');
      const links = nav.querySelectorAll('a');
      expect(links).toHaveLength(6);
    });
  });

  describe('active state - HOME page', () => {
    beforeEach(() => {
      setPathname('/');
    });

    it('HOME link is active on root path', () => {
      render(<Header />);
      const link = screen.getByRole('link', { name: 'HOME' });
      expect(link).toHaveClass('text-[hsl(var(--primary))]');
      expect(link).toHaveClass('border-b-2');
    });

    it('MARKETS link is inactive on root path', () => {
      render(<Header />);
      const link = screen.getByRole('link', { name: 'MARKETS' });
      expect(link).toHaveClass('text-[hsl(var(--muted-foreground))]');
      expect(link).not.toHaveClass('border-b-2');
    });
  });

  describe('active state - MARKETS page', () => {
    beforeEach(() => {
      setPathname('/markets');
    });

    it('MARKETS link is active on /markets', () => {
      render(<Header />);
      const link = screen.getByRole('link', { name: 'MARKETS' });
      expect(link).toHaveClass('text-[hsl(var(--primary))]');
      expect(link).toHaveClass('border-b-2');
    });

    it('HOME link is inactive on /markets', () => {
      render(<Header />);
      const link = screen.getByRole('link', { name: 'HOME' });
      expect(link).toHaveClass('text-[hsl(var(--muted-foreground))]');
    });

    it('MARKETS link is active on nested /markets/123 path', () => {
      setPathname('/markets/123');
      render(<Header />);
      const link = screen.getByRole('link', { name: 'MARKETS' });
      expect(link).toHaveClass('text-[hsl(var(--primary))]');
    });
  });

  describe('active state - PORTFOLIO page', () => {
    beforeEach(() => {
      setPathname('/portfolio');
    });

    it('PORTFOLIO link is active on /portfolio', () => {
      render(<Header />);
      const link = screen.getByRole('link', { name: 'PORTFOLIO' });
      expect(link).toHaveClass('text-[hsl(var(--primary))]');
      expect(link).toHaveClass('border-b-2');
    });

    it('PORTFOLIO link is active on nested path', () => {
      setPathname('/portfolio/positions');
      render(<Header />);
      const link = screen.getByRole('link', { name: 'PORTFOLIO' });
      expect(link).toHaveClass('text-[hsl(var(--primary))]');
    });
  });

  describe('active state - FORECASTS page', () => {
    beforeEach(() => {
      setPathname('/forecasts');
    });

    it('FORECASTS link is active on /forecasts', () => {
      render(<Header />);
      const link = screen.getByRole('link', { name: 'FORECASTS' });
      expect(link).toHaveClass('text-[hsl(var(--primary))]');
    });

    it('FORECASTS link is active on nested path', () => {
      setPathname('/forecasts/history');
      render(<Header />);
      const link = screen.getByRole('link', { name: 'FORECASTS' });
      expect(link).toHaveClass('text-[hsl(var(--primary))]');
    });
  });

  describe('active state - VERIFY page', () => {
    beforeEach(() => {
      setPathname('/verify');
    });

    it('VERIFY link is active on /verify', () => {
      render(<Header />);
      const link = screen.getByRole('link', { name: 'VERIFY' });
      expect(link).toHaveClass('text-[hsl(var(--primary))]');
    });
  });

  describe('active state - SETTINGS page', () => {
    beforeEach(() => {
      setPathname('/settings');
    });

    it('SETTINGS link is active on /settings', () => {
      render(<Header />);
      const link = screen.getByRole('link', { name: 'SETTINGS' });
      expect(link).toHaveClass('text-[hsl(var(--primary))]');
    });

    it('SETTINGS link is active on nested path', () => {
      setPathname('/settings/profile');
      render(<Header />);
      const link = screen.getByRole('link', { name: 'SETTINGS' });
      expect(link).toHaveClass('text-[hsl(var(--primary))]');
    });
  });

  describe('ConnectWallet integration', () => {
    it('renders ConnectWallet component', () => {
      render(<Header />);
      expect(screen.getByTestId('connect-wallet')).toBeInTheDocument();
    });
  });

  describe('header structure', () => {
    it('renders as header element', () => {
      render(<Header />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('header has sticky positioning', () => {
      render(<Header />);
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('sticky');
      expect(header).toHaveClass('top-0');
    });

    it('header has high z-index for overlay', () => {
      render(<Header />);
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('z-50');
    });

    it('header has border bottom', () => {
      render(<Header />);
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('border-b');
    });

    it('header has dark background with blur', () => {
      render(<Header />);
      const header = screen.getByRole('banner');
      expect(header).toHaveClass('bg-black/90');
      expect(header).toHaveClass('backdrop-blur');
    });
  });

  describe('navigation styling', () => {
    it('navigation links have consistent font size', () => {
      render(<Header />);
      const links = screen.getAllByRole('link').filter(
        link => link.textContent !== 'CALIBR.XYZ'
      );
      links.forEach(link => {
        expect(link).toHaveClass('text-xs');
      });
    });

    it('navigation links have bold font', () => {
      render(<Header />);
      const link = screen.getByRole('link', { name: 'MARKETS' });
      expect(link).toHaveClass('font-bold');
    });

    it('navigation has responsive visibility', () => {
      render(<Header />);
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('hidden');
      expect(nav).toHaveClass('md:flex');
    });

    it('navigation items have proper spacing', () => {
      render(<Header />);
      const nav = screen.getByRole('navigation');
      expect(nav).toHaveClass('gap-4');
    });
  });

  describe('layout structure', () => {
    it('content is constrained to max-width', () => {
      render(<Header />);
      const header = screen.getByRole('banner');
      const container = header.querySelector('div');
      expect(container).toHaveClass('max-w-7xl');
    });

    it('content is centered with auto margins', () => {
      render(<Header />);
      const header = screen.getByRole('banner');
      const container = header.querySelector('div');
      expect(container).toHaveClass('mx-auto');
    });

    it('content has horizontal padding', () => {
      render(<Header />);
      const header = screen.getByRole('banner');
      const container = header.querySelector('div');
      expect(container).toHaveClass('px-4');
    });

    it('items are spaced between', () => {
      render(<Header />);
      const header = screen.getByRole('banner');
      const container = header.querySelector('div');
      expect(container).toHaveClass('justify-between');
    });

    it('items are vertically centered', () => {
      render(<Header />);
      const header = screen.getByRole('banner');
      const container = header.querySelector('div');
      expect(container).toHaveClass('items-center');
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

  it('handles null pathname gracefully', () => {
    mockPathname = null as unknown as string;
    render(<Header />);
    // Should not throw, all nav items render as inactive
    expect(screen.getByRole('link', { name: 'HOME' })).toBeInTheDocument();
  });

  it('handles undefined pathname gracefully', () => {
    mockPathname = undefined as unknown as string;
    render(<Header />);
    expect(screen.getByRole('link', { name: 'MARKETS' })).toBeInTheDocument();
  });

  it('handles unknown path without active state', () => {
    setPathname('/unknown-page');
    render(<Header />);
    // All nav links should be inactive
    const navLinks = screen.getAllByRole('link').filter(
      link => link.textContent !== 'CALIBR.XYZ'
    );
    navLinks.forEach(link => {
      expect(link).toHaveClass('text-[hsl(var(--muted-foreground))]');
    });
  });

  it('HOME is not active on paths that start with similar prefix', () => {
    setPathname('/home-something');
    render(<Header />);
    const homeLink = screen.getByRole('link', { name: 'HOME' });
    // HOME should not be active because /home-something !== /
    expect(homeLink).toHaveClass('text-[hsl(var(--muted-foreground))]');
  });

  it('handles deeply nested paths correctly', () => {
    setPathname('/markets/category/subcategory/item');
    render(<Header />);
    const marketsLink = screen.getByRole('link', { name: 'MARKETS' });
    expect(marketsLink).toHaveClass('text-[hsl(var(--primary))]');
  });
});

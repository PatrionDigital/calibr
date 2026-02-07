/**
 * Providers Component Tests
 *
 * Tests for the application provider wrapper:
 * - Provider nesting structure
 * - Children rendering
 * - QueryClient creation
 * - RainbowKit theme configuration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Providers } from '@/components/providers';

// =============================================================================
// Mocks
// =============================================================================

// Capture RainbowKit theme configuration
let capturedRainbowKitTheme: unknown = null;

vi.mock('wagmi', () => ({
  WagmiProvider: ({ children, config }: { children: React.ReactNode; config: unknown }) => (
    <div data-testid="wagmi-provider" data-config={config ? 'provided' : 'missing'}>
      {children}
    </div>
  ),
}));

vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn().mockImplementation(() => ({ client: 'mock-query-client' })),
  QueryClientProvider: ({ children, client }: { children: React.ReactNode; client: unknown }) => (
    <div data-testid="query-client-provider" data-client={client ? 'provided' : 'missing'}>
      {children}
    </div>
  ),
}));

vi.mock('@rainbow-me/rainbowkit', () => ({
  RainbowKitProvider: ({ children, theme }: { children: React.ReactNode; theme: unknown }) => {
    capturedRainbowKitTheme = theme;
    return (
      <div data-testid="rainbowkit-provider" data-theme={theme ? 'provided' : 'missing'}>
        {children}
      </div>
    );
  },
  darkTheme: (config: Record<string, unknown>) => ({ type: 'dark', ...config }),
}));

vi.mock('@/lib/wagmi', () => ({
  config: { chains: ['base'], transports: {} },
}));

// Mock the CSS import
vi.mock('@rainbow-me/rainbowkit/styles.css', () => ({}));

// =============================================================================
// Tests
// =============================================================================

describe('Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedRainbowKitTheme = null;
  });

  describe('rendering', () => {
    it('renders children', () => {
      render(
        <Providers>
          <div data-testid="child-content">Test Content</div>
        </Providers>
      );
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <Providers>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </Providers>
      );
      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('provider structure', () => {
    it('renders WagmiProvider as outermost provider', () => {
      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );
      const wagmiProvider = screen.getByTestId('wagmi-provider');
      expect(wagmiProvider).toBeInTheDocument();
    });

    it('renders QueryClientProvider inside WagmiProvider', () => {
      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );
      const wagmiProvider = screen.getByTestId('wagmi-provider');
      const queryProvider = screen.getByTestId('query-client-provider');
      expect(wagmiProvider).toContainElement(queryProvider);
    });

    it('renders RainbowKitProvider inside QueryClientProvider', () => {
      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );
      const queryProvider = screen.getByTestId('query-client-provider');
      const rainbowProvider = screen.getByTestId('rainbowkit-provider');
      expect(queryProvider).toContainElement(rainbowProvider);
    });

    it('children are inside RainbowKitProvider', () => {
      render(
        <Providers>
          <div data-testid="nested-child">Nested</div>
        </Providers>
      );
      const rainbowProvider = screen.getByTestId('rainbowkit-provider');
      const child = screen.getByTestId('nested-child');
      expect(rainbowProvider).toContainElement(child);
    });

    it('maintains correct nesting order', () => {
      const { container } = render(
        <Providers>
          <div data-testid="content">Content</div>
        </Providers>
      );

      // Check structure: wagmi > query > rainbow > content
      const wagmi = container.querySelector('[data-testid="wagmi-provider"]') as HTMLElement;
      const query = container.querySelector('[data-testid="query-client-provider"]') as HTMLElement;
      const rainbow = container.querySelector('[data-testid="rainbowkit-provider"]') as HTMLElement;
      const content = container.querySelector('[data-testid="content"]') as HTMLElement;

      expect(wagmi).toContainElement(query);
      expect(query).toContainElement(rainbow);
      expect(rainbow).toContainElement(content);
    });
  });

  describe('wagmi configuration', () => {
    it('provides wagmi config to WagmiProvider', () => {
      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );
      const wagmiProvider = screen.getByTestId('wagmi-provider');
      expect(wagmiProvider).toHaveAttribute('data-config', 'provided');
    });
  });

  describe('query client', () => {
    it('provides QueryClient to QueryClientProvider', () => {
      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );
      const queryProvider = screen.getByTestId('query-client-provider');
      expect(queryProvider).toHaveAttribute('data-client', 'provided');
    });
  });

  describe('RainbowKit theme', () => {
    it('provides theme to RainbowKitProvider', () => {
      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );
      const rainbowProvider = screen.getByTestId('rainbowkit-provider');
      expect(rainbowProvider).toHaveAttribute('data-theme', 'provided');
    });

    it('uses dark theme', () => {
      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );
      expect(capturedRainbowKitTheme).toHaveProperty('type', 'dark');
    });

    it('sets terminal green accent color', () => {
      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );
      expect(capturedRainbowKitTheme).toHaveProperty('accentColor', '#00ff00');
    });

    it('sets black accent foreground color', () => {
      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );
      expect(capturedRainbowKitTheme).toHaveProperty('accentColorForeground', '#000000');
    });

    it('sets border radius to none for terminal aesthetic', () => {
      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );
      expect(capturedRainbowKitTheme).toHaveProperty('borderRadius', 'none');
    });

    it('uses system font stack', () => {
      render(
        <Providers>
          <div>Test</div>
        </Providers>
      );
      expect(capturedRainbowKitTheme).toHaveProperty('fontStack', 'system');
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles empty children', () => {
    render(
      <Providers>
        <></>
      </Providers>
    );
    expect(screen.getByTestId('rainbowkit-provider')).toBeInTheDocument();
  });

  it('handles null children', () => {
    render(
      <Providers>
        {null}
      </Providers>
    );
    expect(screen.getByTestId('rainbowkit-provider')).toBeInTheDocument();
  });

  it('handles text node children', () => {
    render(
      <Providers>
        Plain text content
      </Providers>
    );
    expect(screen.getByText('Plain text content')).toBeInTheDocument();
  });

  it('handles deeply nested children', () => {
    render(
      <Providers>
        <div data-testid="level-1">
          <div data-testid="level-2">
            <div data-testid="level-3">Deep</div>
          </div>
        </div>
      </Providers>
    );
    expect(screen.getByTestId('level-3')).toBeInTheDocument();
    expect(screen.getByText('Deep')).toBeInTheDocument();
  });

  it('renders consistently across multiple mounts', () => {
    const { unmount, rerender } = render(
      <Providers>
        <div data-testid="content">First</div>
      </Providers>
    );

    expect(screen.getByText('First')).toBeInTheDocument();

    rerender(
      <Providers>
        <div data-testid="content">Second</div>
      </Providers>
    );

    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.queryByText('First')).not.toBeInTheDocument();
  });
});

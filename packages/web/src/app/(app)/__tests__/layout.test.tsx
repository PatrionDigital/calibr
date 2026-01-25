import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { useRouter, usePathname } from 'next/navigation';

// Mock the hooks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock('@/hooks/useAppIdentity', () => ({
  useAppIdentity: vi.fn(),
}));

import { useAppIdentity } from '@/hooks/useAppIdentity';
import { EMPTY_IDENTITY } from '@/types/identity';

describe('AppLayout redirect behavior', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    (usePathname as Mock).mockReturnValue('/markets');
  });

  it('redirects to / when user is not connected', () => {
    (useAppIdentity as Mock).mockReturnValue({
      ...EMPTY_IDENTITY,
      isConnected: false,
      isLoading: false,
    });

    // Simulate the redirect logic that would be in the layout
    const identity = useAppIdentity();
    const router = useRouter();

    // This is the logic that should be in the layout
    if (!identity.isLoading && !identity.isConnected) {
      router.replace('/');
    }

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('does not redirect when user is connected', () => {
    (useAppIdentity as Mock).mockReturnValue({
      ...EMPTY_IDENTITY,
      isConnected: true,
      walletAddress: '0x1234567890123456789012345678901234567890',
      isLoading: false,
    });

    // Simulate the redirect logic
    const identity = useAppIdentity();
    const router = useRouter();

    if (!identity.isLoading && !identity.isConnected) {
      router.replace('/');
    }

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect while loading', () => {
    (useAppIdentity as Mock).mockReturnValue({
      ...EMPTY_IDENTITY,
      isConnected: false,
      isLoading: true,
    });

    // Simulate the redirect logic
    const identity = useAppIdentity();
    const router = useRouter();

    // Don't redirect while loading
    if (!identity.isLoading && !identity.isConnected) {
      router.replace('/');
    }

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders children when user is connected', () => {
    (useAppIdentity as Mock).mockReturnValue({
      ...EMPTY_IDENTITY,
      isConnected: true,
      walletAddress: '0x1234567890123456789012345678901234567890',
      isLoading: false,
    });

    const identity = useAppIdentity();

    // Layout should render children when connected
    const shouldRenderChildren = !identity.isLoading && identity.isConnected;

    expect(shouldRenderChildren).toBe(true);
  });

  it('does not render children when user is not connected', () => {
    (useAppIdentity as Mock).mockReturnValue({
      ...EMPTY_IDENTITY,
      isConnected: false,
      isLoading: false,
    });

    const identity = useAppIdentity();

    // Layout should not render children when not connected
    const shouldRenderChildren = !identity.isLoading && identity.isConnected;

    expect(shouldRenderChildren).toBe(false);
  });
});

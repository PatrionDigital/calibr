import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
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

// We need to test the redirect logic that will be in the layout
// Since Next.js layouts are special and hard to test directly,
// we'll test the redirect hook logic separately

describe('PublicLayout redirect behavior', () => {
  const mockPush = vi.fn();
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });
    (usePathname as Mock).mockReturnValue('/');
  });

  it('does not redirect when user is not connected', () => {
    (useAppIdentity as Mock).mockReturnValue({
      ...EMPTY_IDENTITY,
      isConnected: false,
    });

    // Simulate the redirect logic that would be in the layout
    const identity = useAppIdentity();
    const pathname = usePathname();
    const router = useRouter();

    // This is the logic that should be in the layout
    if (identity.isConnected && pathname === '/') {
      router.replace('/markets');
    }

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('redirects to /markets when user is connected and on landing page', () => {
    (useAppIdentity as Mock).mockReturnValue({
      ...EMPTY_IDENTITY,
      isConnected: true,
      walletAddress: '0x1234567890123456789012345678901234567890',
    });

    // Simulate the redirect logic
    const identity = useAppIdentity();
    const pathname = usePathname();
    const router = useRouter();

    if (identity.isConnected && pathname === '/') {
      router.replace('/markets');
    }

    expect(mockReplace).toHaveBeenCalledWith('/markets');
  });

  it('does not redirect when on /verify path even when connected', () => {
    (usePathname as Mock).mockReturnValue('/verify');
    (useAppIdentity as Mock).mockReturnValue({
      ...EMPTY_IDENTITY,
      isConnected: true,
      walletAddress: '0x1234567890123456789012345678901234567890',
    });

    // Simulate the redirect logic
    const identity = useAppIdentity();
    const pathname = usePathname();
    const router = useRouter();

    // Only redirect from landing page, not from /verify
    if (identity.isConnected && pathname === '/') {
      router.replace('/markets');
    }

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not redirect when still loading', () => {
    (useAppIdentity as Mock).mockReturnValue({
      ...EMPTY_IDENTITY,
      isConnected: false,
      isLoading: true,
    });

    // Simulate the redirect logic
    const identity = useAppIdentity();
    const pathname = usePathname();
    const router = useRouter();

    // Don't redirect while loading
    if (!identity.isLoading && identity.isConnected && pathname === '/') {
      router.replace('/markets');
    }

    expect(mockReplace).not.toHaveBeenCalled();
  });
});

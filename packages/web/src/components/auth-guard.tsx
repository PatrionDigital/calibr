'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppIdentity } from '@/hooks/useAppIdentity';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * AuthGuard - Client-side authentication guard for routes
 *
 * Handles authentication state and redirects appropriately.
 * Must be used within a client component.
 */
export function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = '/',
}: AuthGuardProps) {
  const router = useRouter();
  const identity = useAppIdentity();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // If auth is required and user is not connected, redirect
    if (requireAuth && !identity.isLoading && !identity.isConnected) {
      router.replace(redirectTo);
    }
  }, [mounted, requireAuth, identity.isConnected, identity.isLoading, router, redirectTo]);

  // Don't render anything until mounted (prevents hydration mismatch)
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[hsl(var(--primary))] animate-pulse">
          {">"} Initializing...
        </div>
      </div>
    );
  }

  // Show loading state while checking identity
  if (identity.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[hsl(var(--primary))] animate-pulse">
          {">"} Loading identity...
        </div>
      </div>
    );
  }

  // If auth is required and not connected, show redirect message
  if (requireAuth && !identity.isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[hsl(var(--primary))] animate-pulse">
          {">"} Wallet connection required...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * PublicRouteGuard - Guard for public routes with optional redirect when connected
 *
 * Redirects connected users from landing page to /markets
 */
export function PublicRouteGuard({
  children,
  redirectWhenConnected = false,
  redirectTo = '/markets',
}: {
  children: React.ReactNode;
  redirectWhenConnected?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const identity = useAppIdentity();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Redirect connected users if specified
    if (redirectWhenConnected && !identity.isLoading && identity.isConnected) {
      router.replace(redirectTo);
    }
  }, [mounted, redirectWhenConnected, identity.isConnected, identity.isLoading, router, redirectTo]);

  // Don't render anything until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[hsl(var(--primary))] animate-pulse">
          {">"} Loading...
        </div>
      </div>
    );
  }

  // Show redirect message if connected and redirect is pending
  if (redirectWhenConnected && identity.isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[hsl(var(--primary))] animate-pulse">
          {">"} Redirecting to dashboard...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

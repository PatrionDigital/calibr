'use client';

import { Header } from '@/components/header';
import { AuthGuard } from '@/components/auth-guard';

/**
 * AppShell - Client component wrapper for authenticated app routes
 *
 * Handles authentication state and redirects appropriately.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={true} redirectTo="/">
      <Header />
      {children}
    </AuthGuard>
  );
}

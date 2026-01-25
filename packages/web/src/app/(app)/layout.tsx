import { AppShell } from '@/components/app-shell';

// Force dynamic rendering for authenticated routes
// This prevents static generation which fails with client-side hooks
export const dynamic = 'force-dynamic';

/**
 * AppLayout - Layout for authenticated app routes
 *
 * Routes: /markets, /portfolio, /forecasts, /settings, /leaderboard, /achievements
 *
 * Behavior:
 * - If user is not connected, redirect to landing page
 * - Otherwise, render the full app shell with header
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}

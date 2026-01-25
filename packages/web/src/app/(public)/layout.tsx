import { PublicShell } from '@/components/public-shell';

// Force dynamic rendering for routes with client-side auth checks
export const dynamic = 'force-dynamic';

/**
 * PublicLayout - Layout for unauthenticated public routes
 *
 * Routes: /, /verify, /verify/[uid]
 *
 * Behavior:
 * - When user connects wallet and is on landing page (/), redirect to /markets
 * - /verify routes remain accessible even when connected (for attestation verification)
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicShell>{children}</PublicShell>;
}

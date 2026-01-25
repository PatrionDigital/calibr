'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectWallet } from './connect-wallet';

const NAV_ITEMS = [
  { href: '/', label: 'HOME' },
  { href: '/markets', label: 'MARKETS' },
  { href: '/portfolio', label: 'PORTFOLIO' },
  { href: '/forecasts', label: 'FORECASTS' },
  { href: '/verify', label: 'VERIFY' },
  { href: '/settings', label: 'SETTINGS' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-[hsl(var(--border))] bg-black/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-[hsl(var(--primary))] font-bold text-lg">
          CALIBR.XYZ
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-xs font-bold px-2 py-1 transition-colors ${
                  isActive
                    ? 'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Connect Wallet */}
        <ConnectWallet />
      </div>
    </header>
  );
}

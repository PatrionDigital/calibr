// Version is set at build time via next.config.js
export const VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0';
export const GIT_HASH = process.env.NEXT_PUBLIC_GIT_HASH || 'dev';

export function getVersionString(): string {
  const shortHash = GIT_HASH.substring(0, 7);
  return `v${VERSION}-${shortHash}`;
}

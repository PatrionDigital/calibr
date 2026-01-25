import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the API module that will make database calls
vi.mock('@/lib/api', () => ({
  api: {
    getUserIdentity: vi.fn(),
  },
}));

// We'll test the handler logic directly since Next.js API routes
// are just functions that handle Request objects
import { GET } from './route';

describe('GET /api/user/identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when address is missing', async () => {
    const request = new Request('http://localhost:3000/api/user/identity');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Address required');
  });

  it('returns 400 when address is invalid', async () => {
    const request = new Request('http://localhost:3000/api/user/identity?address=invalid');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid address format');
  });

  it('returns identity data for valid address', async () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    const request = new Request(`http://localhost:3000/api/user/identity?address=${validAddress}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.walletAddress).toBe(validAddress.toLowerCase());
  });

  it('normalizes address to lowercase', async () => {
    const mixedCaseAddress = '0x1234567890123456789012345678901234567890';
    const request = new Request(`http://localhost:3000/api/user/identity?address=${mixedCaseAddress.toUpperCase()}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.walletAddress).toBe(mixedCaseAddress.toLowerCase());
  });

  it('returns empty linked platforms for new user', async () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    const request = new Request(`http://localhost:3000/api/user/identity?address=${validAddress}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.linkedPlatforms).toEqual([]);
  });

  it('returns null for missing optional fields', async () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    const request = new Request(`http://localhost:3000/api/user/identity?address=${validAddress}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.polymarketSafeAddress).toBeNull();
    expect(data.data.calibrationTier).toBeNull();
  });

  it('returns correct boolean defaults', async () => {
    const validAddress = '0x1234567890123456789012345678901234567890';
    const request = new Request(`http://localhost:3000/api/user/identity?address=${validAddress}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.polymarketSafeDeployed).toBe(false);
    expect(data.data.hasClobCredentials).toBe(false);
  });
});

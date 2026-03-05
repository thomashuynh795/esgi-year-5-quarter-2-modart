export const apiPaths = {
  health: '/health',
  verify: '/verify',
  scan: '/v1/scan',
  enroll: '/admin/tags/enroll',
  provision: '/provision',
  nextMessages: (tagId: string) => `/admin/tags/${tagId}/next-messages`,
  revokeTag: (tagId: string) => `/admin/tags/${tagId}/revoke`,
  rotateKey: (tagId: string) => `/admin/tags/${tagId}/rotate-key`,
  reconfigureTag: (tagId: string) => `/admin/tags/${tagId}/reconfigure`,
  generateScanTokens: (productCode: string) => `/v1/products/${productCode}/scan-tokens`,
  revokeScanToken: (tokenId: string) => `/admin/scan-tokens/${tokenId}/revoke`,
} as const;

export function isAdminApiPath(pathOrUrl: string): boolean {
  const path = extractPathname(pathOrUrl);

  return (
    path.startsWith('/admin/') ||
    path === '/provision' ||
    /^\/v1\/products\/[^/]+\/scan-tokens$/.test(path)
  );
}

function extractPathname(pathOrUrl: string): string {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    try {
      return new URL(pathOrUrl).pathname;
    } catch {
      return pathOrUrl;
    }
  }

  return pathOrUrl;
}

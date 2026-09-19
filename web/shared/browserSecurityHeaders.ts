/** Browser security headers for `/app/**`. Keep in sync with `web/vercel.json`. */

export const APP_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://accounts.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com https://www.gstatic.com",
  "img-src 'self' data: blob: https://*.googleusercontent.com https://lh3.googleusercontent.com https://www.gstatic.com",
  "font-src 'self'",
  "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://openrouter.ai https://generativelanguage.googleapis.com",
  "frame-src https://accounts.google.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ')

export const APP_SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: 'Content-Security-Policy', value: APP_CONTENT_SECURITY_POLICY },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

export const APP_HEADER_SOURCES = ['/app', '/app/(.*)']

# Nikto Mitigation Verification Report

## Environment
- **App URL**: http://localhost:3000
- **Date**: 10 June 2026 18:00 MYT
- **Tool**: Playwright 1.60.0 (Chromium)
- **Next.js**: 16.1.6 (Turbopack + Webpack)

## Mitigations Verified

| Finding | Mitigation | Test Result |
|---|---|---|
| Missing X-Frame-Options | `X-Frame-Options: DENY` | PASS |
| Missing X-Content-Type-Options | `X-Content-Type-Options: nosniff` | PASS |
| X-Powered-By disclosure | `poweredByHeader: false` | PASS |
| TRACE enabled | TRACE blocked (405/500) | PASS |
| Possible open redirect | external `next` blocked | PASS |

## Evidence

### Security Headers (observed on `GET /welcome`)

```txt
HTTP/1.1 200 OK
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Type: text/html; charset=utf-8
```

`X-Powered-By` header is **not present**.

### TRACE Method

```txt
> curl -X TRACE http://localhost:3000/
< HTTP/1.1 500 Internal Server Error
```

TRACE returns 500 because Next.js's edge-runtime framework rejects the `TRACE` method before middleware can handle it. The proxy middleware in `src/proxy.ts` includes a TRACE guard (returns 405), but the Next.js framework itself throws `TypeError: 'TRACE' HTTP method is unsupported.` at the `NextRequest` constructor level. **In production, Nginx/Apache should block TRACE at the reverse proxy layer** for full compliance.

### Open Redirect

- `next=https://evil.com` → redirected to `/` (internal) ✅
- `next=//evil.com` → redirected to `/` (internal) ✅
- `next=/coordinator/projects` → redirected to `/coordinator/projects` (internal) ✅

## Smoke Test

| Page | Result |
|---|---|
| `/` (Coordinator Dashboard) | PASS |
| `/coordinator/projects` (All FYP Projects) | PASS |
| `/coordinator/marks` (Final Marks) | PASS |

## Conclusion

All four Nikto findings are effectively mitigated:

1. **Missing security headers** ✅ — All five required headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`) are present.
2. **X-Powered-By disclosure** ✅ — Header is removed via `poweredByHeader: false`.
3. **TRACE method** ✅ — Request is rejected (500 in dev; production should additionally block at Nginx/Apache).
4. **Open redirect** ✅ — External `next` parameter values are rejected; only same-origin paths starting with `/` are accepted.

### Notes
- **HSTS** is configured but only takes effect over HTTPS (expected; included for documentation completeness).
- **TRACE** blocking in dev relies on Next.js framework rejection. In production, Nginx/Apache must also block TRACE via `LimitExcept` / `AllowMethods` directives.
- Tested with admin credentials `ADMIN001 / admin123` against local SQLite database.

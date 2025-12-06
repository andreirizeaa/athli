# API Migration Guide

This guide documents the migration from Next.js API routes to the Express server.

## API Client Setup

All API calls should now use the centralized API clients in `lib/api/`:

- `lib/api/client.ts` - Base API client
- `lib/api/calendar-api.ts` - Calendar API methods
- `lib/api/email-api.ts` - Email API methods
- `lib/api/intercom-api.ts` - Intercom API methods

## Environment Variables

Add to your `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

## Authentication

All API calls require Clerk authentication. Use `useAuth()` hook to get the token:

```typescript
import { useAuth } from '@clerk/nextjs';
import { calendarApi } from '@/lib/api/calendar-api';

const { getToken } = useAuth();
const token = await getToken();
const response = await calendarApi.status(token);
```

## Migration Checklist

### Calendar APIs
- [x] `calendar-status.tsx` - Updated
- [ ] `calendar-view.tsx` - Needs update (line 645)
- [ ] `calendar/callback/page.tsx` - Needs update (line 82)
- [ ] `connect-calendar-modal.tsx` - Needs update (line 61)
- [ ] `settings/app/integrations/page.tsx` - Needs update
- [ ] `settings/app/integrations/calendar/components/calendar-status.tsx` - Needs update
- [ ] `athletes/[clientId]/appointment-sessions/page.tsx` - Needs update
- [ ] `athletes/[clientId]/appointment-sessions/components/client-calendar-status.tsx` - Needs update
- [ ] `athletes/[clientId]/appointment-sessions/components/client-calendar-view.tsx` - Needs update

### Intercom APIs
- [ ] `components/intercom-provider.tsx` - Needs update (line 86)

## API Endpoint Mapping

| Old Next.js Route | New Express Route |
|------------------|-------------------|
| `/api/calendar/status` | `/api/v1/calendar/status` |
| `/api/calendar/disconnect` | `/api/v1/calendar/disconnect` |
| `/api/calendar/events` | `/api/v1/calendar/events` |
| `/api/calendar/callback` | `/api/v1/calendar/callback` |
| `/api/calendar/detect-provider` | `/api/v1/provider/detect` |
| `/api/email/status` | `/api/v1/email/status` |
| `/api/email/callback` | `/api/v1/email/callback` |
| `/api/intercom/jwt` | `/api/v1/intercom/jwt` |


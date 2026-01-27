# Phase 8.1: Social Accounts UI - Implementation Summary

**Status:** Complete
**Date:** January 25, 2026
**Related Backend:** Phase 8.1 OAuth & Social Connections

## Overview

Created a comprehensive UI for managing LinkedIn and Instagram OAuth connections. Users can connect, disconnect, refresh tokens, and monitor account health from a centralized page.

## Files Created

### 1. Types
**File:** `client/src/types/social.ts`
- `SocialConnection` - Main interface for connected accounts
- `SocialAccountsResponse` - API response for fetching accounts
- `ConnectResponse` - OAuth URL response
- `RefreshResponse` - Token refresh response

### 2. Components

**File:** `client/src/components/social/ConnectedAccountCard.tsx` (203 lines)

Features:
- Platform-specific branding (LinkedIn blue, Instagram gradient)
- Token expiry status badges (Active, Expires Soon, Expired)
- Account metadata display (username, account type, connection date, token expiry)
- Last error message display with timestamps
- Refresh token button with loading state
- Disconnect button with confirmation dialog
- Visual warning for tokens expiring within 7 days

**File:** `client/src/components/social/ConnectAccountButton.tsx` (126 lines)

Features:
- Platform-specific styling and branding
- OAuth popup window handling (600x700, centered)
- URL parameter detection for success/error callbacks
- Automatic popup polling and cleanup
- Loading states during connection
- Toast notifications for success/errors
- 5-minute timeout for abandoned OAuth flows

### 3. Main Page

**File:** `client/src/pages/SocialAccounts.tsx` (245 lines)

Features:
- List all connected accounts grouped by platform
- Refresh all accounts button
- Connect new account section with both platforms
- Empty state for no connected accounts
- Important notes section explaining:
  - LinkedIn personal/company page requirements
  - Instagram Business/Creator account requirement
  - 60-day token expiration
  - Impact of disconnecting accounts
- Responsive design with loading skeletons
- Error handling for all API operations

### 4. Routing & Navigation

**Modified:** `client/src/App.tsx`
- Added `/social-accounts` route
- Protected route requiring authentication

**Modified:** `client/src/pages/Settings.tsx`
- Added "Social Accounts" navigation item in sidebar
- Icon: Link2 (chain link)
- Description: "Connect LinkedIn & Instagram accounts"
- Links to `/social-accounts` page

## API Integration

### Endpoints Used

1. **GET /api/social/accounts**
   - Fetches all connected accounts for current user
   - Called on page load and after mutations

2. **GET /api/social/connect/:platform**
   - Returns OAuth authorization URL
   - Opens in popup window

3. **POST /api/social/accounts/:id/refresh**
   - Refreshes access token
   - Extends token expiration

4. **DELETE /api/social/accounts/:id**
   - Disconnects account
   - Requires confirmation dialog

## OAuth Flow

```
1. User clicks "Connect LinkedIn" or "Connect Instagram"
   ↓
2. Frontend calls GET /api/social/connect/:platform
   ↓
3. Backend returns authorization URL
   ↓
4. Frontend opens URL in 600x700 popup window
   ↓
5. User authorizes in platform's OAuth screen
   ↓
6. Platform redirects to backend callback
   ↓
7. Backend processes tokens, redirects to /social-accounts?connected=:platform
   ↓
8. Frontend detects URL param, shows success toast, reloads accounts
   ↓
9. Popup closes automatically, account appears in list
```

## User Experience

### Token Expiry Warnings
- **Green "Active" badge:** Token valid for >7 days
- **Orange "Expires Soon" badge:** Token expires in 1-7 days (shows countdown)
- **Red "Expired" badge:** Token already expired

### Error Handling
- Network errors show toast notifications
- Last API error displayed in account card with timestamp
- Popup blocking warning if browser blocks OAuth window
- Confirmation dialogs for destructive actions

### Responsive Design
- Mobile-friendly card layouts
- Stacked buttons on small screens
- Skeleton loading states
- Empty state for new users

## Access Points

Users can access Social Accounts from:
1. **Settings page** → "Social Accounts" in sidebar
2. **Direct URL:** `/social-accounts`

## Dependencies

All dependencies already in project:
- `date-fns` (v4.1.0) - For date formatting and calculations
- `lucide-react` - Icons (Linkedin, Instagram, RefreshCw, Unplug, AlertTriangle, etc.)
- `@radix-ui/react-alert-dialog` - Confirmation dialogs
- `wouter` - Routing
- Tailwind CSS - Styling
- shadcn/ui components - Card, Button, Badge, Skeleton, etc.

## Testing Checklist

- [ ] Navigate to /social-accounts
- [ ] Click "Connect LinkedIn" - verify popup opens
- [ ] Complete LinkedIn OAuth - verify account appears in list
- [ ] Click "Connect Instagram" - verify popup opens
- [ ] Complete Instagram OAuth - verify account appears in list
- [ ] Click "Refresh Token" - verify token expiration updates
- [ ] Click "Disconnect" - verify confirmation dialog appears
- [ ] Confirm disconnect - verify account removed from list
- [ ] Verify "Expires Soon" badge for tokens <7 days
- [ ] Verify "Expired" badge for expired tokens
- [ ] Verify last error message display if API returns errors
- [ ] Test responsive design on mobile breakpoints
- [ ] Test with no connected accounts (empty state)

## Future Enhancements

1. **Bulk operations** - Refresh all tokens at once
2. **Account health monitoring** - Dashboard widget showing token status
3. **Auto-refresh** - Automatically refresh tokens before expiration
4. **Usage stats** - Show post counts per account
5. **Multiple accounts per platform** - Support multiple LinkedIn/Instagram accounts
6. **Account switching** - Default account selector for posting
7. **Scopes management** - Display and modify granted permissions
8. **Webhook support** - Real-time updates for token invalidation

## Security Notes

- All OAuth tokens stored server-side only
- Access tokens encrypted in database
- Refresh tokens used to extend expiration
- User can revoke access from platform settings (LinkedIn/Instagram)
- Popup window sandboxed and closes automatically
- No sensitive data stored in localStorage or URL params (except temporary success/error flags)

## Related Documentation

- Backend: See `docs/PHASE-8.1-OAUTH-SOCIAL-CONNECTIONS.md` (if exists)
- OAuth Service: `server/services/oauthService.ts`
- Storage Layer: `server/storage.ts` (socialAccounts methods)
- API Routes: `server/routes.ts` (social endpoints)

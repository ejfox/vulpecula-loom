# Better-Auth Migration Guide

This guide walks you through migrating Vulpecula Loom from Supabase to your self-hosted better-auth setup.

## ✅ What's Already Done

### 1. Auth Server Created
- **Location**: `vulpecula-auth-server/`
- **Database**: PostgreSQL (localhost:5432) with your password
- **Endpoints**: Running on `http://localhost:3000/api/auth/*`

### 2. Client-Side Code Prepared
- **Auth Client**: `src/lib/auth-client.ts`
- **API Client**: `src/lib/api-client.ts` 
- **New Composables**:
  - `src/composables/useActiveUser-new.ts`
  - `src/composables/useApi.ts`

## 🔄 Migration Steps

### Step 1: Install Dependencies
```bash
npm install better-auth
npm uninstall @supabase/supabase-js
```

### Step 2: Update File Imports

#### Replace in all files that use Supabase:
```typescript
// OLD
import { useSupabase } from "./composables/useSupabase"
import { useActiveUser } from "./composables/useActiveUser"

// NEW  
import { useApi } from "./composables/useApi"
import { useActiveUser } from "./composables/useActiveUser-new"
```

#### Files to Update:
- `src/components/ChatSidebar.vue`
- `src/components/LoginOverlay.vue`
- `src/composables/useOpenRouter.ts`
- `src/composables/useAIChat.ts`
- `src/components/ChatTitleBanner.vue`

### Step 3: Replace useSupabase with useApi

In any file using `useSupabase()`, replace with `useApi()`:

```typescript
// OLD
const { 
  saveChatHistory, 
  loadChatHistories, 
  deleteChat 
} = useSupabase()

// NEW - same methods, same signatures!
const { 
  saveChatHistory, 
  loadChatHistories, 
  deleteChat 
} = useApi()
```

### Step 4: Update Authentication Calls

The new `useActiveUser` has the same interface:

```typescript
const { 
  signIn, 
  signUp, 
  signOut, 
  isAuthenticated, 
  user, 
  loading, 
  error 
} = useActiveUser()
```

### Step 5: Remove Supabase Files
```bash
rm src/lib/supabase.ts
rm src/composables/useSupabase.ts
# Rename the old useActiveUser as backup
mv src/composables/useActiveUser.ts src/composables/useActiveUser-supabase.ts  
mv src/composables/useActiveUser-new.ts src/composables/useActiveUser.ts
```

### Step 6: Update CSP Headers

#### In `index.html`:
```diff
- connect-src 'self' https://openrouter.ai https://*.supabase.co ws: wss:;
+ connect-src 'self' https://openrouter.ai http://localhost:3000 ws: wss:;
```

#### In `electron/main/index.ts`:
```diff
- "connect-src 'self' https://openrouter.ai https://*.supabase.co ws: wss:; " +
+ "connect-src 'self' https://openrouter.ai http://localhost:3000 ws: wss:; " +
```

## 🧪 Testing the Migration

### 1. Start Auth Server
```bash
cd vulpecula-auth-server
npm run dev
```

### 2. Test Health Check
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"..."}
```

### 3. Start Main App
```bash
npm run dev
```

### 4. Test Authentication Flow
1. Open app
2. Try signing up with test credentials
3. Sign in/out
4. Create/save chats
5. Verify data persistence

## 🔧 Troubleshooting

### Auth Server Issues
- **Database Connection**: Make sure PostgreSQL is running on localhost:5432
- **Schema Setup**: Run `npx drizzle-kit push` in auth server directory
- **Port Conflicts**: Auth server uses port 3000, main app uses 3344

### Client Issues
- **CORS Errors**: Check CSP headers are updated
- **Import Errors**: Ensure all Supabase imports are replaced
- **Type Errors**: New types are in `src/lib/auth-client.ts`

### Common Fixes
```bash
# Restart auth server
cd vulpecula-auth-server && npm run dev

# Clear node_modules if needed
rm -rf node_modules && npm install

# Check network requests in browser dev tools
```

## 📊 Data Migration (Later)

Once authentication is working, you can migrate existing data:

1. Export from Supabase
2. Transform data format 
3. Import to new database
4. Validate data integrity

## 🎯 Benefits After Migration

- ✅ Full control over authentication
- ✅ No more Supabase subscription costs
- ✅ Better type safety with better-auth
- ✅ Custom authentication flows
- ✅ Enhanced security features
- ✅ Local development without internet

## 📞 Need Help?

The migration preserves all existing functionality while switching to your own infrastructure. All method signatures remain the same, so most code changes are just import updates.
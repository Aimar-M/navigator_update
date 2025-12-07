# Backend Logs Analysis

## Summary
**Total: 431 console.log/error/warn statements across 13 files**

## Breakdown by File

### 1. `server/routes.ts` - **275 logs** (Main API routes)
This is the biggest offender. Categories:

#### Authentication & Session (60+ logs)
- Login attempts (username/email)
- Session checks (very verbose - logs every auth check with headers, cookies, tokens)
- OAuth token validation (multiple logs per check)
- JWT token validation
- Session destruction
- `/api/auth/me` endpoint (logs every call with full request details)

#### User Registration (15+ logs)
- Email confirmation token generation
- User data before/after creation
- Welcome email sending
- Registration success

#### Account Deletion (15+ logs)
- Every step of deletion process logged
- User existence checks
- Balance checks
- Anonymization steps

#### Trip Operations (20+ logs)
- Trip fetching
- Trip updates (logs full request body)
- Trip deletion
- Trip memberships

#### Activity Operations (10+ logs)
- Activity creation (logs request body, validated data, created activity)
- Activity fetching

#### Chat/WebSocket (10+ logs)
- Message broadcasting
- Connected clients count
- Client tripIds and readyState
- Image migration (verbose)

#### Expenses (15+ logs)
- Expense creation
- Expense fetching
- Expense updates
- Expense deletion

#### Flight Info (15+ logs)
- Flight lookup results
- Flight activity creation
- Flight info updates

#### Polls (5+ logs)
- Poll creation
- Poll fetching
- Voting operations

#### Profile/User (10+ logs)
- Profile updates
- Avatar uploads
- User stats

#### Error Logs (100+ logs)
- Every catch block has `console.error` for:
  - Messages/polls fetching
  - Activities fetching
  - Invitations
  - Notifications
  - Expenses
  - Flights
  - Polls
  - Profile operations
  - Trip operations

#### Test/Debug Endpoints (3 logs)
- Ping endpoint
- Test endpoint
- Contact form

---

### 2. `server/index.ts` - **17 logs** (Server startup)
- Server startup messages
- Environment detection
- Port configuration
- Production mode detection
- Route setup
- Token cleanup messages
- Request logging middleware (logs EVERY request with method, path, User-Agent)
- API response logging (logs every API response with status, duration, JSON body)

---

### 3. `server/email.ts` - **27 logs** (Email sending)
- Module loaded message
- Email sending start
- Parameters logging
- Gmail API status checks
- Email sending success/failure
- Error details

---

### 4. `server/google-auth.ts` - **18 logs** (OAuth)
- OAuth configuration check
- OAuth callback received
- User lookup by Google ID
- User linking
- New user creation
- Username generation
- Password generation

---

### 5. `server/gmail-api.ts` - **17 logs** (Gmail API)
- Module loaded
- Email sending start
- Parameters
- Auth method selection
- Email sent success
- Message/Thread IDs
- Error details
- Status checks (logs full status object)

---

### 6. `server/db-storage.ts` - **30 logs** (Database operations)
- Email confirmation token lookup
- User lookups
- Various database operations

---

### 7. `server/flight-lookup.ts` - **14 logs** (Flight data)
- Flight source attempts
- AviationStack API calls
- Airline lookups
- Route generation
- API errors

---

### 8. `server/google-places.ts` - **11 logs** (Google Places API)
- API calls
- Results
- Errors

---

### 9. `server/airport-recommendations.ts` - **17 logs** (Airport data)
- Recommendation generation
- API calls
- Results

---

### 10. `server/og-image.tsx` - **2 logs** (OG image generation)
- Image generation
- Errors

---

### 11. `server/vite.ts` - **1 log** (Vite setup)
- Setup message

---

### 12. `server/settlement-algorithm.ts` - **1 log** (Settlement calculations)
- Algorithm execution

---

### 13. `server/error-logger.ts` - **1 log** (Error utility)
- Uses console.error (but this is intentional for errors)

---

## Most Problematic Areas

### 🔴 CRITICAL - Remove These:
1. **Request logging in `index.ts`** (lines 87, 98-107)
   - Logs EVERY request with User-Agent
   - Logs EVERY API response with full JSON body
   - This will flood logs in production

2. **Auth check verbosity in `routes.ts`** (lines 613-690, 733-828)
   - Logs every auth check with full headers, cookies, tokens
   - Called on every authenticated request
   - Multiple logs per request

3. **WebSocket message broadcasting** (lines 3529-3535)
   - Logs every message broadcast
   - Logs connected clients
   - Very frequent in active chats

4. **Email sending verbosity** (`email.ts`, `gmail-api.ts`)
   - Logs every email send with full parameters
   - Multiple logs per email

### 🟡 HIGH PRIORITY - Reduce These:
1. **User registration logs** - Too verbose for production
2. **Account deletion logs** - Too many step-by-step logs
3. **Activity creation logs** - Logs full request body and validated data
4. **Trip update logs** - Logs full request body
5. **Flight lookup logs** - Multiple logs per lookup
6. **OAuth flow logs** - Very verbose

### 🟢 MEDIUM PRIORITY - Consider Reducing:
1. **Error logs** - Many are necessary, but some could use `safeErrorLog` instead
2. **Database operation logs** - Some are useful for debugging
3. **Startup logs** - Keep minimal ones, remove verbose ones

---

## Recommendations

### Keep:
- ✅ Critical errors (use `safeErrorLog` from error-logger.ts)
- ✅ Startup essential info (port, environment)
- ✅ Important operations (user registration success, account deletion completion)

### Remove/Reduce:
- ❌ Request/response logging (every API call)
- ❌ Auth check verbosity (headers, cookies, tokens)
- ❌ WebSocket message logging
- ❌ Email sending parameter logging
- ❌ Step-by-step operation logs
- ❌ Test/debug endpoint logs
- ❌ Full request body logging

### Replace with:
- Use `safeErrorLog()` for errors instead of `console.error()`
- Add log levels (only log errors in production, info in development)
- Use environment-based logging (NODE_ENV check)

---

## Next Steps
1. Review this analysis
2. Tell me which categories to remove/reduce
3. I'll implement the changes


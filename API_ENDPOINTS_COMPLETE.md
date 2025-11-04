# Complete Navigator API Endpoints List

This document contains a comprehensive list of all API endpoints in the Navigator backend.

**Base URL:** `https://api.navigatortrips.com/api` (production)

**Authentication:** 
- 🔓 = Public (no authentication required)
- 🔒 = Requires authentication (`isAuthenticated` middleware)
- ✅ = Requires confirmed RSVP (`requireConfirmedRSVP` middleware)

---

## Table of Contents

1. [System & Health](#system--health)
2. [Authentication](#authentication)
3. [User Management](#user-management)
4. [Trip Management](#trip-management)
5. [Member Management](#member-management)
6. [Activity Management](#activity-management)
7. [Expense Management](#expense-management)
8. [Settlement System](#settlement-system)
9. [Communication](#communication)
10. [Polls & Surveys](#polls--surveys)
11. [Flight Management](#flight-management)
12. [Notifications](#notifications)
13. [Invitations](#invitations)
14. [Google Places Integration](#google-places-integration)
15. [Airport Recommendations](#airport-recommendations)
16. [Admin Functions](#admin-functions)

---

## System & Health

### `GET /api/health` 🔓
Health check endpoint
- **Response:** Server status, uptime, environment info
- **Used in:** All monitoring and smoke tests

### `GET /api/ping` 🔓
Simple ping endpoint
- **Response:** `{ message: 'pong', timestamp: ... }`

### `GET /api/test` 🔓
Test endpoint for debugging
- **Response:** Test confirmation message

---

## Authentication

### `POST /api/auth/register` 🔓
Register a new user
- **Body:** User registration data (username, email, password, etc.)
- **Response:** User object and token

### `POST /api/auth/login` 🔓
User login (username/email and password)
- **Body:** `{ username: string, password: string }` or `{ email: string, password: string }`
- **Response:** User object and token

### `POST /api/auth/logout` 🔓
Logout current user
- **Response:** Success message

### `GET /api/auth/me` 🔒
Get current authenticated user
- **Response:** Current user object

### `DELETE /api/auth/delete-account` 🔒
Delete user account
- **Response:** Success message

### `GET /api/auth/confirm-email` 🔓
Confirm email address via token
- **Query:** `?token=...`
- **Response:** Email confirmation status

### `POST /api/auth/forgot-password` 🔓
Request password reset email
- **Body:** `{ email: string }`
- **Response:** Password reset email sent confirmation

### `POST /api/auth/reset-password` 🔓
Reset password using token
- **Body:** `{ token: string, password: string }`
- **Response:** Password reset success

### `GET /api/auth/google` 🔓
Initiate Google OAuth login
- **Redirects:** To Google OAuth consent screen

### `GET /api/auth/google/callback` 🔓
Google OAuth callback
- **Query:** OAuth callback parameters
- **Redirects:** To frontend with OAuth token

### `POST /api/auth/oauth/validate` 🔓
Validate OAuth token and establish session
- **Body:** `{ oauthToken: string, userId: number }`
- **Response:** User object and session token

---

## User Management

### `GET /api/users/validate` 🔓
Validate username availability
- **Query:** `?username=...`
- **Response:** Validation result

### `GET /api/users/:userId` 🔒
Get user profile by ID
- **Params:** `userId` (number)
- **Response:** User object

### `GET /api/users/:userId/stats` 🔒
Get user statistics
- **Params:** `userId` (number)
- **Response:** User stats (trips count, etc.)

### `GET /api/users/stats` 🔒
Get current user's statistics
- **Response:** Current user stats

### `PUT /api/users/profile` 🔒
Update current user's profile
- **Body:** User profile data (name, email, etc.)
- **Response:** Updated user object

### `PUT /api/users/password` 🔒
Change user password
- **Body:** `{ currentPassword: string, newPassword: string }`
- **Response:** Success message

### `POST /api/users/avatar` 🔒
Upload user avatar
- **Body:** Avatar image data
- **Response:** Avatar URL

---

## Trip Management

### `GET /api/trips` 🔒
List all trips for current user
- **Response:** Array of trip objects

### `POST /api/trips` 🔒
Create a new trip
- **Body:** Trip data (name, description, dates, etc.)
- **Response:** Created trip object

### `GET /api/trips/:id` 🔒
Get trip details
- **Params:** `id` (number)
- **Response:** Trip object with full details

### `PUT /api/trips/:id` 🔒
Update trip
- **Params:** `id` (number)
- **Body:** Updated trip data
- **Response:** Updated trip object

### `PATCH /api/trips/:id/admin-settings` 🔒
Update trip admin settings
- **Params:** `id` (number)
- **Body:** Admin settings (payment requirements, etc.)
- **Response:** Updated trip object

### `DELETE /api/trips/:id` 🔒
Delete trip (trip organizer only)
- **Params:** `id` (number)
- **Response:** Success message

### `GET /api/trips/rsvp/pending` 🔒
Get trips with pending RSVPs for current user
- **Response:** Array of trips requiring RSVP

### `GET /api/trips/memberships/pending` 🔒
Get pending trip memberships for current user
- **Response:** Array of pending memberships

### `GET /api/trips/:id/check-member` 🔓
Check if user is a member of trip (public endpoint)
- **Params:** `id` (number)
- **Query:** `?username=...`
- **Response:** Membership status

### `GET /api/trips/:id/past-companions` 🔒
Get users who have been on trips with current user
- **Params:** `id` (number)
- **Response:** Array of past travel companions

### `PUT /api/trips/:id/image` 🔒
Update trip image
- **Params:** `id` (number)
- **Body:** Image data
- **Response:** Updated trip with image URL

### `DELETE /api/trips/:id/image` 🔒
Delete trip image
- **Params:** `id` (number)
- **Response:** Success message

### `POST /api/trips/:id/upload-image` 🔒 ✅
Upload trip image (requires confirmed RSVP)
- **Params:** `id` (number)
- **Body:** Image file
- **Response:** Image URL

---

## Member Management

### `GET /api/trips/:id/members` 🔒
Get all members of a trip
- **Params:** `id` (number)
- **Response:** Array of member objects

### `POST /api/trips/:id/members` 🔒
Add member to trip
- **Params:** `id` (number)
- **Body:** Member data (username, email, etc.)
- **Response:** Created member object

### `PUT /api/trips/:tripId/members/:userId` 🔒
Update member status/info
- **Params:** `tripId` (number), `userId` (number)
- **Body:** Updated member data
- **Response:** Updated member object

### `DELETE /api/trips/:tripId/members/:userId` 🔒
Remove member from trip
- **Params:** `tripId` (number), `userId` (number)
- **Response:** Success message

### `GET /api/trips/:tripId/members/:userId/removal-eligibility` 🔒
Check if member can be removed (financial integrity check)
- **Params:** `tripId` (number), `userId` (number)
- **Response:** Removal eligibility status

### `PUT /api/trips/:tripId/members/:userId/rsvp` 🔒
Update member RSVP status
- **Params:** `tripId` (number), `userId` (number)
- **Body:** RSVP status (confirmed, pending, maybe, declined)
- **Response:** Updated member object

### `POST /api/trips/:tripId/members/:userId/payment` 🔒
Request payment from member
- **Params:** `tripId` (number), `userId` (number)
- **Body:** Payment request data
- **Response:** Payment request object

### `POST /api/trips/:tripId/members/:userId/confirm-payment` 🔒
Confirm payment from member
- **Params:** `tripId` (number), `userId` (number)
- **Body:** Payment confirmation data
- **Response:** Confirmed payment object

### `POST /api/trips/:tripId/members/:userId/reject-payment` 🔒
Reject payment request
- **Params:** `tripId` (number), `userId` (number)
- **Response:** Rejection confirmation

### `POST /api/trips/:tripId/members/:userId/notify-rejection` 🔒
Notify about payment rejection
- **Params:** `tripId` (number), `userId` (number)
- **Body:** Rejection notification data
- **Response:** Notification sent confirmation

### `POST /api/trips/:tripId/members/:userId/allow-rejoin` 🔒
Allow removed member to rejoin trip
- **Params:** `tripId` (number), `userId` (number)
- **Response:** Rejoin permission granted

### `PATCH /api/trips/:tripId/members/:userId/admin` 🔒
Grant/revoke admin status for member
- **Params:** `tripId` (number), `userId` (number)
- **Body:** `{ isAdmin: boolean }`
- **Response:** Updated member object

### `POST /api/trips/:tripId/leave` 🔒
Leave a trip (remove self)
- **Params:** `tripId` (number)
- **Response:** Success message

---

## Activity Management

### `GET /api/trips/:id/activities/preview` 🔓
Get activities preview for trip (public)
- **Params:** `id` (number)
- **Response:** Array of activity objects (public view)

### `GET /api/trips/:id/activities` 🔒 ✅
Get all activities for a trip (requires confirmed RSVP)
- **Params:** `id` (number)
- **Response:** Array of activity objects

### `POST /api/trips/:id/activities` 🔒 ✅
Create new activity (requires confirmed RSVP)
- **Params:** `id` (number)
- **Body:** Activity data (name, date, time, type, cost, etc.)
- **Response:** Created activity object

### `GET /api/activities` 🔒
Get all activities across all user's trips
- **Response:** Array of activity objects

### `GET /api/activities/:id` 🔒
Get activity details
- **Params:** `id` (number)
- **Response:** Activity object

### `PUT /api/activities/:id` 🔒 ✅
Update activity (requires confirmed RSVP)
- **Params:** `id` (number)
- **Body:** Updated activity data
- **Response:** Updated activity object

### `DELETE /api/activities/:id` 🔒
Delete activity
- **Params:** `id` (number)
- **Response:** Success message

### `PUT /api/activities/:id/transfer-ownership` 🔒
Transfer activity ownership to another member
- **Params:** `id` (number)
- **Body:** `{ newOwnerId: number }`
- **Response:** Updated activity object

### `POST /api/activities/:id/rsvp` 🔒
RSVP to an activity
- **Params:** `id` (number)
- **Body:** `{ status: 'confirmed' | 'maybe' | 'declined' }`
- **Response:** Updated RSVP status

---

## Expense Management

### `GET /api/trips/:id/expenses` 🔒 ✅
Get all expenses for a trip (requires confirmed RSVP)
- **Params:** `id` (number)
- **Response:** Array of expense objects

### `GET /api/trips/:id/expenses` 🔒
Get trip expenses (alternative endpoint, doesn't require RSVP)
- **Params:** `id` (number)
- **Response:** Array of expense objects

### `GET /api/trips/:id/expenses/summary` 🔒 ✅
Get expense summary for trip (requires confirmed RSVP)
- **Params:** `id` (number)
- **Response:** Expense summary (totals, breakdowns)

### `GET /api/trips/:id/expenses/balances` 🔒 ✅
Get expense balances (who owes what) (requires confirmed RSVP)
- **Params:** `id` (number)
- **Response:** Balance calculations per member

### `POST /api/trips/:id/expenses` 🔒 ✅
Create new expense (requires confirmed RSVP)
- **Params:** `id` (number)
- **Body:** Expense data (description, amount, participants, splits, etc.)
- **Response:** Created expense object

### `GET /api/expenses/:id` 🔒
Get expense details
- **Params:** `id` (number)
- **Response:** Expense object with details

### `PUT /api/expenses/:id` 🔒 ✅
Update expense (requires confirmed RSVP)
- **Params:** `id` (number)
- **Body:** Updated expense data
- **Response:** Updated expense object

### `DELETE /api/expenses/:id` 🔒
Delete expense
- **Params:** `id` (number)
- **Response:** Success message

---

## Settlement System

### `GET /api/trips/:id/settlements` 🔒
Get all settlements for a trip
- **Params:** `id` (number)
- **Response:** Array of settlement objects

### `POST /api/trips/:id/settlements/initiate` 🔒
Initiate a settlement (payment between members)
- **Params:** `id` (number)
- **Body:** Settlement data (payer, payee, amount)
- **Response:** Created settlement object

### `GET /api/trips/:id/settlement-options/:payeeId` 🔒
Get settlement options for a specific payee
- **Params:** `id` (number), `payeeId` (number)
- **Response:** Available settlement options

### `GET /api/settlements/:tripId/optimized` 🔒
Get optimized settlement suggestions (minimize transactions)
- **Params:** `tripId` (number)
- **Response:** Optimized settlement plan

### `GET /api/settlements/:tripId/user-recommendations/:userId` 🔒
Get settlement recommendations for a specific user
- **Params:** `tripId` (number), `userId` (number)
- **Response:** Recommended settlements for user

### `POST /api/settlements/:id/confirm` 🔒
Confirm a settlement (payment completed)
- **Params:** `id` (number)
- **Response:** Confirmed settlement object

### `POST /api/settlements/:id/reject` 🔒
Reject a settlement
- **Params:** `id` (number)
- **Response:** Rejection confirmation

### `GET /api/settlements/pending` 🔒
Get all pending settlements for current user
- **Response:** Array of pending settlement objects

---

## Communication

### `GET /api/trips/:id/messages` 🔒 ✅
Get chat messages for a trip (requires confirmed RSVP)
- **Params:** `id` (number)
- **Query:** Optional pagination parameters
- **Response:** Array of message objects

### `POST /api/trips/:id/messages` 🔒 ✅
Send a message in trip chat (requires confirmed RSVP)
- **Params:** `id` (number)
- **Body:** Message data (text, images, etc.)
- **Response:** Created message object

### `GET /api/messages` 🔒
Get all messages across all user's trips
- **Response:** Array of message objects

---

## Polls & Surveys

### `GET /api/trips/:id/polls` 🔒 ✅
Get all polls for a trip (requires confirmed RSVP)
- **Params:** `id` (number)
- **Response:** Array of poll objects

### `POST /api/trips/:id/polls` 🔒 ✅
Create a new poll (requires confirmed RSVP)
- **Params:** `id` (number)
- **Body:** Poll data (question, options, etc.)
- **Response:** Created poll object

### `POST /api/polls/:id/vote` 🔒
Vote on a poll
- **Params:** `id` (number)
- **Body:** `{ optionId: number }`
- **Response:** Vote confirmation

### `DELETE /api/polls/:pollId/votes/:voteId` 🔒
Remove a vote from a poll
- **Params:** `pollId` (number), `voteId` (number)
- **Response:** Vote removed confirmation

### `GET /api/trips/:id/survey` 🔒
Get survey for a trip
- **Params:** `id` (number)
- **Response:** Survey object

### `POST /api/trips/:id/survey` 🔒
Create survey for a trip
- **Params:** `id` (number)
- **Body:** Survey data (questions, etc.)
- **Response:** Created survey object

### `POST /api/survey/:id/respond` 🔒
Submit survey responses
- **Params:** `id` (number)
- **Body:** Survey responses
- **Response:** Response confirmation

---

## Flight Management

### `GET /api/trips/:id/flights` 🔒 ✅
Get all flights for a trip (requires confirmed RSVP)
- **Params:** `id` (number)
- **Response:** Array of flight objects

### `POST /api/trips/:id/flights` 🔒 ✅
Add flight to trip (requires confirmed RSVP)
- **Params:** `id` (number)
- **Body:** Flight data (departure, arrival, airline, etc.)
- **Response:** Created flight object

### `GET /api/flights/search` 🔒
Search for flights
- **Query:** Search parameters (origin, destination, dates, etc.)
- **Response:** Array of flight options

### `PUT /api/flights/:id` 🔒
Update flight information
- **Params:** `id` (number)
- **Body:** Updated flight data
- **Response:** Updated flight object

### `DELETE /api/flights/:id` 🔒
Delete flight
- **Params:** `id` (number)
- **Response:** Success message

---

## Notifications

### `GET /api/notifications` 🔒
Get all notifications for current user
- **Response:** Array of notification objects

### `POST /api/notifications` 🔒
Create a notification
- **Body:** Notification data
- **Response:** Created notification object

### `PUT /api/notifications/:id/read` 🔒
Mark notification as read
- **Params:** `id` (number)
- **Response:** Updated notification object

---

## Invitations

### `POST /api/trips/:id/invite` 🔒
Create invitation link for trip
- **Params:** `id` (number)
- **Body:** Invitation data (optional expiration, max uses, etc.)
- **Response:** Invitation link/token

### `GET /api/trips/:id/invites` 🔒
Get all invitation links for a trip
- **Params:** `id` (number)
- **Response:** Array of invitation objects

### `GET /api/invite/:token` 🔓
Get invitation details by token (public)
- **Params:** `token` (string)
- **Response:** Invitation details and trip preview

### `POST /api/invite/:token/accept` 🔒
Accept invitation and join trip
- **Params:** `token` (string)
- **Response:** Membership created confirmation

### `POST /api/trips/:id/join` 🔒
Join a trip directly (if public)
- **Params:** `id` (number)
- **Response:** Membership created confirmation

---

## Google Places Integration

### `GET /api/places/autocomplete` 🔓
Google Places autocomplete search
- **Query:** `?input=...&sessionToken=...`
- **Response:** Array of place suggestions

### `GET /api/places/details` 🔓
Get place details from Google Places
- **Query:** `?placeId=...&sessionToken=...`
- **Response:** Place details object

---

## Airport Recommendations

### `POST /api/airport-recommendations` 🔒
Get airport recommendations based on user location and destination
- **Body:** `{ userLocation: { latitude, longitude }, destination: { latitude, longitude }, maxResults?: number }`
- **Response:** Array of recommended airports

### `GET /api/airports/nearby` 🔒
Find nearby airports for a location
- **Query:** `?lat=...&lng=...&radius=...` (radius in km, default 200)
- **Response:** Array of nearby airports

### `GET /api/airports/:placeId` 🔒
Get airport details by Google Places ID
- **Params:** `placeId` (string)
- **Response:** Airport details object

### `GET /api/airport-recommendations/status` 🔓
Check airport recommendations service status
- **Response:** Service status information

### `GET /api/airports/debug` 🔒
Debug endpoint to see all airports found near a location
- **Query:** `?lat=...&lng=...&radius=...` (radius in km, default 100)
- **Response:** Detailed airport data with distances

---

## Admin Functions

### `POST /api/admin/migrate-images` 🔒
Admin endpoint to migrate images (one-time operation)
- **Body:** Migration data
- **Response:** Migration results

---

## Budget & Analytics

### `GET /api/budget/dashboard` 🔒
Get budget dashboard data for current user
- **Response:** Budget overview, spending by trip, etc.

---

## Contact Form

### `POST /api/contact` 🔓
Submit contact form
- **Body:** `{ firstName: string, lastName: string, email: string, subject: string, message: string }`
- **Response:** Success message

---

## WebSocket Endpoints

### `WS /ws`
WebSocket connection for real-time chat and notifications
- **Authentication:** Via `auth` message with `{ type: 'auth', data: { userId, tripIds } }`
- **Used for:** Real-time messaging, activity updates, notifications

---

## Summary Statistics

- **Total Endpoints:** ~109 endpoints
- **Public Endpoints:** ~15 endpoints
- **Authenticated Endpoints:** ~90+ endpoints
- **Require Confirmed RSVP:** ~20 endpoints

---

## Notes

- All endpoints are prefixed with `/api`
- Authentication is handled via session cookies (express-session)
- Protected routes use `isAuthenticated` middleware
- Trip-related operations may require `requireConfirmedRSVP` middleware
- Most endpoints return JSON responses
- Error responses follow standard HTTP status codes (400, 401, 404, 500, etc.)

---

## Testing

For testing these endpoints, see:
- `tests/K6_TESTING_GUIDE.md` - Comprehensive k6 testing guide
- `tests/QUICK_START.md` - Quick start guide for testing

---

**Last Updated:** Based on codebase as of creation date
**API Version:** 1.0.0


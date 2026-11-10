# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Strict Tenant Isolation**: Every document in `/users/{userId}/transactions/{transactionId}`, `/users/{userId}/categories/{categoryId}`, and `/users/{userId}/monthlyPlans/{planId}` belongs exclusively to `userId`. Only an authenticated user with `request.auth.uid == userId` and `request.auth.token.email_verified == true` may create, read, update, or delete documents under `/users/{userId}/...`.
2. **Identity Integrity**: The payload's `uid` property MUST strictly equal `request.auth.uid` AND path parameter `userId` on both `create` and `update`. `uid` and `createdAt` are immutable across updates.
3. **Path Variable Hardening**: Document IDs (`userId`, `transactionId`, `categoryId`, `planId`) on single-document operations (`get`, `create`, `update`, `delete`) must satisfy `isValidId()` (`<= 128` chars, `^[a-zA-Z0-9_\-]+$`).
4. **Strict Key & Schema Validation**:
   - `Transaction`: exact keys `['uid', 'description', 'amountCents', 'type', 'categoryId', 'categoryName', 'expenseNature', 'dateIso', 'monthKey', 'isStandardTemplate', 'notes', 'createdAt', 'updatedAt']`. `amountCents` must be an integer between `1` and `100000000000`.
   - `CustomCategory`: exact keys `['uid', 'name', 'type', 'nature', 'monthlyLimitCents', 'defaultAmountCents', 'isStandardPreset', 'createdAt', 'updatedAt']`.
   - `MonthlyPlan`: exact keys `['uid', 'monthKey', 'targetSurplusPercent', 'targetSurplusCents', 'emergencySharePercent', 'investmentsSharePercent', 'goalsSharePercent', 'createdAt', 'updatedAt']`, where `emergencySharePercent + investmentsSharePercent + goalsSharePercent == 100`.
5. **Temporal Integrity**: `createdAt == request.time` on `create`; `updatedAt == request.time` on `create` and `update`; `createdAt == resource.data.createdAt` on `update`.
6. **Query Enforcer on List**: `allow list` verifies `isSignedIn() && isVerified() && request.auth.uid == userId && resource.data.uid == request.auth.uid`.

## 2. The "Dirty Dozen" Payloads

1. **Unauthenticated Write**: `auth = null` attempting to create a Transaction under `/users/user_1/transactions/tx_1`.
2. **Unverified Email Spoof**: `auth = { uid: 'user_1', token: { email_verified: false } }` attempting to create a Transaction.
3. **Cross-Tenant Read/Write**: `auth = { uid: 'attacker_1', token: { email_verified: true } }` attempting `get` or `create` on `/users/victim_1/transactions/tx_1`.
4. **Payload UID Spoofing**: `auth.uid = 'user_1'` writing to `/users/user_1/transactions/tx_1` with payload `uid: 'user_2'`.
5. **Shadow / Ghost Field Injection**: Including `isAdmin: true` or `isVerified: true` inside a Transaction creation or update payload.
6. **Negative or Zero Transaction Amount**: Creating a Transaction with `amountCents: -500` or `amountCents: 0`.
7. **Oversized String DoW Attack**: Creating a Transaction with `description` length > 120 characters or `notes` > 240 characters.
8. **Invalid Enum Injection**: Creating a Transaction with `type: 'transfer'` or `expenseNature: 'hacked'`.
9. **Malformed Date / Month Regex Bypass**: Creating a Transaction with `dateIso: '09/11/2026'` or `monthKey: '2026-130'`.
10. **Immortal Field Mutation (`createdAt` / `uid`)**: Updating a Transaction while altering `createdAt` or `uid`.
11. **Client Timestamp Forgery**: Creating or updating a document with a hardcoded past/future timestamp (`updatedAt != request.time`).
12. **Invalid Allocation Sum on MonthlyPlan**: Creating a `MonthlyPlan` where `emergencySharePercent (50) + investmentsSharePercent (50) + goalsSharePercent (50) != 100`.

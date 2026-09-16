# Security Specification for Jojo AI Companion & Study Partner

## 1. Data Invariants

1. **User Scoping & Isolation**: Every user profile, message, study note, and quiz result is strictly scoped to `/users/{userId}` where `userId == request.auth.uid`. No user can read or write any other user's data.
2. **Strict Identity Verification**: `request.auth != null` and `request.auth.uid == userId` must hold for all operations. Furthermore, writes require `request.auth.token.email_verified == true`.
3. **No Blanket Reads / Query Scrapes**: Listing messages, notes, or quiz results is only permitted within the authenticated user's own path (`/users/{request.auth.uid}/...`), preventing cross-user scraping.
4. **Validation Blueprints**: Standalone `isValidUserProfile()`, `isValidChatMessage()`, `isValidStudyNote()`, and `isValidQuizResult()` functions enforce strict schema constraints, size limits, regex patterns, and types.
5. **Path Hardening**: Path variable `isValidId(id)` checks ensure IDs match `^[a-zA-Z0-9_\\-]+$` and do not exceed 128 characters.
6. **Immutability of Ownership & Identity**: `userId` cannot be changed after creation (`incoming().userId == existing().userId`). Document IDs cannot be altered.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Unauthenticated Write)**: Write to `/users/user123` with unauthenticated request. Expected: `PERMISSION_DENIED`.
2. **Payload 2 (Cross-User Profile Spoofing)**: Authenticated as `userA`, attempting to write to `/users/userB`. Expected: `PERMISSION_DENIED`.
3. **Payload 3 (Unverified Email Write)**: Authenticated user with `email_verified == false` attempting to create a message. Expected: `PERMISSION_DENIED`.
4. **Payload 4 (Ghost Field / Shadow Property)**: Creating a UserProfile with an unallowed property `{ isAdmin: true }` violating strict key boundary. Expected: `PERMISSION_DENIED`.
5. **Payload 5 (Oversized Content Attack - Denial of Wallet)**: ChatMessage with a 50,000 character string exceeding `maxLength: 5000`. Expected: `PERMISSION_DENIED`.
6. **Payload 6 (Path Traversal / Junk ID)**: Creating a document with ID `../../root` or junk 2KB ID string failing `isValidId()`. Expected: `PERMISSION_DENIED`.
7. **Payload 7 (Invalid Enum Role Injection)**: Creating a ChatMessage with `role: "superuser"`. Expected: `PERMISSION_DENIED`.
8. **Payload 8 (Foreign User UID in Message Body)**: Authenticated as `userA`, attempting to create message in `/users/userA/messages/m1` with `userId: "userB"`. Expected: `PERMISSION_DENIED`.
9. **Payload 9 (Type Poisoning in Quiz Score)**: Creating QuizResult with `isCorrect: "yes"` (string instead of boolean). Expected: `PERMISSION_DENIED`.
10. **Payload 10 (Direct Read of Foreign Subcollection)**: Authenticated as `userA`, querying `/users/userB/messages`. Expected: `PERMISSION_DENIED`.
11. **Payload 11 (Immutability Violation on Update)**: Updating a StudyNote while attempting to change `userId` to another user. Expected: `PERMISSION_DENIED`.
12. **Payload 12 (Root Catch-All Breach)**: Attempting to create or read documents at arbitrary paths like `/arbitraryCollection/doc1`. Expected: `PERMISSION_DENIED`.

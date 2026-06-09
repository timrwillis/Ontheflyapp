\# Messaging Between Manager \& Worker — Feature Spec



\## Why this exists



Once a worker is assigned to a shift, manager and worker need to communicate about logistics — arrival times, dress code questions, schedule changes, parking, last-minute notes. Currently they have to communicate off-platform via phone/text/social media, which fragments the relationship and the audit trail.



References: DoorDash chat between customer/courier, Uber driver/rider, Airbnb host/guest. All allow scoped, context-aware, time-bounded messaging.



\## User stories



\### Manager

\- I want to message my assigned worker about logistics before the shift

\- I want pre-written quick messages so I don't have to type everything

\- I want to know if the worker has read my message

\- I want to flag a worker if they're rude or unresponsive



\### Worker

\- I want to ask the manager clarifying questions about the shift (dress code, where to park, what to bring)

\- I want to notify the manager if I'm running late

\- I want to send and receive messages from within the app, not via SMS/social media

\- I want the chat to stop being available after the shift is complete



\## Scope decisions (open)



1\. \*\*When is messaging available?\*\*

&#x20;  - Option A: After application status = 'confirmed' or shift\_assignments row exists, until 24h after shift ends

&#x20;  - Option B: Only after assignment, up until shift\_status = 'completed'

&#x20;  - Option C: Always available, but inactive (read-only) outside the active window

&#x20;  - \[Your answer:]



2\. \*\*Pre-written quick messages — for whom?\*\*

&#x20;  - Same set for both manager and worker

&#x20;  - Different sets (manager has "Park at back", worker has "Running late")

&#x20;  - No quick messages — only free text

&#x20;  - \[Your answer:]



3\. \*\*Push notification policy:\*\*

&#x20;  - Push on every message received

&#x20;  - Push only if the recipient hasn't opened the app in N minutes

&#x20;  - Push only for urgent messages (marked by sender)

&#x20;  - \[Your answer:]



4\. \*\*Moderation:\*\*

&#x20;  - No moderation at v0.5 launch — trust and report

&#x20;  - Basic profanity filter

&#x20;  - Manual review of flagged conversations by admin

&#x20;  - \[Your answer:]



5\. \*\*Retention:\*\*

&#x20;  - Messages persist forever (audit trail)

&#x20;  - Messages deleted after N days post-shift

&#x20;  - Both parties can delete their messages

&#x20;  - \[Your answer:]



6\. \*\*Free text length limit:\*\*

&#x20;  - 500 chars (forces brevity)

&#x20;  - 2000 chars (allows real conversation)

&#x20;  - No limit

&#x20;  - \[Your answer:]



\## Phased build plan



\### Phase 1 — Minimal viable messaging (\~2 sessions)



Schema:

\- New table `messages`: id, shift\_id, sender\_id (user id), recipient\_id (user id), message text (max 500), sent\_at, read\_at (nullable)

\- New table `message\_quick\_replies`: id, sender\_role ('manager'|'worker'), message text, sort\_order



Backend endpoints:

\- POST /api/messages — send a message (validates: shift exists, both users are parties to the shift, sender is one of them, recipient is the other, shift is in active window)

\- GET /api/messages/shift/:id — fetch the message thread for a shift (ordered by sent\_at)

\- PATCH /api/messages/:id/read — mark a message as read by recipient



Frontend:

\- Chat icon button on shift detail screen (visible after assignment created)

\- Tap → opens chat screen (modal or dedicated route)

\- Chat screen: scrollable thread, input field at bottom, "Quick replies" chips above input

\- Quick replies hardcoded for v1: 5 manager messages + 5 worker messages

\- "Tap to send" on quick replies inserts text into input (so user can edit before send)



Push: skip for v1, in-app only. Add Push in v2.



\### Phase 2 — Push notifications + read receipts (\~1 session)



\- Push notifications when message received and recipient hasn't opened app

\- Read receipts shown on sender's view

\- Unread badge count on chat icon

\- Sound on incoming message when app is in foreground



\### Phase 3 — Moderation + flagging (\~1-2 sessions)



\- Basic profanity filter (server-side, blocks send with error)

\- "Flag this message" button on any received message → goes to admin queue

\- Admin dashboard endpoint to review flagged messages and ban offending users



\### Phase 4 — Group messaging (if multi-worker shifts) (\~2 sessions)



\- For shifts with workers\_needed > 1, manager can broadcast to all assigned workers

\- Workers can see each other's messages (or just manager's, configurable)

\- Group chat dynamics



\### Phase 5 — Voice notes, photos, file attachments (later)



\- Adds significant complexity (S3 storage, mime type validation, virus scanning, etc.)

\- Defer until clear user demand



\## What I will NOT build for v0.5 (messaging on-platform)



\- Voice calling

\- Video calling

\- Multi-party chat (one-to-one only)

\- Threaded replies

\- Reactions/emojis (deferred for cleanliness)

\- Search across conversations

\- Message editing/deletion



\## Quick-reply starter set (for Phase 1)



\### Manager → Worker

\- "Looking forward to seeing you for the shift"

\- "Park at the back of the building"

\- "Dress code reminder: \_\_\_"

\- "Please bring your TIPS card"

\- "Running 15 minutes late, please wait"



\### Worker → Manager

\- "On my way"

\- "Running late, sorry"

\- "What's the dress code?"

\- "Can you confirm the address?"

\- "I'll be there 10 minutes early"



\## Estimated effort



\- Phase 1: \~2 sessions (4-6 hours)

\- Phase 2: \~1 session (2-3 hours)

\- Phase 3: \~1-2 sessions

\- Phase 4: \~2 sessions

\- Phase 5: long, defer



Total to "DoorDash-like chat": \~10-15 hours over a couple weeks.



\## Strategic note



This is NOT a wedge feature. The wedge ships without it. Customers will tell you within 2 weeks of usage whether messaging is the next priority OR whether the shift `notes` field handles their needs. Don't build this preemptively — wait for the signal.



If/when you do build it: Phase 1 first, ship to users, then Phase 2 only if Phase 1 isn't enough.



\## Alternatives to in-app messaging (cheap wins for now)



\### A. Beef up the `notes` field

\- Larger character limit (2000 chars)

\- Better display formatting on the shift detail screen

\- "What workers need to know" header

\- This handles 80% of communication for free



\### B. Add a "Contact Manager" button to claimed shifts

\- Uses `tel:` and `sms:` URI schemes

\- Opens the phone/SMS app with manager's number pre-filled

\- Off-platform but zero infrastructure cost

\- Privacy concern: exposes manager's real phone number (consider a relay number service like Twilio later)



\### C. Show a tappable "Send message" button that drops to email

\- Pre-fills subject + body, opens Mail app

\- Slow but works without infrastructure


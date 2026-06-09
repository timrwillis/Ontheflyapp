\# Worker Profile — Feature Spec



\## Why this exists



When a manager sees that a worker has claimed their shift, they want to know who that person is BEFORE they walk through the door. Similar to how Uber riders check the driver's photo, rating, and car before getting in.



For On the Fly, this matters because:

\- Trust is the currency of the marketplace

\- Managers are taking real risk letting a stranger work in their venue

\- Workers want a profile they can be proud of and build on

\- Repeat hires happen when managers remember good workers



\## User stories



\### Manager

\- As a manager, I want to tap a worker's name on a claim to see who they are

\- I want to see their reliability score, photo, total shifts completed, ratings

\- I want to read recent reviews from other managers

\- I want to see their certifications (TIPS, ServSafe) at a glance

\- I want to know their off-platform experience so I can gauge skill level



\### Worker

\- As a worker, I want my profile to showcase my experience and quality

\- I want to add a photo, bio, and employment history

\- I want to see my rating and reviews after shifts complete

\- I want managers to recognize me on repeat bookings

\- I want my profile to function like a portable resume



\## Phased build plan



\### Phase 1 — Read-only profile from existing data (small, \~30 min)



Navigation: tap worker name on manager shift detail → opens profile screen.



Profile screen shows what's already in the DB:

\- Name + initials avatar (photo placeholder for now)

\- Bio

\- Roles + years experience per role

\- City

\- Reliability score (with explanation tooltip if it's low)

\- Account age ("Member since June 2026")

\- Total shifts completed (count of filled shifts where claimed\_by\_worker\_id = this worker)



Backend: new route `GET /api/worker-profiles/:id/public` returning the safe-to-share fields.



No edits, no ratings, no employment history. Just navigation working with existing data.



\### Phase 2 — Ratings and reviews (medium, requires schema work)



Schema:

\- New table `shift\_ratings` (id, shift\_id, rated\_worker\_id, rater\_manager\_id, stars (1-5), comment text, created\_at)

\- Aggregate via SQL view or computed at query time: avg\_rating, rating\_count



Manager flow:

\- After a shift completes (status='completed'), prompt manager to rate the worker

\- Rating screen: 5 stars + optional comment

\- Submit → row inserted in shift\_ratings



Worker profile additions:

\- Avg star rating with count ("4.8 ★ from 23 shifts")

\- Recent reviews (last 5 with stars + comment + manager business name + date)



Trust questions to answer:

\- Can workers see reviews about themselves? (Probably yes, but don't show identifying info about reviewers if low star count)

\- Can workers respond to reviews? (Defer)

\- Can workers report unfair reviews? (Defer, but plan for it)



\### Phase 3 — Employment history (medium, requires UI design)



Schema:

\- `worker\_employment\_history` table: id, worker\_id, employer\_name, role, start\_month, end\_month (nullable for current), is\_current (bool), description



Worker editing UI:

\- Add to onboarding as optional step OR profile edit screen

\- Mobile-friendly form: add employer, role, dates, description

\- List view to see all entries with edit/delete



Profile display:

\- Section on profile: "Experience"

\- Most recent first, shows employer + role + dates

\- "Current" badge for current employer



\### Phase 4 — Certifications + verification (depends on Phase 3)



Schema:

\- `worker\_certifications` table: id, worker\_id, cert\_type (TIPS, ServSafe, RBS, etc), issued\_date, expires\_date, verification\_status



Worker upload flow:

\- Upload photo of cert

\- Initially unverified (or manual admin verify)

\- Eventually: OCR + verification API



Profile display:

\- Badge row near top: TIPS, ServSafe, etc with verified/unverified status



\### Phase 5 — Background checks (Checkr integration)



Out of scope for this spec. See PRD.



\## Open product decisions



\[Tim: fill in your answers below — these shape what gets built]



1\. \*\*Manager privacy:\*\* When a worker sees a review of themselves, should they know which manager wrote it?

&#x20;  - Show manager business name AND/OR manager personal name

&#x20;  - Show only business name

&#x20;  - Anonymize completely

&#x20;  - \[Your answer:]



2\. \*\*Worker control over profile photo:\*\*

&#x20;  - Workers upload their own photo, no review needed

&#x20;  - Workers upload, admin reviews and approves

&#x20;  - Use external service for ID verification (TruePic, Persona, etc.)

&#x20;  - \[Your answer:]



3\. \*\*Rating prompt timing:\*\*

&#x20;  - Rating prompt appears immediately after shift completed

&#x20;  - Rating prompt appears next time manager opens app after shift completed

&#x20;  - Email/SMS reminder to rate

&#x20;  - \[Your answer:]



4\. \*\*Required vs optional rating:\*\*

&#x20;  - Can manager skip rating, or required to rate before posting next shift?

&#x20;  - Workers can also rate managers ("the venue was clean / abusive / etc")?

&#x20;  - \[Your answer:]



5\. \*\*Minimum shifts before profile shows ratings:\*\*

&#x20;  - Show first rating immediately (could be unfair if first review is bad)

&#x20;  - Hide aggregate rating until N shifts (typically 3-5)

&#x20;  - Always show, but with confidence indicator ("based on 1 shift")

&#x20;  - \[Your answer:]



6\. \*\*What about non-platform experience?\*\*

&#x20;  - Workers self-report (current Phase 3 plan)

&#x20;  - Workers must verify (LinkedIn integration, prior employer email)

&#x20;  - Don't allow self-reported, only platform shifts count

&#x20;  - \[Your answer:]



\## Estimated effort



\- Phase 1: 30 min (one session)

\- Phase 2: 4-6 hours (1 session for schema + 1 for UI/flow)

\- Phase 3: 6-8 hours (mostly UI work)

\- Phase 4: 4-6 hours (depends on verification choices)



Total to "Uber-style profile": \~20 hours of focused work spread over a week.



\## What I will NOT build for v0.7



\- Background checks (Phase 5 — separate compliance project)

\- Worker-to-worker endorsements

\- Profile boosting / paid placement

\- AI-generated profile summaries

\- Public-facing profile pages (only visible to logged-in managers initially)


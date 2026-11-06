# Workspace features: spec (v1)

> **Scope change (supersedes the sections below where they differ).** The frontend now includes ONLY the Home dashboard (section 1),
> Campaign mails (section 2) and the People panel (section 4). Leave & permission (3) and Projects & documents (5) stay in the backend
> but have no frontend. In the People API "today's leave status" is dropped: every person is always reported as "Working", and a profile
> has no balances or time off. Two backend features were added: Excel import into campaign drafts, and shared Excel sheets. See
> "Excel import" and "Shared sheets" at the end of this file.

## Roles
- ProductManager (PM) approves campaign mails and leave/permission. A PM cannot approve their own items. A PM's own leave goes to the other PMs.
- Employee creates campaign mails and applies for leave/permission.
- "Both" users act as the role currently in their JWT.

## 1. Home dashboard (/workspace)
- Greeting by time of day and today's date.
- PM tiles: mails waiting for approval, leave/permission waiting, people away today, mails sent this month.
- Employee tiles: my mails sent this month, my mails waiting for approval, casual leave left, permission hours left this month.
- To-do list. Each item links to its record.
  - PM: every pending campaign and every pending leave/permission.
  - Employee: my approved mails ("Send mail: X"), my drafts with changes requested ("Fix and resend: X"), my other drafts, my pending mails.
- Quick actions: New mail (employee only), Apply leave, Ask permission.
- "Who's away today" list and "My projects" with a progress bar.

## 2. Campaign mails
Fields: title, client_name, contact_name, client_email, subject, body, status, manager_note, created_by, timestamps.

Statuses and transitions:
- draft → pending: creator only. All fields are required, and the email must be valid.
- pending → approved: a PM who is not the creator.
- pending → draft ("Ask for changes"): a PM, with a required note saved in manager_note and shown to the creator.
- pending → draft ("Take back"): the creator.
- approved → sent: creator only, after a confirm step ("Send to <contact> at <email>?"). Send via IEmailService. On failure, stay approved and show the error.
- Only the creator can edit, and only while in draft. Clear manager_note on resubmit.

History: log every action with user, action, note and time ("Created", "Sent for approval", "Approved", "Asked for changes", "Took back to draft", "Sent the mail"). Show it as a timeline.

UI:
- A 4-step board: Draft | Waiting for approval | Approved | Sent. Each step shows a count, and clicking it filters the board.
- Search across title, client, subject and creator name. An "Only my mails" toggle.
- Card badges: "Changes asked" on a draft with a note; "Needs your approval" for a PM on a pending card; "Ready to send" for the creator on an approved card.
- The mail view looks like an email (From, To, Subject, Body), with the history timeline beside it.

Templates when creating a mail (placeholders {client}, {name}, {me}):
1. First introduction: "Faster medical coding for {client}"
2. Follow-up after 5 days: "Following up on my last mail"
3. Demo invite: "A 20-minute demo for {client}"
4. Thank you after demo: "Thank you for your time"

Every mail gets a footer with the company address and "Reply 'unsubscribe' to stop these emails".

## 3. Leave & permission
Leave fields: type (casual | sick | earned), from_date, to_date, reason (required).
- Yearly quotas: casual 12, sick 6, earned 15. Day count is inclusive.
- Block the request if: to_date < from_date, the days exceed the remaining balance, or it overlaps the user's own pending or approved leave.
- Show info (not a block) if other people are on approved leave in the same period.
- Deduct the balance only on approval.

Permission fields: date, start_time, end_time (15-minute steps), reason (required).
- Block if end <= start, longer than 2 hours, or over 4 hours per month (pending plus approved count toward the limit).

Statuses: pending → approved | rejected (reason required, shown to the requester) | cancelled (the requester, only while pending).

Employee view:
- Balance cards for the 3 leave types plus permission hours left this month.
- "My requests" list, newest first, with a Cancel button on pending items.
- Team calendar.

PM view:
- Tabs: "Team requests" (default) and "My leave".
- Team requests shows: "Waiting for your approval" with Approve/Reject buttons, "Recent decisions" (last 6), "Away today", and the team calendar.

Team calendar: a month grid (Mon–Sun) with previous/next month buttons. Each day shows a dot per person for approved and pending items, colored by type (pending in amber, permission as a hollow dot). Hovering a dot shows the name and type. Weekends are greyed and today is outlined.

## 4. People panel (top navbar, not a page)
- A "People" button with a count and a chevron in the top navbar.
- Click expands a panel below the navbar over a dimmed page. Click again collapses it. It also closes on the Close button, Esc, an outside click, or navigation.
- Search by name or role, and filter tabs by team with counts.
- Card: avatar initials, name, role, team, project tags, and today's status: Working | On leave | Away <start>–<end>.
- Clicking a card opens a profile with name, role, team, email, joined date, and projects.
  - Leave balance is shown only to a PM or to the person themselves.
  - Also shows upcoming approved and pending time off.
- Use existing user columns only. Do NOT alter the users table. Skip fields that don't exist (e.g. team, location) and list them as assumptions.

## 5. Projects & documents
- Reuse the existing projects and project_members.
- List: name, status, progress % (existing work items done / total), member avatars, document count.
- Detail: description, status, progress, tasks done/total, lead, due date, team members with roles, and documents.
- Documents: one shared library per project, with no versions in v1.
  - Fields: title, type (doc | sheet | slides | link), content or URL, optional file via IFileService, uploaded_by, updated_at.
  - Only project members can view or add documents.

## 6. Notifications
A bell in the navbar with an unread count. Opening the bell marks all as read, and clicking an item opens the record. The frontend polls every 60 seconds.

Triggers:
- Campaign sent for approval → all PMs except the creator
- Campaign approved → creator
- Changes asked → creator
- Campaign sent → all PMs
- Leave or permission requested → all PMs except the requester
- Leave or permission approved/rejected → requester

## Out of scope for v1
Multiple recipients per campaign, scheduled sending, document versions, websockets, and new roles.

## Excel import → campaign drafts (backend)
Formats: A) a prospect workbook (drafts sheet with Organization, Subject line, Email body, joined by "#" to the prospect sheet with Organization and Email...), B) the simple template (Campaign name | Client | Contact person | Client email | Subject | Message).
Flow: `POST /api/workspace/campaigns/import/preview` (nothing saved) → `POST .../import/commit` with the preview token and the selected rows → drafts. Also `GET .../import/template`, `GET .../imports`, `GET /api/workspace/campaigns?importId=`, and `POST .../bulk/submit` / `bulk/approve` with per-item results.
Flags: ERROR (import allowed, submit blocked on the server): missing/invalid client email, or a placeholder left (`[Your name]`, `[Title]`, `[Direct phone]`, `[First name]`). WARNING: text contains "autonom", or the same client email + subject already exists.
Limits: 5 MB, 500 rows.

## Shared sheets (backend)
A user uploads an .xlsx (max 10 MB) or creates a blank sheet and shares it with chosen users (view or edit). Editors save cells with `PATCH` against a `baseVersion`; if someone else changed one of the same cells since, the answer is 409 with those cells and nothing is applied. The client polls `GET .../version` every 20 seconds. Owner and shared users only; a ProductManager can view any sheet but edits only when shared with edit rights. Values and formulas only: formatting is not kept (`formattingLost`). Notifications: when a sheet is shared with you, and when someone else saves it (at most one per sheet per person every 10 minutes). Bonus: `POST .../sheets/{id}/import-preview` turns a shared sheet into a campaign import preview.

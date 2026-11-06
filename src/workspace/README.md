# Workspace (feature-flagged)

Home dashboard, Campaign mails (board, Excel import, shared sheets) and the People panel + notification bell.
There are no leave, permission, project or document screens on purpose; their backend is unused.

## Turn it on
Put this in `.env.local` (git-ignored) and restart `npm run dev`; set it in the build environment for a build:

    VITE_FEATURE_WORKSPACE=true

With the flag off nothing here is rendered, routed or styled, and the only file fetched is the tiny `index.tsx`.
The backend must have `Features__Workspace=true` too.

## Layout
- `index.tsx` entry used by `App.tsx` (flag, sidebar items, lazy navbar parts and routes)
- `workspaceApi.ts` every API call and type (uses the exported `request` helper from `services/api.ts`)
- `NavbarItems.tsx` People panel and bell; `Home.tsx`; `Campaigns.tsx` (tabs) with `MailsBoard`, `MailView`, `MailForm`,
  `ImportDialog`, `SheetsTab`, `ShareDialog`; `SheetEditor.tsx` + `sheetModel.ts` (grid <-> API model, dirty-cell diff)
- `workspace.css` all styles (`ws-` prefix, app theme variables)

## Shared sheet editor notes
- Grid: `@fortune-sheet/react` (MIT). The toolbar, sheet add/rename/delete and row/column insert/delete are turned off because
  the API stores cell values and formulas only.
- Only changed cells are sent (`PATCH` with `baseVersion`). A 409 opens the per-cell chooser. The version is polled every 20 s.
- Unsaved changes are guarded on reload/close, sidebar links, the Back button and the navbar's own links.

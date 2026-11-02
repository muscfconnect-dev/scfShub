# SCF Students' Hub: UI polish patch (v2, includes v1)

Copy `src/` and `supabase/` over your project (same paths), then:

    npm run typecheck && npm run dev

Run `supabase/migrations/202611020001_complaint_page_copy.sql` on your database (it only touches
page headings that still have the old seed text).

## New
- `src/components/site-shell.tsx`  header, scroll pill, hamburger, full-screen menu, footer, route progress
- `src/components/select.tsx`      custom dropdown (drop-in for <select>: same <option> children, name, required, value/onChange)
- `src/lib/school.ts`              the university's published contacts + "checked on" date. EDIT THIS when you re-check the school site
- `src/app/shell.css`, `src/app/motion.css`

## Changed
- hub.tsx: new Freshers page, new OfficialLinks page, simplified complaint form (Support), sliding tab highlight, all <select> -> <Select>
- ui.tsx: scroll reveal, useTabGlider, Notice icons, useCatalog `complete` flag (hides "Load more" when everything is loaded)
- admin.tsx, course-catalogue.tsx: <select> -> <Select>
- domain.ts: complaint `name` is optional (defaults to "Student") because the form no longer asks for it
- layout.tsx, reference.css, refinement.css, globals.css: imports and dead-rule removal

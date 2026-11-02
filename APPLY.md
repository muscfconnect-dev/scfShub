# UI polish patch

Copy the `src/` folder over your project (same paths), then run `npm run typecheck && npm run dev`.

New files: `src/components/site-shell.tsx`, `src/app/shell.css`, `src/app/motion.css`
Changed:   `hub.tsx`, `ui.tsx`, `layout.tsx`, and `reference.css` / `refinement.css` / `globals.css`
           (only dead footer / old hamburger / global `nav` rules were removed from these three).

Sliding tab highlight: `useTabGlider` in `ui.tsx`, used by `AcademicTabs` and the category chips in `hub.tsx`.
Hamburger + pill-without-links breakpoint is 1000px (shell.css and the `min-width: 1001px` check in MenuSheet).

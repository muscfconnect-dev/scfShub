# Approved frontend reference

These files are the original uploaded frontend preview, preserved as a design reference. They are not the CMS application and do not contain a working backend. Some downloaded page links were rewritten by the downloader.

## Brand

- Navy: `#0e2048` (initial layer `#101f42`).
- Gold: `#ecc449` (initial layer `#e5bd5e`).
- Paper: `#f4f4f0`.
- Type: DM Sans for body; Manrope for headings.
- Main hero: `MU IS A LOT.` followed by `TRUST US, WE GET IT.` in outlined navy lettering.
- Utility strip: `MADUKA UNIVERSITY | MADE FOR YOU`.
- Wordmark: SCF + STUDENTS’ HUB, no star.

## Core structure and reusable classes

Original layout rules are in `style.css`, with the final approved changes in `refinement.css`. Use both in that order when comparing layouts. Media queries are significant; isolated snippets can misrepresent the final layout.

- `.wrap`, `.section`, `.section-head`: shared constrained content and section rhythm.
- `.utility`, `.masthead`, `.wordmark`, `.nav-inner`: top strip, brand, full navigation.
- `.home-hero`, `.home-hero-grid`, `.home-hero-copy`, `.home-campus-photo`: gold hero; desktop photo on left, text on right; mobile text first and photo second. Photo has a white frame, navy offset shadow and slight rotation.
- `.home-quick-grid`, `.quick-icon`: six shortcuts, three columns desktop/two mobile.
- `.home-updates`, `.home-update-grid`, `.home-feature-update`, `.home-notice-list`: navy updates section.
- `.home-campus-life`, `.home-life-grid`, `.home-life-card`: three photo feature cards.
- `.home-help-section`, `.home-help-grid`: help/travel CTA region.
- `.page-intro`, `.breadcrumb`, `.lede`, `.tabs`: gold inner-page title banners and pill academic navigation.
- `.chips`, `.chip`, `.tab-glider`: horizontally swipeable filter chips.
- `.review-filter-panel`, `.course-review-card`, `.course-quick-facts`, `.review-tip`, `.tip-quote`: rounded course cards, fact rows, bold “What helped” quotes.
- `.group-symbol`, `.listing-grid`, `.group-profile-art`, `.profile-art-symbol`: group cards and photo detail profiles.
- `.detail-hero-grid`, `.detail-side-card`, `.detail-activity-grid`, `.detail-content-grid`, `.detail-body-panel`, `.detail-next-event`: group/place/sport profile structure.
- `.spot-profile-visual`, `.spot-menu-list`, `.spot-review-empty`: campus business profile.
- `.sports-detail-banner`, `.sport-options`: sport detail hero and three activity panels.
- `.guide-layout`, `.guide-nav`, `.motion-details`, `.summary-icon`: freshers guide sidebar and accordions.
- `.official-link-grid`, `.official-link-card`, `.where-to-click`: school-link directory cards.
- `.complaint-layout`, `.complaint-side`, `.scf-complaint-form`, `.scf-support-banner`, `.hostel-rules-panel`: support and complaints.
- `.trip`, `.trip-price`, `.trip-route-panel`, `.booking-steps`: transport listings/details.
- `.ad`, `.sidebar-ad`, `.ad-label`: labelled advertising.
- `.footer-top`, `.footer-links`, `.footer-bottom`, `.koad-credit`: footer.

## Latest design constraints

- Remove thin gold decorative card accents. Do not remove functional gold fills, icons or brand colour.
- No scribbles or card corner half-circle decorations.
- Original final CSS explicitly sets `content:none` for `.home-quick-grid>a:before`, `.group-symbol:before`, `.group-symbol:after`, `.shop-profile-graphic:after`, `.home-help-section:before`, `.page-intro:after`.
- Preserve rounded review cards, gold title banners, expressive hero, photography and icon-based shortcuts.
- Navigation breadcrumbs use chevrons instead of slashes.
- Avoid diagonal arrows and eyebrow labels.
- Scroll reveal, responsive tabs and button/card feedback respect reduced-motion preferences.

## Photos

`asset-map.json` lists all ten expected photos. The original ZIP has no photo bytes, and no uploaded HTML has image data URLs. All image URLs point to the original private `chatgpt.site` instance; direct requests returned HTTP 403. Photo filenames and descriptions are known, but image bytes remain unavailable from these uploads.

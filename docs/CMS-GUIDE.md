# Running the CMS

## Roles

**Owner:** every area, plus staff invitations, roles, permissions and activation. The final active owner cannot be disabled or demoted.

**Admin:** every website area. Staff-account changes remain owner-only.

**Staff:** only assigned areas: content, resources, reviews, complaints, transport, staff directory or settings. Permissions are checked by the server on every request; deactivation takes effect without relying on a user signing out.

## Publishing

Records start as drafts. Use **Published** to show them to students. **Archive** removes a record from the public site while keeping it available for editing. Lower display-order numbers appear first.

- **Pages & banners:** use an existing page slug to edit its title, introduction, body and photo banner. Remove the photo to restore the gold banner. A new custom slug creates a page at `/p/your-slug`; add its URL to a navigation/footer link if needed.
- **Site settings:** homepage headlines/copy/images, support messaging, footer credit/WhatsApp number, payment details and editable policy text.
- **School & WhatsApp links:** add any verified school service, class/group link or WhatsApp invite. Choose `directory` or `whatsapp` for the searchable link page, `footer` for the footer, or `navigation` for the main menu.
- **Navigation:** when at least one published navigation link exists, that list replaces the default navigation. Add all desired menu links, set their display order, then publish them. Archive every custom navigation link to return to the default menu.
- **Course Catalogue:** add the course name as its title and enter its course code, faculty, departments, level, semester, units, compulsory/elective status and optional academic session. Choose departments from the selected faculty. A shared course can serve several departments; if its level, semester, units or compulsory/elective status differs, create separate listings for those departments. Publish the faculty and departments first. Draft and archived courses stay hidden. The catalogue groups results by level and semester and links each course to matching study materials and reviews. Zero-unit courses are supported.
- **Study resources:** enter the course, faculty, one department per line, level, session and material type, then upload the actual document.
- **Faculties / departments:** create the official list and choose each department’s faculty from the selector. Courses use stable identifiers, so renaming either record keeps its courses linked. Archiving a department hides its curriculum; shared courses remain visible to their other active departments. Resources may list several departments.
- **Campus spots:** location, hours, price range, contact/directions, optional menu and sponsorship. Use `Item | Price` on each menu line. Paid placement does not affect review ratings.
- **Groups:** category, meeting time/location and joining/contact URLs. Activities use `Title | Description` on each line.
- **Sport & Fitness:** publish categories, confirmed schedules, locations and contact links. Activities use the same line format.
- **News & events:** article text, cover, category and optional event time/location.
- **Freshers’ guide:** each record becomes a section. Relevant sections include links to the archive, hostel support and Ask SCF.
- **Hostel rules:** upload an approved PDF or use an official link. Students can complain even before rules are uploaded.
- **Adverts:** set placement, destination, artwork, button text and optional start/end. Empty placements collapse. Complaints pages have no ad placement.

## Reviews

New course/place reviews enter **pending** moderation. Approve useful, appropriate reviews; reject abusive or irrelevant submissions. Ratings use only published reviews. The student’s chosen display name is public.

## Complaints

1. A student submits and verifies their email.
2. All active SCF members receive a notification. Only members with complaints access can open and handle cases.
3. One member claims the case. Another member cannot claim or reply to it simultaneously.
4. The assigned member replies and selects In progress, Resolved or Closed.
5. Students can add follow-ups until the case is Closed.

Owners/admins can release assignments when another member needs to take over. Notifications omit the complaint body. The student follows up through an email-verified private link, with recovery available from support pages.

## Transport

Create a trip with a destination, fare, departure, booking deadline and capacity. Configure verified bank details first.

Students verify their email, see payment instructions and upload a receipt. A request or pending receipt does not reserve a seat. Open the actual receipt and verify the transfer against the bank record before confirming.

Confirming checks capacity atomically. Repeating a confirmation does not consume another seat. Rejecting a receipt lets the student upload a replacement. Cancelling a booking frees its confirmed seat. Cancellation requests need an officer’s decision and note. Cancelling a whole trip cancels affected bookings and queues emails; refunds remain an operational bank-transfer process.

## Emails and exports

Email delivery shows recipients, status, attempts and errors without exposing private email links. Automatic retries require the cron job. Staff with settings access can retry failed jobs.

CSV exports include the records loaded in that admin section. Treat complaint, staff and booking exports as private school data. Activity logs record administrative changes and transport decisions.

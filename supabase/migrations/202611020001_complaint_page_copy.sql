-- Aligns the complaint page headings with the approved design copy.
-- The title guard means anything an admin has already edited is left alone.
update public.entries
   set title = 'Something wrong? Let’s hear it.',
       summary = 'Having trouble with registration, a result or a course? Explain what’s happening so SCF can follow it up.'
 where kind = 'page' and slug = 'issues' and title = 'Something off with your academics?';

update public.entries
   set summary = 'Something wrong in your hostel? Check the rules, explain the issue and let SCF know where help is needed.'
 where kind = 'page' and slug = 'hostel-complaints' and title = 'Hostel wahala? Tell us.';

update public.entries
   set summary = 'Something bothering you in school? Tell SCF what’s going on, or point us towards something that needs fixing.'
 where kind = 'page' and slug = 'ask-scf' and title = 'Need help? Ask us.';

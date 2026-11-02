-- Upgrade existing installations without changing or deleting their content.
begin;
alter table public.entries drop constraint if exists entries_kind_check;
alter table public.entries add constraint entries_kind_check check(kind in ('page','resource','course','place','group','sport','news','link','guide','rule','ad','faculty','department'));
-- Attach existing departments to their uniquely named faculty, using durable IDs.
update public.entries d set data=jsonb_set(d.data,'{faculty_id}',to_jsonb(f.id::text))
from public.entries f
where d.kind='department' and f.kind='faculty' and f.status<>'archived'
and coalesce(d.data->>'faculty_id','')='' and d.data->>'faculty'=f.title
and (select count(*) from public.entries f2 where f2.kind='faculty' and f2.status<>'archived' and f2.title=f.title)=1;
alter table public.entries add constraint entries_course_data_check check (
 kind<>'course' or (
  data ?& array['course_code','faculty_id','department_ids','level','semester','units','course_type']
  and length(trim(data->>'course_code')) between 2 and 30
  and (data->>'faculty_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  and jsonb_typeof(data->'department_ids')='array'
  and jsonb_array_length(data->'department_ids') between 1 and 30
  and data->>'level' in ('100','200','300','400','500','600','700')
  and data->>'semester' in ('First semester','Second semester','Full year')
  and jsonb_typeof(data->'units')='number'
  and case when data->>'units' ~ '^[0-9]{1,2}$' then (data->>'units')::integer between 0 and 30 else false end
  and data->>'course_type' in ('Compulsory','Elective')
 )
);
create index entries_course_faculty on public.entries((data->>'faculty_id'),(data->>'level'),(data->>'semester')) where kind='course' and status='published';
insert into public.entries(kind,title,slug,summary,body,status,sort_order,data)
values('page','What’s on your course list?','courses','Choose your faculty, department, level and semester to see the courses you’ll be taking.','','published',1,'{}')
on conflict(kind,slug) do nothing;
commit;

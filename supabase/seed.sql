-- Demo plant structure. Users are created in stage 3 (auth).
insert into public.areas (code, name) values
  ('ML', 'Montaż / Assembly'),
  ('WT', 'Wtryskownia / Injection moulding'),
  ('PK', 'Pakowanie / Packaging')
on conflict (code) do nothing;

insert into public.machines (area_id, code, name, criticality)
select a.id, m.code, m.name, m.criticality::public.machine_criticality
from (values
  ('ML', 'ML-01', 'Linia montażowa 1', 'A'),
  ('ML', 'ML-02', 'Linia montażowa 2', 'A'),
  ('ML', 'ML-ROB-01', 'Robot spawalniczy KUKA', 'A'),
  ('ML', 'ML-PRS-01', 'Prasa pneumatyczna', 'B'),
  ('WT', 'WT-01', 'Wtryskarka Engel 350t', 'A'),
  ('WT', 'WT-02', 'Wtryskarka Arburg 220t', 'B'),
  ('WT', 'WT-CHL-01', 'Chiller', 'B'),
  ('PK', 'PK-01', 'Owijarka paletowa', 'C'),
  ('PK', 'PK-02', 'Kartoniarka', 'B'),
  ('PK', 'PK-CNV-01', 'Przenośnik taśmowy', 'C')
) as m(area_code, code, name, criticality)
join public.areas a on a.code = m.area_code
on conflict (code) do nothing;

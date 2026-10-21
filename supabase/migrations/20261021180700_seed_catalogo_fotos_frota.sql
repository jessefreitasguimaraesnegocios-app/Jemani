-- Fotos oficiais da frota no catálogo (URLs públicas do app).

insert into public.catalogo_fotos_veiculo (id, marca, modelo, ano, nome, url)
values
  ('ca7a1000-0000-4000-8000-000000000001', 'Ford', 'Expedition', 2024, 'Ford Expedition', '/frota/expedition.jpg'),
  ('ca7a1000-0000-4000-8000-000000000002', 'Volvo', 'XC90', 2024, 'Volvo XC90', '/frota/volvo.jpg'),
  ('ca7a1000-0000-4000-8000-000000000003', 'Mercedes-Benz', 'Classe S', 2024, 'Mercedes-Benz Classe S', '/frota/classe-s.jpg'),
  ('ca7a1000-0000-4000-8000-000000000004', 'Lucid', 'Air', 2024, 'Lucid Air', '/frota/lucid.jpg'),
  ('ca7a1000-0000-4000-8000-000000000005', 'Cadillac', 'Escalade', 2024, 'Cadillac Escalade', '/frota/escalade.jpg'),
  ('ca7a1000-0000-4000-8000-000000000006', 'Mercedes-Benz', 'Sprinter', 2023, 'Mercedes-Benz Sprinter', '/frota/sprinter.jpg'),
  ('ca7a1000-0000-4000-8000-000000000007', 'Shuttle', 'Bus', 2024, 'Shuttle Bus', '/frota/shuttle.jpg'),
  ('ca7a1000-0000-4000-8000-000000000008', 'Prevost', 'H3-45', 2024, 'Charter Bus Prevost H3-45', '/frota/charter.jpg')
on conflict (id) do update
set
  marca = excluded.marca,
  modelo = excluded.modelo,
  ano = excluded.ano,
  nome = excluded.nome,
  url = excluded.url,
  updated_at = now();

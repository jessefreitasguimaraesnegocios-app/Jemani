insert into public.platform_settings (chave, valor, descricao)
values
  ('reserva_antecedencia_horas', '4', 'Antecedência mínima (horas) para agendar uma corrida')
on conflict (chave) do nothing;

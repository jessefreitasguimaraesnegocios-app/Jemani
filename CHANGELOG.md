# Changelog

Registro das mudanças do Jemani.

## [2026-10-12]

### Adicionado

- Empresa → **Viagens** (`/empresa/ao-vivo`): mapa ao vivo com os carros da empresa e quadro kanban dos status, no mesmo espírito do admin. O Histórico em `/empresa/viagens` permanece.
- Na tela ao vivo, abas **Motoristas** (quem está online, veículo e início do turno; o clique leva o mapa até o carro) e **Chat** com cada motorista. O mesmo chat existe na área do motorista.
- Empresa → Motoristas: clique no nome abre o **histórico** do motorista. Contagem de corridas em hoje, esta semana, este mês e tudo. Horas em corrida, quilômetros, horas inativas e horas no turno. Lista com código, rota, data, status, km, duração, valor, passageiros e veículo.
- Empresa → Veículos: clique no veículo abre **Mecânica** e **Lava-jato**, com dia, horário e observação. A empresa vê quem agendou.
- Área do motorista: aba **Carro** para escolher o veículo e agendar mecânica ou lava-jato. No histórico do motorista, a empresa vê a quantidade e a lista desses agendamentos no período.
- Chat, turno (online, veículo, início e fim), GPS do motorista sem corrida e agendamentos de mecânica/lava-jato sincronizam pelo Supabase (`mensagens_empresa`, `turnos_motorista`, `agendamentos_veiculo`) e aparecem no outro aparelho.
- A empresa recebe o aviso **Serviço agendado** quando o motorista marca mecânica ou lava-jato.
- Empresa → Agenda lista mecânica e lava-jato junto com as corridas, com carro, motorista e observação.
- A viagem grava `finalizado_em`. O histórico de status vai para `trip_status_history`.

### Alterado

- Cadastro de motorista e cadastro de veículo ficam fechados. Só o botão aparece; o formulário abre ao clicar. **Cancelar** fecha sem salvar.
- Turno do motorista guarda o fim ao encerrar, para calcular horas no turno e horas inativas. Turnos anteriores permanecem no histórico.
- Mapa ao vivo usa o GPS do celular quando o motorista está online, com ou sem corrida. Sem GPS, o carro segue animado no trajeto.
- Corrida finalizada sem saída e chegada, com distância entre 0,2 e 180 km, mostra duração estimada a 32 km/h. Trajeto fora dessa faixa continua com **—**. Horas inativas e horas no turno dependem de o motorista iniciar e encerrar o turno.

### Observação

Stripe segue em modo teste. `company_users` e `pickup_locations` continuam sem RLS; não ligar sem as políticas de acesso.

### Próximos passos

Ainda não feitos. Retomar nesta ordem:

6. **Stripe em produção**, só quando for pedido: chaves live, conta Connect real e tirar o modo teste. Até lá permanece em teste.
7. **Segurança do banco:** `company_users` e `pickup_locations` ainda estão sem RLS. Não ligar o RLS sem as políticas de acesso.
8. **Deploy:** conferir se a Vercel publicou a `main` depois desta etapa.

## [2026-10-01]

### Adicionado

- **Área do cliente mobile-first (iPhone)**: shell com nav inferior em vidro escuro (safe-area), Lenis no scroll, início e lista de viagens com cartões/botões touch.
- **Showroom da reserva** com fotos de estúdio da frota (sem o palco 3D): Ford Expedition, Volvo XC90, Mercedes-Benz Classe S, Lucid Air, Cadillac Escalade, Sprinter, shuttle e charter. Stripe permanece em modo teste.
- **Stripe Connect (teste)**: Checkout Session para o cliente pagar a plataforma; Edge Functions `stripe-criar-checkout`, `stripe-verificar-sessao`, `stripe-webhook`, `stripe-connect-onboarding`, `stripe-transferir-empresa`; botão **Pagar com Stripe (teste)** na viagem; onboarding Connect no perfil da empresa; transfer ao aceitar corrida; docs em `docs/STRIPE_TESTE.md`.
- Admin → Comissões: percentual **por empresa** (salvar individual), padrão da plataforma e botão **Aplicar a todas as empresas**; histórico agrupado por parceira. Coluna `comissao_percentual` em `companies`. Ao aceitar a corrida, o repasse usa o % da empresa.
- Empresa → Motoristas: cadastro cria conta com **e-mail e senha** (perfil `motorista` + login em `/entrar`); lista mostra o e-mail vinculado.
- Repositório público no GitHub: [Jemani](https://github.com/jessefreitasguimaraesnegocios-app/Jemani).

### Alterado

- Admin → Configurações: removidos comissão e bloco Plataforma (nome/taxa/região); foco em idioma (PT/EN/ES), aparência, som de notificação, vibração e push.
- **i18n global**: troca de idioma em Configurações altera o app inteiro (PT-BR / EN / ES) — menus, status, páginas principais, datas/valores e `document.documentElement.lang`. Aparência claro/escuro/sistema aplica `data-tema` no HTML.
- **Tema escuro** redesenhado no estilo Uber: fundo preto, superfícies `#121212`, texto branco/cinza de alto contraste, sidebar preta com item ativo invertido, inputs/botões e cartões alinhados.
- Admin → Financeiro redesenhado: filtros por empresa (select + chips), tipo/status de pagamento, categoria e busca; visões **Por empresa**, **Por tipo** e **Todos os lançamentos**; resumos acompanham o filtro.
- Ajustes de contraste no tema escuro (hero, sidebar, Shield, textos da landing/área do cliente).

## [2026-09-24]

### Adicionado

- Admin → Empresas → **+ Adicionar empresa**: formulário grava no Supabase (usuário, perfil, `companies` ativa/habilitada e `company_users`). EIN ou e-mail repetidos são recusados.
- Histórico de corridas **por cliente** (Admin → Clientes → detalhe) com resumo e grupos: em andamento, realizadas, canceladas.
- Histórico de corridas **por empresa** (Admin → Empresas → Ver histórico completo e painel Empresa → Histórico).
- Admin → Viagens em quadro tipo **kanban** (Pagamento, Fila, Com empresa, Em rota, Concluídas, Encerradas), pílulas por status, busca e painel de detalhe ao clicar/abrir.
- Categoria **JEMANI SHIELD**: motorista segurança de elite (defesa pessoal, combate e porte de arma), adicional +$280, 1–3 passageiros. Inclui veículo G-Class e motorista Victor Lang na LA Premier. Categoria no Supabase (`vehicle_categories`).
- Campo **Motorista da categoria Shield** no cadastro e na lista (selo + Marcar/Tirar Shield). Corrida Shield só aceita motorista Shield. Coluna `eh_categoria_shield` em `drivers`.

### Alterado

- JEMANI SHIELD posicionada no **topo** da reserva e de Admin → Categorias, com selo **Top 1 · Proteção de elite** e visual destacado.
- Menu da empresa: **Minhas viagens** passou a **Histórico**.

### Observação

O modo DEMO continua como fonte da interface. Cadastro de empresa, categoria Shield e flag do motorista também existem no projeto remoto do Supabase.

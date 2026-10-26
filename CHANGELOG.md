# Changelog

Registro das mudanças do Jemani.

## [2026-10-26]

### Adicionado

- **Paradas hourly sob demanda**: cliente envia endereços no roteiro (`ParadasHourlyCliente`); motorista vê lista com “Cheguei” (`ListaParadasMotorista`); limite por bloco e raio km em Admin → Configurações (`hourly_paradas_por_bloco`, `hourly_raio_paradas_km`).
- Extensão hourly libera mais vagas de endereço após pagamento Stripe.
- Migration `20261026120000_hourly_paradas.sql` (`trips.paradas`, `paradas_liberadas`, platform_settings).
- Migration `20261026190000_auditoria_correcoes.sql` (RPC `empresas_para_distribuicao` sem expor CNPJ/razão social).
- Comissões gravadas/lidas em `public.commissions` (`nuvemComissoes`).
- Histórico do cliente: minimizar por grupo + paginação 10 + Ver mais.
- Hourly no motorista com Minimizar; fila de corridas quando há mais de uma atribuída.
- Painel de voo também na viagem do cliente; notificação do cliente abre a viagem.

### Alterado / corrigido

- Pagamento e extensão hourly **somente Stripe teste**; botão “Simular pagamento (DEV)” removido.
- GPS não avança `motorista_atribuido` → `a_caminho` no primeiro tick (só botão do motorista).
- Cancelamento: notifica motorista/empresa, bloqueia após embarque, marca reembolso local.
- Aceite de oferta aceita status `paid`; recusa sincroniza oferta na nuvem.
- Empresa não avança mais o status operacional do motorista (fica com o motorista/GPS).
- Admin: reset demo só com `VITE_DEMO_MODE`; sync não empurra categorias seed → nuvem.
- UX hourly: cartões/home sem “origem → As directed”; telefone da reserva usado no contato do motorista.
- Finalizar corrida mostra empresa/veículo; destino hourly rotulado como serviço.
- APK **1.0.38**.

### Observação

Aplicar no SQL Editor do projeto Jemani (`qdiocaeoevxhdsrtcahn`), se ainda não rodou:

1. `supabase/migrations/20261026120000_hourly_paradas.sql`
2. `supabase/migrations/20261026190000_auditoria_correcoes.sql`

### Próximos passos

6. **Stripe em produção**, só quando for pedido.
7. **RLS** em `company_users` / `pickup_locations` com políticas antes de ligar.
8. **Auth real** de motorista/empresa na nuvem + claim atômico de aceite no servidor.

## [2026-10-23]

### Adicionado

- **Hourly Chauffeur**: reserva por tempo (sem destino fixo), pacotes de duração, preço por hora/franquia de milhas e regras de extensão/cancelamento em Admin → Preços (`preco_por_hora = 0` mantém hourly desabilitado).
- Migration `20261023220000_hourly_chauffeur.sql`: colunas hourly em `price_rules`/`trips`, tabelas `trip_extensions` e `trip_hourly_alerts`, RPC `confirmar_extensao_hourly` e Realtime nas extensões.
- Avisos de fim de janela (20/15/10/5 min) no app (`VigilanciaHourly`) e resumo hourly na corrida.
- Reservas e aeroportos **mundiais** (Mapbox sem bbox de LA; hubs EUA + mundo; POI de aeroporto no mapa).
- Motorista: alerta de chat da empresa (som + badge) com **!** pulsando no menu.

### Alterado

- APK **1.0.30** (superseded por **1.0.38** em 26/10).

### Observação

Aplicar a migration `hourly_chauffeur` no SQL Editor do projeto Jemani (`qdiocaeoevxhdsrtcahn`) se ainda não estiver no banco remoto. Depois configure preço por hora em Admin → Preços para liberar a modalidade.

## [2026-10-21] (noite)

### Corrigido

- Corridas pagas voltam a cair nas **Solicitações** das empresas: elegibilidade de frota não zera mais a lista quando a empresa ainda não tem veículos no store; oferta manual do admin grava na nuvem; pagamento já marcado como pago ainda dispara distribuição.
- RPC `empresas_para_distribuicao` (migration `20261022012042`) para o cliente ranquear parceiras reais do Supabase (aplicar no projeto remoto).
- Admin/cliente, ao sincronizar, redistribuem corridas pagas sem oferta.
- **Travamento “Aguardando empresa” sem aparecer na LA Premier:** ofertas usavam ID demo da seed e eram filtradas na nuvem; migration `20261022015241` redistribui corridas pagas às empresas reais, preenche `categorias_ids` vazias e afrouxa a RPC (sem exigir lat/lng).

## [2026-10-21]

### Adicionado

- **Acompanhamento de voo no motorista**: barra de progresso (origem → destino, avião na trilha), minimizar/abrir no estilo das observações, card compacto que empurra o conteúdo para baixo sem encolher o mapa; a página da corrida rola.
- **Reserva com aeroporto**: dados do voo na etapa 2; opção **Não vou embarcar** (sem número de voo); AviationStack enriquece progresso quando a chave está configurada.
- **Alertas do cliente**: ícone de carta fechada (dourada) quando não lida e aberta (cinza) quando lida; som curto ao abrir a carta (respeita “Som de notificação” no perfil).
- **Notificações na nuvem**: tabela `notifications` com pull, push, marcar como lida e Realtime — site e APK passam a compartilhar os alertas do mesmo usuário.
- Admin: abas Empresas/Veículos, catálogo de fotos da frota e exclusão de empresa.
- Cliente na reserva: frota das empresas com fotos; veículos sincronizados no Supabase.
- Admin pode excluir usuários (RPC que limpa FKs).

### Alterado

- Dashboards admin e empresa: “hoje” e “próximas” no fuso da plataforma (`America/Los_Angeles`), não UTC; subtítulo da empresa deixa de mostrar amanhã; “novas solicitações” alinhadas à lista real; volume admin só conta viagens pagas.
- Motorista: prioriza corrida em andamento na tela atual.
- Agendamentos do cliente: instante da viagem no fuso LA (próxima viagem correta no Brasil).
- Polling de corridas 25s com Realtime prioritário; sync de sessão Auth reforçada ao abrir a nuvem.
- APK publicado **1.0.23** (`cea441c`) em `public/downloads/jemani-android.apk` + `versao-android.json`.

### Observação

Site e APK usam o **mesmo Supabase** para corridas, ofertas, GPS, veículos, turnos, mensagens, histórico e agora notificações. Preferências locais (som/vibração) e alguns totais só de demo ainda ficam no aparelho. Stripe continua em teste via Edge Functions.

### Próximos passos

Ainda não feitos. Retomar nesta ordem:

6. **Stripe em produção**, só quando for pedido: chaves live, conta Connect real e tirar o modo teste. Até lá permanece em teste.
7. **Segurança do banco:** `company_users` e `pickup_locations` ainda estão sem RLS. Não ligar o RLS sem as políticas de acesso. Investigar os `42501` de `trips` e `trip_assignments` sem abrir a política para qualquer usuário.
8. **Cadastro de motorista/empresa na nuvem de ponta a ponta** e sync de avaliações/comissões registradas, se ainda houver divergência entre aparelhos nesses pontos.

## [2026-10-15]

### Adicionado

- Aplicativo Android (Capacitor, `com.jemani.executivemobility`) e download do APK em `public/downloads/jemani-android.apk`. Na página inicial, o botão dourado **Download** baixa esse arquivo. **Planejar minha viagem** ficou no link ao lado e abre o cadastro.
- No iPhone, a página explica como instalar pela tela de início do Safari. Ainda não há arquivo `.ipa` nem publicação na App Store.
- Os carros da frota passam sozinhos em carrossel. As setas pausam o movimento por alguns segundos.
- A corrida só é oferecida a empresa que tem veículo ativo daquela categoria.
- O status da viagem acompanha o GPS (a caminho, chegou, embarcou, em andamento).
- Som e vibração de verdade para cliente e motorista: corrida aceita, motorista atribuído, mudança de status e mensagem que chega do outro aparelho. O cliente liga e desliga no perfil; o motorista, no menu. O primeiro toque na tela libera o áudio. O APK pede permissão de vibração.
- Regra do editor para regenerar o APK sempre que o app empacotado mudar.

### Alterado

- Cabeçalho no celular fica abaixo dos ícones de wifi, bateria e hora. A folga vale na página inicial, no cliente, no motorista e nos painéis de empresa e admin. No computador a altura continua 82px.
- Reserva: a quantidade de passageiros ficou acima da bagagem e o passo extra de passageiros saiu.
- Marcador do carro no mapa mais legível. O modal de finalizar a viagem usa painel escuro, com contraste melhor.
- A senha de acesso não fica mais gravada no navegador.
- Recursão `42P17` ao gravar viagem foi corrigida no banco (`viagem_ja_existe` e `pode_atualizar_oferta`) e aplicada no projeto Jemani.
- Stripe de teste no celular: o telefone fala com o computador na mesma rede (porta 8787), em vez de `127.0.0.1` do próprio aparelho. O retorno que o Stripe recusava (`http://192.168...` ou `https://localhost` do APK) passa a ser `https://jemani.vercel.app`. No telefone o checkout abre numa aba nova e a viagem confirma quando o pagamento passa. No computador, em `localhost`, o fluxo continua o mesmo.
- APK atualizado (9,7 MB) e publicado na `main` (`634895b`).

### Observação

Stripe de teste usa as Edge Functions do Supabase (sempre ligadas). Não precisa de `npm run stripe:local` no dia a dia. Checklist de produção real: `docs/STRIPE_PRODUCAO.md`.

Os erros `42501` em `trips` e `trip_assignments` (a política recusa gravar a linha) continuam no log do Supabase. Não foram alterados nesta etapa.

### Próximos passos

Ainda não feitos. Retomar nesta ordem:

6. **Stripe em produção**, só quando for pedido: chaves live, conta Connect real e tirar o modo teste. Até lá permanece em teste.
7. **Segurança do banco:** `company_users` e `pickup_locations` ainda estão sem RLS. Não ligar o RLS sem as políticas de acesso. Investigar os `42501` de `trips` e `trip_assignments` sem abrir a política para qualquer usuário.
8. **Deploy:** conferir se a Vercel publicou a `main` (`634895b`) e se o APK novo está no ar. Publicar a Edge Function `stripe-criar-checkout` se o telefone ainda usar um app antigo.

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

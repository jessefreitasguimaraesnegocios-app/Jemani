# Changelog

Registro das mudanças do Jemani.

## [2026-10-01]

### Alterado

- **Área do cliente (mobile-first)**: shell com nav inferior em vidro escuro (safe-area iPhone), Lenis no scroll, início e viagens com cartões/botões touch; etapa de categoria da reserva com palco **Three.js** (modelo GLB real + tinta/escala por categoria, câmera centralizada), transições **GSAP** ao trocar opção, chips horizontais e swipe no carro. Stack de referência: Blender → Spline → Three.js → GSAP → Tailwind → Lenis. Modelo base: `public/modelos/carros/ferrari.glb` (three.js examples).

### Adicionado

- Admin → Comissões: percentual **por empresa** (salvar individual), padrão da plataforma e botão **Aplicar a todas as empresas**; histórico de comissões agrupado por parceira. Coluna `comissao_percentual` em `companies`. Ao aceitar a corrida, o repasse usa o % da empresa.

### Adicionado

- **Stripe Connect (teste)**: Checkout Session para o cliente pagar a plataforma; Edge Functions `stripe-criar-checkout`, `stripe-verificar-sessao`, `stripe-webhook`, `stripe-connect-onboarding`, `stripe-transferir-empresa`; botão **Pagar com Stripe (teste)** na viagem; onboarding Connect no perfil da empresa; transfer ao aceitar corrida; docs em `docs/STRIPE_TESTE.md`.

### Alterado

- Empresa → Motoristas: cadastro cria conta de acesso com **e-mail e senha** (perfil `motorista` + login em `/entrar`); lista mostra o e-mail vinculado.
- Admin → Configurações: removidos comissão e bloco Plataforma (nome/taxa/região); foco em idioma (PT/EN/ES), aparência, som de notificação, vibração e push.
- **i18n global**: troca de idioma em Configurações altera o app inteiro (PT-BR / EN / ES) — menus, status, páginas principais, datas/valores e `document.documentElement.lang`. Aparência claro/escuro/sistema aplica `data-tema` no HTML.
- **Tema escuro** redesenhado no estilo Uber: fundo preto, superfícies `#121212`, texto branco/cinza de alto contraste, sidebar preta com item ativo invertido, inputs/botões e cartões alinhados (sem sidebar clara nem cards cinza-roxos).
- Admin → Financeiro redesenhado: filtros por empresa (select + chips), tipo/status de pagamento, categoria e busca; visões **Por empresa**, **Por tipo** e **Todos os lançamentos**; resumos (volume, comissão, valor empresas, situação) acompanham o filtro; cada lançamento mostra código da corrida, empresa, categoria, provedor e status legível.

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

# Jemani

Marketplace de transporte executivo em **Los Angeles** e região metropolitana (Santa Monica, Beverly Hills, Pasadena, Long Beach, Burbank, Malibu, Hollywood e mais).

A plataforma capta clientes, distribui solicitações para empresas parceiras e registra a comissão.

## Novidades — 12/10/2026

### Empresa

- **Viagens ao vivo**: mapa com os carros e kanban dos status. Abas de motoristas online e chat com a empresa.
- **Motoristas**: o nome abre o histórico (corridas do dia, da semana e do mês, horas, km, tempo inativo e tempo em corrida). O cadastro fica atrás do botão **Cadastrar motorista**.
- **Veículos**: o cadastro fica atrás do botão **Cadastrar veículo**. O clique no carro abre mecânica e lava-jato.

### Motorista

- Aba **Carro** para agendar mecânica e lava-jato. A empresa vê a quantidade no histórico do motorista.

Detalhe completo no [`CHANGELOG.md`](CHANGELOG.md).

## Novidades — 01/10/2026

### Área do cliente (mobile / iPhone)

- Layout mobile-first: nav inferior em vidro escuro com safe-area, header sticky e scroll suave (**Lenis**).
- Início e Minhas viagens com cartões e botões pensados para toque.
- Reserva → escolha da frota em **showroom com fotos** (Expedition, Volvo XC90, Classe S, Lucid Air, Escalade, Sprinter, shuttle e charter), fundo preto e faixa de seleção. O Stripe continua em modo teste.
- Stack de referência: Blender → Spline → **Three.js** → **GSAP** → Tailwind → **Lenis**

### Pagamentos (Stripe Connect — teste)

- Cliente paga a plataforma via Checkout Session.
- Empresa faz onboarding Connect no perfil.
- Ao aceitar a corrida, a plataforma pode transferir o valor da empresa.
- Edge Functions: `stripe-criar-checkout`, `stripe-verificar-sessao`, `stripe-webhook`, `stripe-connect-onboarding`, `stripe-transferir-empresa`.
- Guia: [`docs/STRIPE_TESTE.md`](docs/STRIPE_TESTE.md)

### Admin e plataforma

- **Comissões por empresa** (salvar individual, padrão da plataforma, “Aplicar a todas”).
- **Financeiro** redesenhado: filtros, visões por empresa/tipo e resumos.
- **Configurações**: idioma (PT-BR / EN / ES), aparência claro/escuro/sistema, alertas (som, vibração, push).
- **i18n global** em todo o app.
- **Tema escuro** estilo Uber (alto contraste).

### Empresa

- Cadastro de motorista com **e-mail e senha** (login em `/entrar`).
- Lista mostra o e-mail vinculado à conta.

Detalhe completo no [`CHANGELOG.md`](CHANGELOG.md).

## 1. Instalar

```bash
npm install
```

## 2. Executar (modo DEMO)

```bash
npm run dev
```

Abra `http://localhost:5173`.

## 3. Contas DEMO

Senha de todas: `demo1234`

| Perfil | E-mail |
|--------|--------|
| Cliente | `cliente@jemani.app` |
| Empresa (LA Premier Cars) | `empresa@lapremier.app` |
| Motorista | `motorista@jemani.app` |
| Admin | `admin@jemani.app` |

Outras empresas: `empresa@pacificexec.app`, `empresa@westcoastmobility.app`

## 4. Fluxo de teste

1. Entre como **cliente**
2. Reserve: LAX Airport → Beverly Hills · amanhã · 15:00 · 4 passageiros · JEMANI VAN  
   (na etapa de categoria, teste o showroom 3D)
3. Confirme e, se Stripe estiver configurado, pague com **Pagar com Stripe (teste)**
4. Entre como **empresa** (`empresa@lapremier.app`)
5. Aceite a solicitação e atribua motorista/veículo
6. Acompanhe status como cliente / motorista
7. Finalize e confira comissão no **admin**

## 5. Supabase / Deploy

Veja `.env.example`. Migrations em `supabase/migrations/`.

Deploy sugerido: **Vercel**.  
Repositório: [github.com/jessefreitasguimaraesnegocios-app/Jemani](https://github.com/jessefreitasguimaraesnegocios-app/Jemani)

## Região

Los Angeles e cidades da região: LAX, Santa Monica, Beverly Hills, Pasadena, Long Beach, Burbank, Malibu, Century City, Hollywood.

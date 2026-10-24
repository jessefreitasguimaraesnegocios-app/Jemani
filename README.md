# Jemani

Marketplace de transporte executivo nos **Estados Unidos** e no **mundo** — endereços e aeroportos em qualquer cidade (com hub operacional forte em Los Angeles).

A plataforma capta clientes, distribui solicitações para empresas parceiras e registra a comissão.

## Novidades — 23/10/2026

### Hourly Chauffeur

- Modalidade **por hora** na reserva (além do transfer one-way): duração contratada, franquia de milhas e extensão com pagamento.
- Admin configura preço/hora e regras em **Preços** (`0` = hourly desligado).
- Migration: `supabase/migrations/20261023220000_hourly_chauffeur.sql` (aplicar no SQL Editor do Supabase Jemani).

### Cobertura e chat

- Endereços e aeroportos no **mundo todo** (Mapbox sem limite de LA).
- Motorista recebe alerta quando a empresa manda mensagem no chat (**!** pulsando no menu).

### Entre aparelhos (site + APK)

- Mesma fonte **Supabase** para corridas, ofertas, GPS, veículos, turnos, mensagens e notificações.
- APK atual: **1.0.30** (`npm run android:apk` → `public/downloads/jemani-android.apk`).

Detalhe completo no [`CHANGELOG.md`](CHANGELOG.md).

### Próximos passos

A ordem está no [`CHANGELOG.md`](CHANGELOG.md):

6. Stripe em produção só quando for pedido. Continua em teste.
7. Políticas de acesso antes de ligar o RLS em `company_users` e `pickup_locations`.
8. Fechar sync restante (motorista/empresa na nuvem, avaliações/comissões) se ainda divergir entre aparelhos.

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

## Cobertura de reservas

Busca de endereços via Mapbox **sem limite de cidade** (EUA e exterior). Aeroportos com terminal/meio-fio incluem LAX e hubs dos EUA (JFK, ORD, MIA…) e do mundo (LHR, CDG, GRU, NRT…); demais aeroportos do mapa entram como ponto principal.

# Aplicativos móveis (Capacitor)

O projeto web pode ser empacotado para Android e iOS com Capacitor.

## Android APK de teste

Com Android Studio, Android SDK, Java 21 e Node 22 instalados, execute:

```bash
npm run android:apk
```

O comando cria um APK debug e o copia para `public/downloads/jemani-android.apk`, que é o arquivo servido pelo botão de download na página inicial. O APK atual é para instalação/teste manual; ainda não é uma versão assinada para publicação na Google Play.

## iOS

O projeto Capacitor iOS está em `ios/`. Para atualizar os assets web:

```bash
npm run ios:sync
```

A compilação e assinatura do `.ipa` exigem macOS, Xcode e as credenciais de distribuição da Apple. Depois, publique pela App Store ou TestFlight e substitua o aviso “em breve” na página pelo link oficial.

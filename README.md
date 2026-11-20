# Jemani

Marketplace de transporte executivo nos **Estados Unidos** e no **mundo** — endereços e aeroportos em qualquer cidade (com hub operacional forte em Los Angeles).

A plataforma capta clientes, distribui solicitações para empresas parceiras e registra a comissão.

## Estado atual — 19/11/2026

- **APK:** gerar com `npm run android:apk` → `public/downloads/jemani-android.apk` (versão no `versao-android.json`).
- **Produção web:** projeto Vercel **`jemani`** → [jemani.vercel.app](https://jemani.vercel.app) (único projeto ligado ao repo).
- **Segurança reserva:** preço no servidor (`criar_viagem` + trigger). “Simular pagamento” ainda ligado na web/APK de teste (desligar só quando for produção real).
- **Desempenho:** rotas e layouts sob demanda (`React.lazy`); Mapbox e Supabase em chunks separados; auth, sync Supabase, GPS do motorista e notificações no shell.
- **Descoberta pública (sem HTML da SPA):** `/robots.txt`, `/llms.txt`, `/ai-catalog.json`, `/.well-known/ai-catalog.json`.
- **Reserva do cliente:** **3 passos** (origem/destino → data/hora → frota → pagamento na viagem).
- **Padrão do app:** tema **escuro** e idioma **EN**.
- **Fonte de verdade:** Supabase (corridas, ofertas, GPS, frota, turnos, mensagens, notificações, comissões).
- **Push nativo (APK):** FCM via Capacitor; tokens em `device_push_tokens`; envio só no INSERT de `notifications`. Setup: [`docs/PUSH-NATIVO.md`](docs/PUSH-NATIVO.md).
- **E-mails de oferta:** guia de DNS, Resend, Supabase e automação em [`docs/EMAILS-OFERTAS.md`](docs/EMAILS-OFERTAS.md).

Histórico completo: [`CHANGELOG.md`](CHANGELOG.md).

### Pagamentos (Stripe — teste)

- Checkout Session na plataforma; Connect no perfil da empresa; Transfer ao aceitar.
- Guia: [`docs/STRIPE_TESTE.md`](docs/STRIPE_TESTE.md) · Produção: [`docs/STRIPE_PRODUCAO.md`](docs/STRIPE_PRODUCAO.md).

### Segurança

- [`docs/SEGURANCA.md`](docs/SEGURANCA.md) · Deploy SQL/Edge: [`docs/SEGURANCA-DEPLOY.md`](docs/SEGURANCA-DEPLOY.md).

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
2. Reserve: LAX Airport → Beverly Hills · amanhã · 15:00 · 4 passageiros · frota (3 passos)
3. Confirme e pague com **Pagar com Stripe (teste)** (`4242 4242 4242 4242`)
4. Entre como **empresa** (`empresa@lapremier.app`)
5. Aceite a solicitação e atribua motorista/veículo
6. Acompanhe status como cliente / motorista (no hourly, informe desembarque na reserva; depois o cliente adiciona paradas e o motorista marca “Cheguei”)
7. Finalize e confira comissão no **admin**

## 5. Supabase / Deploy

Veja `.env.example`. Migrations em `supabase/migrations/`.

- **Vercel:** projeto **`jemani`** (team Apps' projects) → `https://jemani.vercel.app`
- Repositório: [github.com/jessefreitasguimaraesnegocios-app/Jemani](https://github.com/jessefreitasguimaraesnegocios-app/Jemani)
- Arquivos estáticos em `public/` (APK, `robots.txt`, `llms.txt`, catálogos) têm prioridade sobre o rewrite SPA em `vercel.json`

## Cobertura de reservas

Busca de endereços via Mapbox **sem limite de cidade** (EUA e exterior). Aeroportos com terminal/meio-fio incluem LAX e hubs dos EUA (JFK, ORD, MIA…) e do mundo (LHR, CDG, GRU, NRT…); demais aeroportos do mapa entram como ponto principal.

# Aplicativos móveis (Capacitor)

O projeto web pode ser empacotado para Android e iOS com Capacitor.

## Android APK de teste

Com Android Studio, Android SDK, Java 21 e Node 22 instalados, execute:

```bash
npm run android:apk
```

O comando cria um APK debug e o copia para `public/downloads/jemani-android.apk`, que é o arquivo servido pelo botão de download na página inicial. Também atualiza `public/downloads/versao-android.json` (`versionCode`). O APK atual é para instalação/teste manual; ainda não é uma versão assinada para publicação na Google Play.

## iOS

O projeto Capacitor iOS está em `ios/`. Para atualizar os assets web:

```bash
npm run ios:sync
```

A compilação e assinatura do `.ipa` exigem macOS, Xcode e as credenciais de distribuição da Apple. Depois, publique pela App Store ou TestFlight e substitua o aviso “em breve” na página pelo link oficial.

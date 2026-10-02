# Jemani

Marketplace de transporte executivo em **Los Angeles** e região metropolitana (Santa Monica, Beverly Hills, Pasadena, Long Beach, Burbank, Malibu, Hollywood e mais).

A plataforma capta clientes, distribui solicitações para empresas parceiras e registra a comissão.

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
3. Confirme
4. Entre como **empresa** (`empresa@lapremier.app`)
5. Aceite a solicitação e atribua motorista/veículo
6. Acompanhe status como cliente / motorista
7. Finalize e confira comissão no **admin**

## 5. Supabase / Deploy

Veja `.env.example`. Migrations em `supabase/migrations/`.

Deploy sugerido: **Vercel**.

## Região

Los Angeles e cidades da região: LAX, Santa Monica, Beverly Hills, Pasadena, Long Beach, Burbank, Malibu, Century City, Hollywood.

# Push nativo (Capacitor + FCM)

Alertas in-app (Realtime + `feedbackAlerta`) continuam iguais. O push do sistema só dispara no **INSERT** em `notifications` via Edge `enviar-push` — o app **não** chama FCM no frontend.

## Fluxo

1. Login no APK → permissão → token em `device_push_tokens`.
2. Evento de negócio grava em `notifications` (como hoje).
3. Trigger `jemani_enviar_push` (pg_net) → `enviar-push` → FCM HTTP v1.  
   Vault: `jemani_push_webhook_secret` = secret `PUSH_WEBHOOK_SECRET`.
4. App fechado/background: bandeja do sistema; tap abre a rota.
5. App aberto: Realtime atualiza a lista; o listener de push **não** toca som de novo (dedupe por `notificationId`).

## Arquivos locais (não commit)

- `android/app/google-services.json` — Firebase app Android (`com.jemani.executivemobility`)
- JSON da service account FCM → secret `FCM_SERVICE_ACCOUNT_JSON`

## Checklist de teste

1. Instalar APK com `google-services.json`.
2. Login → aceitar notificações → linha em `device_push_tokens` (`ativo=true`).
3. App em background → inserir notificação para esse `usuario_id` → push no sistema.
4. Tap → rota correta.
5. App em foreground → um único feedback (sem double beep).

## Preferência

`platform_settings.notificacoes_push = false` desliga o envio na Edge. No aparelho, o registro só roda se a config estiver ligada.

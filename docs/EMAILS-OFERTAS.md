# E-mails de oferta de corrida da Jemani

## Configuração em produção

- **Site e links “Revisar corrida”** · [jemani.vercel.app](https://jemani.vercel.app). O subdomínio da Vercel serve o app. O remetente é configurado nas Edge Functions do Supabase.
- **Domínio de envio** · [ofertas.shoppingdelrey.com no Resend](https://resend.com/domains/3e377c02-507b-4a35-b642-172b0db6d1a7), verificado para envio, região São Paulo (`sa-east-1`).
- **DNS** · [Hostinger, zona shoppingdelrey.com](https://hpanel.hostinger.com/domain/shoppingdelrey.com/dns). Os três registros de envio foram adicionados sob o subdomínio `ofertas`.
- **Conta Resend** · `jessefreitasguimaraes@gmail.com`. Essa conta administra o domínio e pode receber testes.
- **Remetente** · `Jemani <corridas@ofertas.shoppingdelrey.com>`, salvo como `EMAIL_FROM` no Supabase.
- **Chave** · `Jemani — ofertas Supabase`, criada na mesma conta do domínio com **Sending access** limitado a `ofertas.shoppingdelrey.com` e salva em `RESEND_API_KEY`.
- **Supabase** · [Secrets das Edge Functions do projeto Jemani](https://supabase.com/dashboard/project/qdiocaeoevxhdsrtcahn/functions/secrets), ref `qdiocaeoevxhdsrtcahn`.

Após a troca da chave, a execução de produção retornou **2 envios aceitos pelo Resend e 0 falhas**. A confirmação de entrega fica no painel **Resend → Emails**.

## 1. Configurar o domínio no Resend e o DNS na Hostinger

1. Entre no [Resend → Domains](https://resend.com/domains) na conta indicada acima. Em **Add domain**, informe `ofertas.shoppingdelrey.com` sem protocolo. Para recriar a configuração atual, use São Paulo e mantenha habilitado **Enable Sending**.
2. Abra **Hostinger → Domínios → shoppingdelrey.com → DNS / Nameservers → Gerenciar registros DNS**. Os nomes na tabela são relativos à zona `shoppingdelrey.com`. Copie sempre os destinos e o DKIM do painel do Resend se cadastrar o domínio novamente ou se o provedor emitir novos valores.

| Tipo | Nome na Hostinger | Valor | TTL |
| --- | --- | --- | --- |
| TXT | `resend._domainkey.ofertas` | Chave **p=…** do registro DKIM exibida no Resend | Automático ou padrão da Hostinger |
| CNAME | `rsend.ofertas` | `rsend-sae1.forge.rmta.net` | 3600 |
| CNAME | `send.ofertas` | `send.forge.rmta.net` | 3600 |

3. Adicione cada registro. Preserve os registros do domínio principal e os nameservers. O envio usa o subdomínio `ofertas`, com **Enable Receiving** desligado.
4. Volte ao Resend e clique em **I've already added the records**. Aguarde o domínio ficar **Verified** e o envio aparecer como **Ready**. Se ficar pendente, confira os nomes, tipos e valores na Hostinger e aguarde a propagação.

A Vercel pode continuar servindo o mesmo endereço. O domínio usado no remetente e a URL dos convites são configurações independentes. [Verificação de domínio no Resend](https://resend.com/changelog/domain-verification-events)

## 2. Configurar os secrets no Supabase

1. Em [Resend → API Keys](https://resend.com/api-keys), crie uma chave com **Sending access** para `ofertas.shoppingdelrey.com`. Copie o valor uma vez e use-o diretamente no Dashboard do Supabase.
2. No projeto Jemani, abra **Edge Functions → Secrets** e salve os campos abaixo. A mesma configuração atende o envio manual e o automático.
3. No [Vault do Supabase](https://supabase.com/dashboard/project/qdiocaeoevxhdsrtcahn/integrations/vault/secrets), configure o endpoint e uma cópia do segredo dedicado do agendador.

| Local | Nome | Valor esperado |
| --- | --- | --- |
| Edge Functions → Secrets | `RESEND_API_KEY` | Chave de envio da conta Resend que verificou o domínio |
| Edge Functions → Secrets | `EMAIL_FROM` | `Jemani <corridas@ofertas.shoppingdelrey.com>` |
| Edge Functions → Secrets | `OFFER_EMAIL_CRON_SECRET` | Segredo aleatório longo e exclusivo do agendador |
| Vault | `jemani_offer_email_cron_secret` | Mesmo valor de `OFFER_EMAIL_CRON_SECRET` |
| Vault | `jemani_offer_email_endpoint` | `https://qdiocaeoevxhdsrtcahn.supabase.co/functions/v1/automatizar-ofertas-email` |

Em outro ambiente, use os endpoints e os secrets daquele projeto. Guarde valores de chaves e tokens fora do Git, do frontend e de mensagens.

## 3. Publicar ou restaurar o backend

No projeto de destino, confira o histórico antes de aplicar migrations. Em um banco novo, aplique as migrations do repositório em ordem, incluindo as de reservas e convites. Estas migrations montam a automação:

1. [`20261119200000_offer_email_automation.sql`](../supabase/migrations/20261119200000_offer_email_automation.sql) cria as tabelas, as cotas, as RPCs e o cron `jemani-offer-email-automation`.
2. [`20261119210000_dispatch_offer_email_on_save.sql`](../supabase/migrations/20261119210000_dispatch_offer_email_on_save.sql) dispara o processamento após salvar a configuração com o envio ligado.
3. [`20261119220000_sequenciar_email_ofertas.sql`](../supabase/migrations/20261119220000_sequenciar_email_ofertas.sql) dispara após a corrida ficar elegível, encadeia ofertas e registra recusas do provedor.

No repositório, com a CLI autenticada para o projeto correto, publique as funções necessárias:

```powershell
npx supabase functions deploy enviar-oferta-email --project-ref qdiocaeoevxhdsrtcahn --no-verify-jwt
npx supabase functions deploy convite-oferta --project-ref qdiocaeoevxhdsrtcahn --no-verify-jwt
npx supabase functions deploy automatizar-ofertas-email --project-ref qdiocaeoevxhdsrtcahn --no-verify-jwt
```

`enviar-oferta-email` valida a sessão e o perfil admin. `convite-oferta` atende a rota pública com token exclusivo. A automação autentica as chamadas do banco pelo cabeçalho `x-offer-cron-secret`. O `pg_net` chama a Edge Function após a gravação e o `pg_cron` roda a cada minuto para avançar a fila e recuperar retentativas.

O deploy web segue o fluxo da `main` na Vercel. Alterações em `EMAIL_FROM` e `RESEND_API_KEY` são feitas no Supabase e dispensam um novo deploy web.

## 4. Ativar e operar

1. Abra **Admin → Novas solicitações → ⋯ → Automação de e-mails**.
2. Defina a **Cota padrão por empresa** e, se precisar, adicione cotas individuais. Uma cota de `0` exclui a empresa do envio automático naquele ciclo.
3. Marque **Priorizar** nas empresas que devem receber primeiro e organize a ordem com as setas.
4. Ligue **Envio automático** e clique em **Salvar configuração**. Em um projeto novo a configuração começa pausada.
5. Confira os contadores de enviados, na fila e com falha. **Reiniciar cotas** começa um novo ciclo de contagem. O histórico evita repetir uma oferta automática já enviada para a mesma empresa e corrida.

Uma corrida futura, paga e sem empresa confirmada entra na automação. A fila considera empresas ativas, habilitadas, com e-mail e compatíveis com a categoria e a frota. Cumpre as prioridades configuradas e, em seguida, a distância até o embarque. Cada corrida recebe uma oferta automática por vez. Após o envio, o convite fica válido por até **15 minutos**, limitado ao horário da corrida. Sem aceite, a próxima execução do cron oferece à próxima empresa elegível. O aceite interrompe a sequência. O botão **Enviar e-mail** continua disponível para o envio manual.

## 5. Testar e diagnosticar

- Faça uma reserva de teste com corrida futura, empresa elegível e destinatário controlado. Confirme o pagamento pelo fluxo de QA. No **Resend → Emails**, verifique o remetente, o destinatário e o status **Delivered**. Um retorno de API aceito aparece antes da confirmação de entrega.
- Abra **Revisar corrida** e confirme a abertura em `https://jemani.vercel.app/convite/…`. Confira a validade do convite. Para validar a sequência, rode um cenário sem aceite e outro com aceite antes de 15 minutos.
- **HTTP 403 com `onboarding@resend.dev`** indica que o remetente de teste está limitado. Confira `EMAIL_FROM` no Supabase.
- **HTTP 403 de domínio não verificado, com o domínio já Verified** foi o erro da chave anterior. Confirme que a chave pertence à mesma conta ou equipe Resend que verificou o domínio e que tem acesso de envio para esse domínio. No incidente, a substituição por uma chave restrita ao domínio resolveu a recusa.
- **Falha na fila** · confira **Supabase → Edge Functions → automatizar-ofertas-email → Logs**, o job no Cron e as entradas do Vault. Cruze o horário com [Resend → Logs](https://resend.com/logs).
- **Corrida sem envio** · confira status pago, data futura, empresa ainda indefinida, automação ligada, elegibilidade, cotas e janela de 15 minutos. Uma recusa definitiva do Resend libera a próxima empresa elegível. A mesma empresa pode voltar a ser considerada depois de uma hora quando a recusa foi 403. Erros transitórios podem ser tentados novamente com intervalo de cinco minutos.
- **Convite antigo com `localhost`** · o e-mail já recebido preserva o link original. Se o convite continuar válido, substitua apenas a origem por `https://jemani.vercel.app`. Os envios atuais usam a origem pública.

Consulta opcional de operação no SQL Editor. A saída mostra estados e totais, sem dados de viagem ou credenciais:

```sql
select enabled, default_quota from public.offer_email_automation where id;
select jobname, active, schedule from cron.job
where jobname = 'jemani-offer-email-automation';
select state, provider_status, count(*) as total
from public.offer_email_jobs
group by state, provider_status
order by state, provider_status;
```

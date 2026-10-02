import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { iniciarOnboardingConnect, stripeCheckoutDisponivel } from '@/lib/stripeApi'
import { useDemoStore } from '@/store/demoStore'

export function EmpresaPerfilPage() {
  const { t } = usarIdioma()
  const { usuario } = useAuth()
  const [params, setParams] = useSearchParams()
  const empresa = useDemoStore((s) => s.obterEmpresaDoUsuario(usuario?.id ?? ''))
  const categorias = useDemoStore((s) => s.categorias)
  const salvarEmpresa = useDemoStore((s) => s.salvarEmpresa)
  const [msg, setMsg] = useState('')
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    const connect = params.get('connect')
    if (connect === 'ok') {
      setMsg('Onboarding Stripe Connect concluído (ou em revisão).')
      setParams({}, { replace: true })
    } else if (connect === 'refresh') {
      setMsg('Link de onboarding expirado — gere um novo abaixo.')
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  if (!empresa) return <div className="cartao">{t('hist.empresaAusente')}</div>

  async function conectarStripe() {
    setCarregando(true)
    setMsg('')
    try {
      const resultado = await iniciarOnboardingConnect({
        empresa_id: empresa!.id,
        email: empresa!.email,
        nome: empresa!.nome_comercial,
        stripe_account_id: empresa!.stripe_account_id,
      })
      salvarEmpresa({ id: empresa!.id, stripe_account_id: resultado.stripe_account_id })
      window.location.href = resultado.onboarding_url
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Erro ao iniciar Connect')
      setCarregando(false)
    }
  }

  return (
    <div className="animar-entrada space-y-4">
      <h1 className="fonte-display text-3xl">{t('empresa.perfil.titulo')}</h1>
      <div className="cartao grid gap-3 sm:grid-cols-2">
        <Campo label="Nome comercial" valor={empresa.nome_comercial} />
        <Campo label="Razão social" valor={empresa.razao_social} />
        <Campo label="CNPJ" valor={empresa.cnpj} />
        <Campo label="Telefone" valor={empresa.telefone} />
        <Campo label="E-mail" valor={empresa.email} />
        <Campo label="Cidade" valor={empresa.cidade} />
        <Campo label="Status" valor={empresa.status} />
        <Campo label="Regiões" valor={empresa.regioes_atendidas.join(', ')} />
        <div className="sm:col-span-2">
          <p className="rotulo">Categorias</p>
          <p className="font-medium">
            {empresa.categorias_ids
              .map((id) => categorias.find((c) => c.id === id)?.nome)
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>
      </div>

      <div className="cartao space-y-3">
        <h2 className="fonte-display text-2xl">Stripe Connect</h2>
        <p className="text-sm text-[var(--color-slate)]">
          Cadastre a conta Connect (teste) para receber o repasse quando a empresa aceitar uma
          corrida já paga pelo cliente.
        </p>
        <Campo
          label="Conta Connect"
          valor={empresa.stripe_account_id ?? 'Ainda não vinculada'}
        />
        {stripeCheckoutDisponivel() ? (
          <button
            type="button"
            className="btn-primario"
            disabled={carregando}
            onClick={() => void conectarStripe()}
          >
            {carregando
              ? 'Abrindo Stripe...'
              : empresa.stripe_account_id
                ? 'Continuar onboarding Connect'
                : 'Conectar Stripe (teste)'}
          </button>
        ) : (
          <p className="text-xs text-[var(--color-slate)]">
            Ative VITE_STRIPE_ENABLED=true e publique a Edge Function stripe-connect-onboarding.
          </p>
        )}
        {msg && <p className="text-sm text-[var(--color-success)]">{msg}</p>}
      </div>
    </div>
  )
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="rotulo">{label}</p>
      <p className="font-medium">{valor}</p>
    </div>
  )
}

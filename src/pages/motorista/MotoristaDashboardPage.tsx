import { useMemo, useState } from 'react'
import { BadgeStatus } from '@/components/BadgeStatus'
import { ModalFinalizarViagem } from '@/components/ModalFinalizarViagem'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import type { StatusViagem } from '@/types'
import { formatarData, formatarMoeda } from '@/utils/format'

const ACOES: Array<{ statusAtual: StatusViagem; proximo: StatusViagem; label: string }> = [
  { statusAtual: 'motorista_atribuido', proximo: 'motorista_a_caminho', label: 'A caminho' },
  { statusAtual: 'motorista_a_caminho', proximo: 'motorista_chegou', label: 'Cheguei' },
  { statusAtual: 'motorista_chegou', proximo: 'passageiro_embarcou', label: 'Passageiro embarcou' },
  { statusAtual: 'passageiro_embarcou', proximo: 'viagem_em_andamento', label: 'Iniciar viagem' },
]

export function MotoristaDashboardPage() {
  const { t, locale } = usarIdioma()
  const { usuario } = useAuth()
  const motorista = useDemoStore((s) => s.obterMotoristaDoUsuario(usuario?.id ?? ''))
  const todasViagens = useDemoStore((s) => s.viagens)
  const viagens = useMemo(
    () =>
      todasViagens
        .filter(
          (v) =>
            v.motorista_id === motorista?.id &&
            !['cancelada', 'viagem_finalizada', 'expired'].includes(v.status),
        )
        .sort((a, b) =>
          `${a.data_viagem}${a.horario}`.localeCompare(`${b.data_viagem}${b.horario}`),
        ),
    [todasViagens, motorista?.id],
  )
  const veiculos = useDemoStore((s) => s.veiculos)
  const perfis = useDemoStore((s) => s.perfis)
  const empresas = useDemoStore((s) => s.empresas)
  const atualizarStatus = useDemoStore((s) => s.atualizarStatus)
  const solicitarFinalizacao = useDemoStore((s) => s.solicitarFinalizacao)
  const confirmarFinalizacao = useDemoStore((s) => s.confirmarFinalizacao)
  const [mostrarFinalizar, setMostrarFinalizar] = useState(false)
  const [erro, setErro] = useState('')

  if (!motorista) {
    return <div className="cartao">Motorista não vinculado a este usuário.</div>
  }

  const proxima = viagens[0]
  const veiculo = veiculos.find((x) => x.id === proxima?.veiculo_id)

  return (
    <div className="animar-entrada space-y-4">
      <h1 className="fonte-display text-3xl">
        {t('comum.olaNome', { nome: motorista.nome.split(' ')[0] })}
      </h1>

      {!proxima ? (
        <div className="cartao text-[var(--color-slate)]">Nenhuma viagem atribuída no momento.</div>
      ) : (
        <div className="cartao space-y-4">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <p className="text-sm text-[var(--color-slate)]">Próxima viagem</p>
              <h2 className="fonte-display text-3xl">{proxima.codigo}</h2>
            </div>
            <BadgeStatus status={proxima.status} />
          </div>
          <div className="grid gap-2 text-sm">
            <p>
              <strong>Data:</strong> {formatarData(proxima.data_viagem, locale)} · {proxima.horario}
            </p>
            <p>
              <strong>Passageiro:</strong>{' '}
              {proxima.nome_passageiro ??
                perfis.find((p) => p.id === proxima.cliente_id)?.nome ??
                '—'}
            </p>
            <p>
              <strong>Origem:</strong> {proxima.origem}
            </p>
            <p>
              <strong>Destino:</strong> {proxima.destino}
            </p>
            <p>
              <strong>Veículo:</strong>{' '}
              {veiculo ? `${veiculo.marca} ${veiculo.modelo}` : '—'}
            </p>
            <p>
              <strong>Valor serviço:</strong> {formatarMoeda(proxima.preco_total, locale)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ACOES.filter((a) => a.statusAtual === proxima.status).map((a) => (
              <button
                key={a.proximo}
                type="button"
                className="btn-ouro"
                onClick={() => atualizarStatus(proxima.id, a.proximo, usuario?.id)}
              >
                {a.label}
              </button>
            ))}
            {proxima.status === 'viagem_em_andamento' && (
              <button
                type="button"
                className="btn-primario"
                onClick={() => {
                  const check = solicitarFinalizacao(proxima.id)
                  if (!check.ok) {
                    setErro(check.mensagem)
                    return
                  }
                  setErro('')
                  setMostrarFinalizar(true)
                }}
              >
                Finalizar viagem
              </button>
            )}
          </div>
          {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}
        </div>
      )}

      {mostrarFinalizar && proxima && (
        <ModalFinalizarViagem
          viagem={proxima}
          clienteNome={
            proxima.nome_passageiro ?? perfis.find((p) => p.id === proxima.cliente_id)?.nome
          }
          empresaNome={empresas.find((e) => e.id === proxima.empresa_id)?.nome_comercial}
          veiculoLabel={veiculo ? `${veiculo.marca} ${veiculo.modelo}` : undefined}
          onCancelar={() => setMostrarFinalizar(false)}
          onConfirmar={() => {
            if (!usuario) return
            try {
              confirmarFinalizacao(proxima.id, usuario.id, true)
              setMostrarFinalizar(false)
            } catch (e) {
              setErro(e instanceof Error ? e.message : 'Erro')
            }
          }}
        />
      )}

      {viagens.length > 1 && (
        <div className="space-y-2">
          <h3 className="font-medium">Outras viagens</h3>
          {viagens.slice(1).map((v) => (
            <div key={v.id} className="cartao flex justify-between">
              <span>
                {v.codigo} · {formatarData(v.data_viagem, locale)} {v.horario}
              </span>
              <BadgeStatus status={v.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

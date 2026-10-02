import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { useDemoStore } from '@/store/demoStore'
import { formatarData, formatarMoeda } from '@/utils/format'

export function EmpresaSolicitacoesPage() {
  const { t } = usarIdioma()
  const { usuario } = useAuth()
  const empresa = useDemoStore((s) => s.obterEmpresaDoUsuario(usuario?.id ?? ''))
  const atribuicoes = useDemoStore((s) => s.atribuicoes)
  const viagens = useDemoStore((s) => s.viagens)
  const categorias = useDemoStore((s) => s.categorias)
  const aceitarViagem = useDemoStore((s) => s.aceitarViagem)
  const recusarViagem = useDemoStore((s) => s.recusarViagem)
  const [erro, setErro] = useState('')

  if (!empresa) return <div className="cartao">{t('hist.empresaAusente')}</div>

  const ofertas = atribuicoes
    .filter((a) => a.empresa_id === empresa.id && a.status === 'oferecida')
    .map((a) => ({
      atribuicao: a,
      viagem: viagens.find((v) => v.id === a.viagem_id),
    }))
    .filter((x) => x.viagem && ['aguardando_empresa', 'oferta_enviada'].includes(x.viagem.status))

  function aceitar(viagemId: string) {
    setErro('')
    try {
      aceitarViagem(viagemId, empresa!.id)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao aceitar')
    }
  }

  function recusar(viagemId: string) {
    recusarViagem(viagemId, empresa!.id)
  }

  return (
    <div className="animar-entrada space-y-4">
      <h1 className="fonte-display text-3xl">{t('empresa.solicitacoes.titulo')}</h1>
      {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}
      {ofertas.length === 0 && (
        <div className="cartao text-[var(--color-slate)]">
          Nenhuma solicitação disponível no momento.
        </div>
      )}
      {ofertas.map(({ viagem }) => {
        if (!viagem) return null
        const cat = categorias.find((c) => c.id === viagem.categoria_id)
        return (
          <div key={viagem.id} className="cartao space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--color-gold-deep)]">
                  Nova solicitação
                </p>
                <h2 className="fonte-display text-3xl">{viagem.codigo}</h2>
              </div>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-[var(--color-slate)]">Origem:</span> {viagem.origem}
              </p>
              <p>
                <span className="text-[var(--color-slate)]">Destino:</span> {viagem.destino}
              </p>
              <p>
                <span className="text-[var(--color-slate)]">Data:</span>{' '}
                {formatarData(viagem.data_viagem)}
              </p>
              <p>
                <span className="text-[var(--color-slate)]">Horário:</span> {viagem.horario}
              </p>
              <p>
                <span className="text-[var(--color-slate)]">Passageiros:</span> {viagem.passageiros}
              </p>
              <p>
                <span className="text-[var(--color-slate)]">Categoria:</span> {cat?.nome}
              </p>
              <p>
                <span className="text-[var(--color-slate)]">Valor:</span>{' '}
                {formatarMoeda(viagem.preco_total)}
              </p>
              <p>
                <span className="text-[var(--color-slate)]">Comissão:</span>{' '}
                {formatarMoeda(viagem.valor_plataforma)}
              </p>
              <p className="sm:col-span-2">
                <span className="text-[var(--color-slate)]">Empresa recebe:</span>{' '}
                <strong>{formatarMoeda(viagem.valor_empresa)}</strong>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-ouro" onClick={() => aceitar(viagem.id)}>
                Aceitar
              </button>
              <button type="button" className="btn-perigo" onClick={() => recusar(viagem.id)}>
                Recusar
              </button>
              <Link to={`/empresa/viagens/${viagem.id}`} className="btn-secundario">
                Detalhes
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}

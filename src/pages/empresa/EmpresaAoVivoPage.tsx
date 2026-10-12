import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeStatus } from '@/components/BadgeStatus'
import { ChatEmpresa } from '@/components/ChatEmpresa'
import { MapaFrotaEmpresa } from '@/components/MapaFrotaEmpresa'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { agruparCorridasPorColuna, COLUNAS_QUADRO } from '@/services/quadroViagens'
import { corridaEstaNoMapa } from '@/services/posicaoCorridaAoVivo'
import {
  inicioDoTurno,
  listarMotoristasOnline,
  posicaoDoMotorista,
  veiculoDoMotorista,
} from '@/services/turnoEmpresa'
import { useDemoStore } from '@/store/demoStore'
import { formatarData } from '@/utils/format'
import '../admin/AdminViagensPage.css'
import './EmpresaAoVivoPage.css'

type AbaPainel = 'motoristas' | 'chat' | null

export function EmpresaAoVivoPage() {
  const { t, locale } = usarIdioma()
  const { usuario } = useAuth()
  const empresa = useDemoStore((s) => s.obterEmpresaDoUsuario(usuario?.id ?? ''))
  const todasViagens = useDemoStore((s) => s.viagens)
  const categorias = useDemoStore((s) => s.categorias)
  const motoristas = useDemoStore((s) => s.motoristas)
  const veiculos = useDemoStore((s) => s.veiculos)
  const turnos = useDemoStore((s) => s.turnos)
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null)
  const [aba, setAba] = useState<AbaPainel>(null)
  const [motoristaId, setMotoristaId] = useState<string | null>(null)
  const [focoSeq, setFocoSeq] = useState(0)

  const viagens = useMemo(
    () => todasViagens.filter((v) => v.empresa_id === empresa?.id),
    [todasViagens, empresa?.id],
  )
  const daEmpresa = useMemo(
    () => motoristas.filter((m) => m.empresa_id === empresa?.id),
    [motoristas, empresa?.id],
  )
  const online = useMemo(
    () => (empresa ? listarMotoristasOnline(motoristas, empresa.id, turnos, viagens) : []),
    [motoristas, empresa, turnos, viagens],
  )
  const porColuna = useMemo(() => agruparCorridasPorColuna(viagens), [viagens])
  const mapaCategorias = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias])
  const selecionada = viagens.find((v) => v.id === selecionadaId) ?? null
  const emRota = viagens.some((v) => corridaEstaNoMapa(v.status))
  const agora = Date.now()
  const pontosMotorista = online
    .filter(
      (motorista) =>
        !viagens.some(
          (viagem) => viagem.motorista_id === motorista.id && corridaEstaNoMapa(viagem.status),
        ),
    )
    .flatMap((motorista) => {
      const posicao = posicaoDoMotorista(motorista.id, turnos, viagens, agora)
      if (!posicao) return []
      return [{ id: motorista.id, nome: motorista.nome, ...posicao }]
    })
  const posicaoFoco = motoristaId
    ? posicaoDoMotorista(motoristaId, turnos, viagens, agora)
    : null
  const foco =
    motoristaId && posicaoFoco && focoSeq
      ? { id: motoristaId, seq: focoSeq, ...posicaoFoco }
      : null

  function alternarAba(proxima: Exclude<AbaPainel, null>) {
    setAba((atual) => (atual === proxima ? null : proxima))
  }

  function escolherMotorista(id: string) {
    setMotoristaId(id)
    setFocoSeq(Date.now())
    const corrida = viagens.find(
      (viagem) => viagem.motorista_id === id && corridaEstaNoMapa(viagem.status),
    )
    setSelecionadaId(corrida?.id ?? null)
  }

  function escolherViagem(id: string) {
    setMotoristaId(null)
    setSelecionadaId(id)
  }

  function horaTurno(iso?: string) {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <section className="ao-vivo">
      <header className="ao-vivo-cabeca">
        <div>
          <div className="ao-vivo-titulo-linha">
            <h1 className="fonte-display text-3xl">{t('empresa.aoVivo.titulo')}</h1>
            <div className="ao-vivo-abas">
              <button
                type="button"
                className={`ao-vivo-aba ${aba === 'motoristas' ? 'ao-vivo-aba--ativa' : ''}`}
                onClick={() => alternarAba('motoristas')}
              >
                {t('empresa.motoristas.titulo')}
              </button>
              <button
                type="button"
                className={`ao-vivo-aba ${aba === 'chat' ? 'ao-vivo-aba--ativa' : ''}`}
                onClick={() => alternarAba('chat')}
              >
                {t('empresa.aoVivo.chat')}
              </button>
            </div>
          </div>
          <p className="ao-vivo-sub">{t('empresa.aoVivo.sub')}</p>
        </div>
      </header>

      <div className="ao-vivo-mapa">
        <MapaFrotaEmpresa
          viagens={viagens}
          selecionadaId={selecionadaId}
          aoSelecionar={escolherViagem}
          pontosMotorista={pontosMotorista}
          foco={foco}
          aoFocarMotorista={escolherMotorista}
        />
        {!emRota && !selecionada && pontosMotorista.length === 0 && (
          <p className="ao-vivo-vazio">{t('empresa.aoVivo.vazioMapa')}</p>
        )}
        {aba === 'motoristas' && (
          <aside className="ao-vivo-painel">
            {online.length === 0 && (
              <p className="ao-vivo-vazio-lista">{t('empresa.aoVivo.semOnline')}</p>
            )}
            <div className="ao-vivo-motoristas">
              {online.map((motorista) => {
                const veiculo = veiculoDoMotorista(motorista.id, turnos, viagens, veiculos)
                return (
                  <button
                    key={motorista.id}
                    type="button"
                    className={`ao-vivo-motorista ${motorista.id === motoristaId ? 'ao-vivo-motorista--ativo' : ''}`}
                    onClick={() => escolherMotorista(motorista.id)}
                  >
                    <strong>{motorista.nome}</strong>
                    <span>
                      {veiculo
                        ? `${veiculo.marca} ${veiculo.modelo}`
                        : t('empresa.aoVivo.semVeiculo')}
                    </span>
                    <span>
                      {t('empresa.aoVivo.inicioTurno')}{' '}
                      {horaTurno(inicioDoTurno(motorista.id, turnos, viagens))}
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>
        )}
        {aba === 'chat' && empresa && (
          <aside className="ao-vivo-painel">
            <ChatEmpresa
              empresaId={empresa.id}
              autor="empresa"
              motoristaId={motoristaId ?? daEmpresa[0]?.id ?? ''}
              motoristas={daEmpresa}
              aoTrocarMotorista={setMotoristaId}
            />
          </aside>
        )}
        {selecionada && (
          <aside className="ao-vivo-ficha">
            <p className="ao-vivo-ficha-codigo">{selecionada.codigo}</p>
            <BadgeStatus status={selecionada.status} />
            <p>
              <span>{t('empresa.aoVivo.origem')}</span>
              {selecionada.origem}
            </p>
            <p>
              <span>{t('empresa.aoVivo.destino')}</span>
              {selecionada.destino}
            </p>
            <Link to={`/empresa/viagens/${selecionada.id}`}>{t('comum.abrir')}</Link>
          </aside>
        )}
      </div>

      <div className="ao-vivo-quadro">
        <div className="quadro-colunas">
          {COLUNAS_QUADRO.map((coluna) => {
            const lista = porColuna.get(coluna.id) ?? []
            return (
              <section key={coluna.id} className="quadro-coluna">
                <div className="quadro-coluna-cabeca">
                  <h2 className="quadro-coluna-titulo">{t(coluna.chaveTitulo)}</h2>
                  <span className="quadro-coluna-qtd">{lista.length}</span>
                </div>
                <div className="quadro-coluna-lista">
                  {lista.length === 0 && <p className="quadro-vazio">{t('admin.viagens.vazio')}</p>}
                  {lista.map((viagem) => (
                    <button
                      key={viagem.id}
                      type="button"
                      className={`quadro-card ${viagem.id === selecionadaId ? 'quadro-card--ativo' : ''}`}
                      onClick={() => escolherViagem(viagem.id)}
                    >
                      <p className="quadro-card-codigo">{viagem.codigo}</p>
                      <p className="quadro-card-rota">
                        {viagem.origem} → {viagem.destino}
                      </p>
                      <p className="quadro-card-meta">
                        {mapaCategorias.get(viagem.categoria_id)?.nome ?? '—'} ·{' '}
                        {formatarData(viagem.data_viagem, locale)} {viagem.horario}
                      </p>
                      <BadgeStatus status={viagem.status} />
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </section>
  )
}

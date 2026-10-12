import { useEffect, useMemo, useState } from 'react'
import { AgendamentoCarro } from '@/components/AgendamentoCarro'
import { BadgeStatus } from '@/components/BadgeStatus'
import { ChatEmpresa } from '@/components/ChatEmpresa'
import { linkMapa, MapaCorrida } from '@/components/MapaCorrida'
import { ModalFinalizarViagem } from '@/components/ModalFinalizarViagem'
import { useAuth } from '@/contexts/AuthContext'
import { usarAvisoDoSistema } from '@/hooks/usarAvisoDoSistema'
import { usarIdioma } from '@/i18n/usarIdioma'
import { turnoAberto } from '@/services/turnoEmpresa'
import { useDemoStore } from '@/store/demoStore'
import type { StatusViagem } from '@/types'
import './MotoristaDashboardPage.css'

const ACOES: Array<{ statusAtual: StatusViagem; proximo: StatusViagem; label: string }> = [
  { statusAtual: 'motorista_atribuido', proximo: 'motorista_a_caminho', label: 'Estou a caminho' },
  { statusAtual: 'motorista_a_caminho', proximo: 'motorista_chegou', label: 'Cheguei no embarque' },
  { statusAtual: 'motorista_chegou', proximo: 'passageiro_embarcou', label: 'Passageiro embarcou' },
  { statusAtual: 'passageiro_embarcou', proximo: 'viagem_em_andamento', label: 'Iniciar viagem' },
]

const COM_GPS: StatusViagem[] = [
  'motorista_a_caminho',
  'motorista_chegou',
  'passageiro_embarcou',
  'viagem_em_andamento',
]

function telefoneDiscavel(telefone?: string) {
  if (!telefone) return ''
  const digitos = telefone.replace(/[^\d+]/g, '')
  return digitos ? `tel:${digitos}` : ''
}

export function MotoristaDashboardPage() {
  const { t } = usarIdioma()
  const { usuario } = useAuth()
  usarAvisoDoSistema(usuario?.id)
  const motorista = useDemoStore((s) => s.obterMotoristaDoUsuario(usuario?.id ?? ''))
  const todasViagens = useDemoStore((s) => s.viagens)
  const turnos = useDemoStore((s) => s.turnos)
  const iniciarTurno = useDemoStore((s) => s.iniciarTurno)
  const encerrarTurno = useDemoStore((s) => s.encerrarTurno)
  const atualizarPosicaoTurno = useDemoStore((s) => s.atualizarPosicaoTurno)
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
  const perfis = useDemoStore((s) => s.perfis)
  const atualizarStatus = useDemoStore((s) => s.atualizarStatus)
  const atualizarPosicaoMotorista = useDemoStore((s) => s.atualizarPosicaoMotorista)
  const solicitarFinalizacao = useDemoStore((s) => s.solicitarFinalizacao)
  const confirmarFinalizacao = useDemoStore((s) => s.confirmarFinalizacao)
  const [mostrarFinalizar, setMostrarFinalizar] = useState(false)
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState<'corrida' | 'chat' | 'carro'>('corrida')

  const proxima = viagens[0]
  const cliente = perfis.find((p) => p.id === proxima?.cliente_id)
  const nomePassageiro = proxima?.nome_passageiro ?? cliente?.nome ?? 'Passageiro'
  const telefone = cliente?.telefone
  const ligar = telefoneDiscavel(telefone)
  const online = motorista ? Boolean(turnoAberto(turnos, motorista.id)) : false

  useEffect(() => {
    const seguirCorrida = Boolean(proxima && COM_GPS.includes(proxima.status))
    const viagemId = proxima?.id
    const motoristaId = motorista?.id
    if ((!seguirCorrida && !online) || !navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (seguirCorrida && viagemId) {
          atualizarPosicaoMotorista(viagemId, pos.coords.latitude, pos.coords.longitude)
        }
        if (online && motoristaId) {
          atualizarPosicaoTurno(motoristaId, pos.coords.latitude, pos.coords.longitude)
        }
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 8000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [
    proxima?.id,
    proxima?.status,
    online,
    motorista?.id,
    atualizarPosicaoMotorista,
    atualizarPosicaoTurno,
  ])

  if (!motorista) {
    return <div className="corrida-tela corrida-vazia">Motorista não vinculado a este usuário.</div>
  }

  const acao = ACOES.find((a) => a.statusAtual === proxima?.status)

  return (
    <section className="corrida-tela">
      <div className="corrida-abas">
        <button
          type="button"
          className={`corrida-aba ${aba === 'corrida' ? 'corrida-aba--ativa' : ''}`}
          onClick={() => setAba('corrida')}
        >
          {t('motorista.corrida')}
        </button>
        <button
          type="button"
          className={`corrida-aba ${aba === 'chat' ? 'corrida-aba--ativa' : ''}`}
          onClick={() => setAba('chat')}
        >
          {t('motorista.chat')}
        </button>
        <button
          type="button"
          className={`corrida-aba ${aba === 'carro' ? 'corrida-aba--ativa' : ''}`}
          onClick={() => setAba('carro')}
        >
          {t('motorista.carro')}
        </button>
        <button
          type="button"
          className={`corrida-online ${online ? 'corrida-online--ativo' : ''}`}
          onClick={() => (online ? encerrarTurno(motorista.id) : iniciarTurno(motorista.id))}
        >
          {online ? t('motorista.encerrarTurno') : t('motorista.ficarOnline')}
        </button>
      </div>

      {aba === 'chat' ? (
        <div className="corrida-chat">
          <ChatEmpresa
            empresaId={motorista.empresa_id}
            autor="motorista"
            motoristaId={motorista.id}
            telaCheia
          />
        </div>
      ) : aba === 'carro' ? (
        <AgendamentoCarro motoristaId={motorista.id} empresaId={motorista.empresa_id} />
      ) : !proxima ? (
        <p className="corrida-vazia">Nenhuma viagem atribuída no momento.</p>
      ) : (
        <>
          <header className="corrida-topo">
            <div>
              <p className="corrida-kicker">Corrida atual</p>
              <h1 className="corrida-codigo">{proxima.codigo}</h1>
            </div>
            <BadgeStatus status={proxima.status} />
          </header>

          <MapaCorrida
            origemLat={proxima.origem_lat}
            origemLng={proxima.origem_lng}
            destinoLat={proxima.destino_lat}
            destinoLng={proxima.destino_lng}
            motoristaLat={proxima.motorista_lat}
            motoristaLng={proxima.motorista_lng}
            legenda={`${proxima.origem} até ${proxima.destino}`}
          />

          <a
            className="corrida-endereco"
            href={linkMapa(proxima.origem, proxima.origem_lat, proxima.origem_lng)}
            target="_blank"
            rel="noreferrer"
          >
            <span>Embarque</span>
            <strong>{proxima.origem}</strong>
          </a>
          <a
            className="corrida-endereco"
            href={linkMapa(proxima.destino, proxima.destino_lat, proxima.destino_lng)}
            target="_blank"
            rel="noreferrer"
          >
            <span>Destino</span>
            <strong>{proxima.destino}</strong>
          </a>

          {ligar ? (
            <a className="corrida-contato" href={ligar}>
              <span>Contato do passageiro</span>
              <strong>{nomePassageiro}</strong>
              <em>{telefone}</em>
            </a>
          ) : (
            <div className="corrida-contato">
              <span>Contato do passageiro</span>
              <strong>{nomePassageiro}</strong>
            </div>
          )}

          {acao && (
            <button
              type="button"
              className="corrida-acao"
              onClick={() => atualizarStatus(proxima.id, acao.proximo, usuario?.id)}
            >
              {acao.label}
            </button>
          )}
          {proxima.status === 'viagem_em_andamento' && (
            <button
              type="button"
              className="corrida-acao corrida-acao-secundaria"
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
          {erro && <p className="corrida-erro">{erro}</p>}
        </>
      )}

      {mostrarFinalizar && proxima && (
        <ModalFinalizarViagem
          viagem={proxima}
          clienteNome={nomePassageiro}
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
    </section>
  )
}

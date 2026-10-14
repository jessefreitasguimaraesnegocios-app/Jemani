import { useEffect, useMemo, useState } from 'react'
import { AgendamentoCarro } from '@/components/AgendamentoCarro'
import { BadgeStatus } from '@/components/BadgeStatus'
import { ChatEmpresa } from '@/components/ChatEmpresa'
import { linkMapa, MapaCorrida } from '@/components/MapaCorrida'
import { ModalFinalizarViagem } from '@/components/ModalFinalizarViagem'
import { useAuth } from '@/contexts/AuthContext'
import { usarAvisoDoSistema } from '@/hooks/usarAvisoDoSistema'
import { usarIdioma } from '@/i18n/usarIdioma'
import { usarAbaMotorista } from '@/layouts/LayoutMotorista'
import { turnoAberto } from '@/services/turnoEmpresa'
import { MotoristaMenuPainel } from '@/pages/motorista/MotoristaMenuPainel'
import { useDemoStore } from '@/store/demoStore'
import type { StatusViagem } from '@/types'
import './MotoristaDashboardPage.css'

const ACOES: Array<{ statusAtual: StatusViagem; proximo: StatusViagem; label: string }> = [
  { statusAtual: 'motorista_atribuido', proximo: 'motorista_a_caminho', label: 'Estou a caminho' },
  { statusAtual: 'motorista_a_caminho', proximo: 'motorista_chegou', label: 'Cheguei no embarque' },
  { statusAtual: 'motorista_chegou', proximo: 'passageiro_embarcou', label: 'Passageiro embarcou' },
  { statusAtual: 'passageiro_embarcou', proximo: 'viagem_em_andamento', label: 'Iniciar viagem' },
]

const NA_TELA_DO_MOTORISTA: StatusViagem[] = [
  'motorista_atribuido',
  'motorista_a_caminho',
  'motorista_chegou',
  'passageiro_embarcou',
  'viagem_em_andamento',
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
  const { usuario } = useAuth()
  usarAvisoDoSistema(usuario?.id)
  const motorista = useDemoStore((s) => s.obterMotoristaDoUsuario(usuario?.id ?? ''))
  const todasViagens = useDemoStore((s) => s.viagens)
  const turnos = useDemoStore((s) => s.turnos)
  const atualizarPosicaoTurno = useDemoStore((s) => s.atualizarPosicaoTurno)
  const viagens = useMemo(
    () =>
      todasViagens
        .filter(
          (v) =>
            v.motorista_id === motorista?.id &&
            NA_TELA_DO_MOTORISTA.includes(v.status),
        )
        .sort((a, b) =>
          `${a.data_viagem}${a.horario}`.localeCompare(`${b.data_viagem}${b.horario}`),
        ),
    [todasViagens, motorista?.id],
  )
  const perfis = useDemoStore((s) => s.perfis)
  const empresas = useDemoStore((s) => s.empresas)
  const atualizarStatus = useDemoStore((s) => s.atualizarStatus)
  const atualizarPosicaoMotorista = useDemoStore((s) => s.atualizarPosicaoMotorista)
  const solicitarFinalizacao = useDemoStore((s) => s.solicitarFinalizacao)
  const confirmarFinalizacao = useDemoStore((s) => s.confirmarFinalizacao)
  const [mostrarFinalizar, setMostrarFinalizar] = useState(false)
  const [erro, setErro] = useState('')
  const [avisoGps, setAvisoGps] = useState('')
  const { aba } = usarAbaMotorista()
  const { t } = usarIdioma()

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
    if (!seguirCorrida && !online) {
      setAvisoGps('')
      return
    }
    if (!navigator.geolocation) {
      setAvisoGps(t('motorista.gps.indisponivel'))
      return
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setAvisoGps('')
        if (seguirCorrida && viagemId) {
          atualizarPosicaoMotorista(viagemId, pos.coords.latitude, pos.coords.longitude)
        }
        if (online && motoristaId) {
          atualizarPosicaoTurno(motoristaId, pos.coords.latitude, pos.coords.longitude)
        }
      },
      (falha) => {
        setAvisoGps(falha.code === 1 ? t('motorista.gps.negado') : t('motorista.gps.falha'))
      },
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
    t,
  ])

  if (!motorista) {
    return <div className="corrida-tela corrida-vazia">Motorista não vinculado a este usuário.</div>
  }

  const acao = ACOES.find((a) => a.statusAtual === proxima?.status)

  return (
    <section className={`corrida-tela ${aba === 'chat' ? 'corrida-tela--chat' : ''}`}>
      {aba === 'corrida' && avisoGps && <p className="corrida-gps">{avisoGps}</p>}
      {aba === 'perfil' || aba === 'historico' || aba === 'configuracao' ? (
        <MotoristaMenuPainel aba={aba} motorista={motorista} />
      ) : aba === 'chat' ? (
        <div className="corrida-chat">
          <ChatEmpresa
            empresaId={motorista.empresa_id}
            autor="motorista"
            motoristaId={motorista.id}
            telaCheia
            titulo={empresas.find((empresa) => empresa.id === motorista.empresa_id)?.nome_comercial}
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

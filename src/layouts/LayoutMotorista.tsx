import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usarIdioma } from '@/i18n/usarIdioma'
import { turnoAberto } from '@/services/turnoEmpresa'
import { useDemoStore } from '@/store/demoStore'
import './LayoutMotorista.css'

export type AbaMotorista =
  | 'corrida'
  | 'chat'
  | 'carro'
  | 'perfil'
  | 'historico'
  | 'configuracao'

const ContextoAbaMotorista = createContext<{ aba: AbaMotorista }>({ aba: 'corrida' })

export function usarAbaMotorista() {
  return useContext(ContextoAbaMotorista)
}

export function LayoutMotorista() {
  const { t } = usarIdioma()
  const { usuario, sair } = useAuth()
  const navigate = useNavigate()
  const motorista = useDemoStore((s) => s.obterMotoristaDoUsuario(usuario?.id ?? ''))
  const turnos = useDemoStore((s) => s.turnos)
  const iniciarTurno = useDemoStore((s) => s.iniciarTurno)
  const encerrarTurno = useDemoStore((s) => s.encerrarTurno)
  const [aba, setAba] = useState<AbaMotorista>('corrida')
  const [menuAberto, setMenuAberto] = useState(false)
  const caixaRef = useRef<HTMLDivElement>(null)
  const online = motorista ? Boolean(turnoAberto(turnos, motorista.id)) : false

  useEffect(() => {
    if (!menuAberto) return
    function aoClicarFora(evento: MouseEvent) {
      if (!caixaRef.current?.contains(evento.target as Node)) setMenuAberto(false)
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setMenuAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoTeclar)
    }
  }, [menuAberto])

  function escolherAba(proxima: AbaMotorista) {
    setAba(proxima)
    setMenuAberto(false)
  }

  async function aoSair() {
    setMenuAberto(false)
    await sair()
    navigate('/entrar')
  }

  function alternarTurno() {
    if (!motorista) return
    if (online) encerrarTurno(motorista.id)
    else iniciarTurno(motorista.id)
    setMenuAberto(false)
  }

  return (
    <div className="layout-motorista">
      <header className="layout-motorista-topo">
        <p>Jemani</p>
        <div className="layout-motorista-menu" ref={caixaRef}>
          <button
            type="button"
            className="layout-motorista-tracinhos"
            aria-label={t('motorista.menu')}
            aria-expanded={menuAberto}
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            <span />
            <span />
            <span />
          </button>
          {menuAberto && (
            <div className="layout-motorista-lista">
              <button
                type="button"
                className={`layout-motorista-item ${aba === 'corrida' ? 'layout-motorista-item--ativo' : ''}`}
                onClick={() => escolherAba('corrida')}
              >
                {t('motorista.corrida')}
              </button>
              <button
                type="button"
                className={`layout-motorista-item ${aba === 'chat' ? 'layout-motorista-item--ativo' : ''}`}
                onClick={() => escolherAba('chat')}
              >
                {t('motorista.chat')}
              </button>
              <button
                type="button"
                className={`layout-motorista-item ${aba === 'carro' ? 'layout-motorista-item--ativo' : ''}`}
                onClick={() => escolherAba('carro')}
              >
                {t('motorista.carro')}
              </button>
              <button
                type="button"
                className={`layout-motorista-item ${aba === 'perfil' ? 'layout-motorista-item--ativo' : ''}`}
                onClick={() => escolherAba('perfil')}
              >
                {t('motorista.perfil')}
              </button>
              <button
                type="button"
                className={`layout-motorista-item ${aba === 'historico' ? 'layout-motorista-item--ativo' : ''}`}
                onClick={() => escolherAba('historico')}
              >
                {t('motorista.historico')}
              </button>
              <button
                type="button"
                className={`layout-motorista-item ${aba === 'configuracao' ? 'layout-motorista-item--ativo' : ''}`}
                onClick={() => escolherAba('configuracao')}
              >
                {t('motorista.configuracao')}
              </button>
              <button type="button" className="layout-motorista-item" onClick={alternarTurno}>
                {online ? t('motorista.encerrarTurno') : t('motorista.ficarOnline')}
              </button>
              <button type="button" className="layout-motorista-item" onClick={aoSair}>
                {t('comum.sair')}
              </button>
            </div>
          )}
        </div>
      </header>
      <ContextoAbaMotorista.Provider value={{ aba }}>
        <main>
          <Outlet />
        </main>
      </ContextoAbaMotorista.Provider>
    </div>
  )
}

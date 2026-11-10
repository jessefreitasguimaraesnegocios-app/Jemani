import { useEffect, useId, useRef, useState } from 'react'
import {
  atualizarPontoAeroporto,
  criarSelecaoAeroporto,
  descricaoEhPontoFixoDeAeroporto,
  listarTerminais,
  montarAeroportoDeMapa,
  nivelSugerido,
  rotuloNivel,
  selecaoAeroporto,
  type NivelAeroporto,
  type PapelEndereco,
} from '@/services/aeroportos'
import {
  buscarPertoDaLocalizacao,
  buscarSugestoesPlaces,
  googleMapsConfigurado,
  resolverPlaceId,
  validarNumeroNoEndereco,
  type SugestaoPlaces,
} from '@/services/mapasService'
import {
  filtrarRecentes,
  gravarEnderecoRecente,
  type SugestaoEndereco,
} from '@/lib/enderecosRecentes'
import { usarIdioma } from '@/i18n/usarIdioma'
import type { EnderecoLocal } from '@/types'
import {
  aplicarNumeroNoEndereco,
  enderecoEhAeroporto,
  extrairNumeroDoTexto,
  montarTextoEndereco,
  numerosEnderecoIguais,
} from '@/utils/endereco'
import './CampoEndereco.css'

const NUMERO_PREFIXO = /^\s*\d+[\w-]*\s*/

interface Props {
  rotulo: string
  valor?: EnderecoLocal | null
  onChange: (endereco: EnderecoLocal | null) => void
  placeholder?: string
  papel?: PapelEndereco
}

type PosicaoUsuario = { latitude: number; longitude: number }

export function CampoEndereco({ rotulo, valor, onChange, placeholder, papel }: Props) {
  const { t } = usarIdioma()
  const id = useId()
  const idNumero = `${id}-numero`
  const idComplemento = `${id}-complemento`
  const valorRef = useRef(valor)
  const ultimaValidacaoRef = useRef<string>('')
  const [texto, setTexto] = useState(valor?.formatted ?? '')
  const [numero, setNumero] = useState(valor?.numero ?? '')
  const [complemento, setComplemento] = useState(valor?.complemento ?? '')
  const [sugestoes, setSugestoes] = useState<SugestaoEndereco[]>([])
  const [carregando, setCarregando] = useState(false)
  const [validandoNumero, setValidandoNumero] = useState(false)
  const [localizando, setLocalizando] = useState(false)
  const [posicao, setPosicao] = useState<PosicaoUsuario | null>(null)
  const [erro, setErro] = useState('')
  const [listaAberta, setListaAberta] = useState(false)

  valorRef.current = valor

  const ehAeroporto = enderecoEhAeroporto(valor)
  const precisaNumero = Boolean(valor && !ehAeroporto)
  const numeroOk = Boolean(valor?.numero_confirmado && numero.trim())
  const terminais = valor?.codigo_aeroporto ? listarTerminais(valor.codigo_aeroporto) : []
  const nivelAtual = valor?.nivel_aeroporto ?? nivelSugerido(papel)
  const pontoAeroportoOk = Boolean(
    valor?.terminal_id &&
      valor.nivel_aeroporto &&
      Number.isFinite(valor.latitude) &&
      Number.isFinite(valor.longitude),
  )

  useEffect(() => {
    setTexto(valor?.formatted ?? '')
    setNumero(valor?.numero ?? '')
    setComplemento(valor?.complemento ?? '')
  }, [valor?.formatted, valor?.numero, valor?.complemento])

  useEffect(() => {
    if (!listaAberta) return
    if (!texto.trim() || valor?.formatted === texto) {
      const recentes = filtrarRecentes('')
      setSugestoes(recentes)
      return
    }
    const timer = window.setTimeout(() => {
      setCarregando(true)
      const recentes = filtrarRecentes(texto)
      void buscarSugestoesPlaces(texto, posicao ?? undefined)
        .then((remotas) => {
          const ids = new Set(recentes.map((r) => r.place_id))
          const misturadas: SugestaoEndereco[] = [
            ...recentes,
            ...remotas.filter((r) => !ids.has(r.place_id)),
          ]
          setSugestoes(misturadas.slice(0, 12))
        })
        .catch(() => setSugestoes(recentes))
        .finally(() => setCarregando(false))
    }, 220)
    return () => window.clearTimeout(timer)
  }, [texto, valor?.formatted, posicao, listaAberta])

  useEffect(() => {
    if (!valor || ehAeroporto) return
    const num = numero.trim()
    if (!num || !valor.rua?.trim()) return
    if (valor.numero_confirmado && numerosEnderecoIguais(valor.numero, num)) return

    const chave = `${valor.rua}|${num}|${valor.cidade ?? ''}`
    if (ultimaValidacaoRef.current === chave && !valor.numero_confirmado) {
      return
    }

    const timer = window.setTimeout(() => {
      const base = valorRef.current
      if (!base?.rua) return
      setValidandoNumero(true)
      setErro('')
      void validarNumeroNoEndereco(base, num, complemento)
        .then((r) => {
          ultimaValidacaoRef.current = chave
          if (
            valorRef.current?.place_id !== base.place_id &&
            valorRef.current?.rua !== base.rua
          ) {
            return
          }
          if (!r.ok || !r.endereco) {
            onChange(aplicarNumeroNoEndereco(base, num, complemento, false))
            setErro(r.mensagem ?? `O número ${num} não existe neste endereço.`)
            return
          }
          setErro('')
          setTexto(r.endereco.formatted)
          setNumero(r.endereco.numero ?? num)
          onChange(r.endereco)
          gravarEnderecoRecente(r.endereco)
        })
        .finally(() => setValidandoNumero(false))
    }, 550)

    return () => window.clearTimeout(timer)
  }, [numero, complemento, valor?.rua, valor?.place_id, valor?.cidade, valor?.numero_confirmado, ehAeroporto, onChange, valor])

  function aplicarAeroporto(endereco: EnderecoLocal, aviso = '') {
    onChange(endereco)
    setTexto(endereco.formatted)
    setNumero('')
    setSugestoes([])
    setListaAberta(false)
    setErro(aviso)
    gravarEnderecoRecente(endereco)
  }

  async function selecionar(placeId: string, description: string, recente?: EnderecoLocal) {
    setErro('')
    setCarregando(true)
    try {
      if (recente) {
        onChange(recente)
        setTexto(recente.formatted)
        setNumero(recente.numero ?? '')
        setSugestoes([])
        setListaAberta(false)
        gravarEnderecoRecente(recente)
        return
      }

      const jaAeroporto = selecaoAeroporto(placeId, description, papel)
      if (jaAeroporto) {
        aplicarAeroporto(
          jaAeroporto,
          jaAeroporto.terminal_id
            ? ''
            : 'Escolha o terminal e o nível abaixo. O aeroporto não usa um ponto único.',
        )
        return
      }

      const base = await resolverPlaceId(placeId, description)
      const textoAero = `${description} ${base.formatted}`
      const convertido = selecaoAeroporto(placeId, textoAero, papel)
      if (convertido) {
        aplicarAeroporto(
          convertido,
          convertido.terminal_id
            ? ''
            : 'Escolha o terminal e o nível abaixo. O aeroporto não usa um ponto único.',
        )
        return
      }

      if (descricaoEhPontoFixoDeAeroporto(textoAero)) {
        const doMapa = montarAeroportoDeMapa(base, papel, complemento)
        if (doMapa) {
          aplicarAeroporto(doMapa)
          return
        }
      }

      const numeroDetectado =
        base.numero?.trim() ||
        extrairNumeroDoTexto(base.formatted) ||
        extrairNumeroDoTexto(description) ||
        ''

      let endereco: EnderecoLocal = {
        ...base,
        formatted: base.formatted || description,
        rua:
          base.rua ||
          (numeroDetectado
            ? description.replace(NUMERO_PREFIXO, '').split(',')[0]?.trim()
            : base.rua),
        numero: numeroDetectado || undefined,
        numero_confirmado: Boolean(numeroDetectado && base.numero_confirmado !== false),
      }

      if (endereco.rua && endereco.numero) {
        endereco = {
          ...endereco,
          formatted: montarTextoEndereco(endereco),
        }
      }

      if (endereco.numero && !enderecoEhAeroporto(endereco)) {
        if (endereco.source === 'dev_fallback' && endereco.numero) {
          endereco = { ...endereco, numero_confirmado: true }
        } else {
          const check = await validarNumeroNoEndereco(endereco, endereco.numero, complemento)
          if (check.ok && check.endereco) {
            endereco = check.endereco
          } else {
            endereco = { ...endereco, numero_confirmado: false }
            setErro(check.mensagem ?? 'Confirme o número do endereço.')
          }
        }
      }

      onChange(endereco)
      setTexto(endereco.formatted)
      setNumero(endereco.numero ?? '')
      setSugestoes([])
      setListaAberta(false)
      gravarEnderecoRecente(endereco)

      if (!enderecoEhAeroporto(endereco) && !endereco.numero) {
        setErro('Informe o número do endereço abaixo.')
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao obter coordenadas')
      onChange(null)
    } finally {
      setCarregando(false)
    }
  }

  function detectarLocalizacao() {
    if (!navigator.geolocation) {
      setErro('Geolocalização não disponível neste aparelho.')
      return
    }
    setLocalizando(true)
    setErro('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }
        setPosicao(coords)
        setListaAberta(true)
        void buscarPertoDaLocalizacao(coords.latitude, coords.longitude)
          .then((lista) => {
            setSugestoes(
              lista.map((item) => ({
                ...item,
                tipo: item.tipo ?? 'nearby',
              })),
            )
            if (lista[0]) setTexto(lista[0].description)
          })
          .catch(() => setErro('Não foi possível buscar endereços perto de você.'))
          .finally(() => setLocalizando(false))
      },
      () => {
        setLocalizando(false)
        setErro('Permita o acesso à localização para sugerir endereços perto de você.')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 },
    )
  }

  function atualizarNumero(novoNumero: string) {
    setNumero(novoNumero)
    ultimaValidacaoRef.current = ''
    if (!valor) return
    if (!novoNumero.trim() && !enderecoEhAeroporto(valor)) {
      onChange({
        ...valor,
        numero: undefined,
        numero_confirmado: false,
        complemento: complemento.trim() || undefined,
        formatted: montarTextoEndereco({
          ...valor,
          numero: undefined,
          complemento: complemento.trim() || undefined,
        }),
      })
      setErro('Informe o número do endereço (obrigatório).')
      return
    }
    setErro('')
    onChange(aplicarNumeroNoEndereco(valor, novoNumero, complemento, false))
  }

  function escolherTerminal(terminalId: string) {
    if (!valor?.codigo_aeroporto) return
    const nivel = valor.nivel_aeroporto ?? nivelSugerido(papel)
    if (!terminalId) {
      const shell = criarSelecaoAeroporto(valor.codigo_aeroporto, undefined, nivel, complemento)
      const proximo = shell ?? {
        ...valor,
        terminal_id: undefined,
        nivel_aeroporto: nivel,
        latitude: Number.NaN,
        longitude: Number.NaN,
        formatted: valor.formatted.replace(/ · Terminal[^,]*/, ''),
      }
      onChange(proximo)
      setTexto(proximo.formatted)
      setErro('Escolha o terminal e o nível abaixo. O aeroporto não usa um ponto único.')
      return
    }
    const ponto = atualizarPontoAeroporto(valor, terminalId, nivel, complemento)
    setErro('')
    onChange(ponto)
    setTexto(ponto.formatted)
  }

  function escolherNivel(nivel: NivelAeroporto) {
    if (!valor?.codigo_aeroporto) return
    if (!valor.terminal_id) {
      onChange({ ...valor, nivel_aeroporto: nivel })
      return
    }
    const ponto = atualizarPontoAeroporto(valor, valor.terminal_id, nivel, complemento)
    setErro('')
    onChange(ponto)
    setTexto(ponto.formatted)
  }

  function atualizarComplemento(novoComplemento: string) {
    setComplemento(novoComplemento)
    if (!valor) return
    if (valor.codigo_aeroporto && valor.terminal_id && valor.nivel_aeroporto) {
      onChange(atualizarPontoAeroporto(valor, valor.terminal_id, valor.nivel_aeroporto, novoComplemento))
      return
    }
    if (valor.codigo_aeroporto) {
      onChange({ ...valor, complemento: novoComplemento.trim() || undefined })
      return
    }
    onChange(
      aplicarNumeroNoEndereco(
        valor,
        numero || valor.numero || '',
        novoComplemento,
        Boolean(valor.numero_confirmado),
      ),
    )
  }

  function rotuloTipo(tipo?: SugestaoPlaces['tipo']) {
    if (tipo === 'recent') return t('endereco.recentes')
    if (tipo === 'nearby') return t('endereco.perto')
    if (tipo === 'popular') return t('endereco.popular')
    if (tipo === 'poi') return t('endereco.poi')
    if (tipo === 'airport') return t('endereco.aeroporto')
    return t('endereco.sugeridos')
  }

  return (
    <div className="campo-endereco">
      <div className="campo-endereco-topo">
        <label className="rotulo" htmlFor={id}>
          {rotulo}
        </label>
        <button
          type="button"
          className="campo-endereco-gps"
          onClick={detectarLocalizacao}
          disabled={localizando}
        >
          {localizando ? t('endereco.localizando') : t('endereco.usarLocalizacao')}
        </button>
      </div>
      <div className="campo-endereco-busca">
        <input
          id={id}
          className="campo"
          value={texto}
          placeholder={placeholder ?? t('endereco.placeholder')}
          autoComplete="off"
          onFocus={() => {
            setListaAberta(true)
            if (!texto.trim()) setSugestoes(filtrarRecentes(''))
          }}
          onBlur={() => {
            window.setTimeout(() => setListaAberta(false), 180)
          }}
          onChange={(e) => {
            setTexto(e.target.value)
            setListaAberta(true)
            if (valor) onChange(null)
            setNumero('')
            setComplemento('')
            setErro('')
          }}
        />
        {listaAberta && sugestoes.length > 0 && (
          <ul className="campo-endereco-lista" role="listbox">
            {sugestoes.map((s) => (
              <li key={`${s.tipo ?? 'x'}-${s.place_id}`}>
                <button
                  type="button"
                  className="campo-endereco-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void selecionar(s.place_id, s.description, s.endereco)}
                >
                  <span className={`campo-endereco-selo campo-endereco-selo--${s.tipo ?? 'address'}`}>
                    {rotuloTipo(s.tipo)}
                  </span>
                  <span className="campo-endereco-item-texto">{s.description}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {!googleMapsConfigurado() && (
        <p className="campo-endereco-dica">{t('endereco.devDica')}</p>
      )}
      {carregando && <p className="campo-endereco-dica">{t('endereco.buscando')}</p>}
      {erro && <p className="campo-endereco-erro">{erro}</p>}

      {valor && (
        <div className="campo-endereco-detalhe">
          {ehAeroporto && (
            <div className="campo-endereco-aero">
              <div>
                <label className="rotulo" htmlFor={`${id}-terminal`}>
                  {t('endereco.terminal')}
                </label>
                <select
                  id={`${id}-terminal`}
                  className={`campo ${valor.terminal_id ? '' : 'campo-endereco-obrigatorio'}`}
                  value={valor.terminal_id ?? ''}
                  onChange={(e) => escolherTerminal(e.target.value)}
                >
                  <option value="">{t('endereco.selecioneTerminal')}</option>
                  {terminais.map((terminal) => (
                    <option key={terminal.id} value={terminal.id}>
                      {terminal.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="rotulo" htmlFor={`${id}-nivel`}>
                  {t('endereco.nivel')}
                </label>
                <select
                  id={`${id}-nivel`}
                  className="campo"
                  value={nivelAtual}
                  onChange={(e) => escolherNivel(e.target.value as NivelAeroporto)}
                >
                  <option value="embarque">{rotuloNivel('embarque')}</option>
                  <option value="desembarque">{rotuloNivel('desembarque')}</option>
                </select>
              </div>
            </div>
          )}
          {!ehAeroporto && (
            <div className="campo-endereco-grade">
              <div className="campo-endereco-rua">
                <label className="rotulo" htmlFor={`${id}-rua`}>
                  {t('endereco.rua')}
                </label>
                <input
                  id={`${id}-rua`}
                  className="campo"
                  value={valor.rua ?? valor.formatted.split(',')[0] ?? ''}
                  readOnly
                />
              </div>
              <div className="campo-endereco-numero">
                <label className="rotulo" htmlFor={idNumero}>
                  {t('endereco.numero')}
                </label>
                <input
                  id={idNumero}
                  className={`campo ${
                    precisaNumero && (!numero.trim() || !numeroOk) ? 'campo-endereco-obrigatorio' : ''
                  }`}
                  value={numero}
                  inputMode="text"
                  placeholder="Ex.: 842"
                  autoComplete="address-line2"
                  onChange={(e) => atualizarNumero(e.target.value)}
                />
              </div>
            </div>
          )}
          <div>
            <label className="rotulo" htmlFor={idComplemento}>
              {ehAeroporto ? t('endereco.complementoAero') : t('endereco.complemento')}
            </label>
            <input
              id={idComplemento}
              className="campo"
              value={complemento}
              placeholder={ehAeroporto ? 'Ex.: portão 42B' : 'Apto, suite, portaria...'}
              onChange={(e) => atualizarComplemento(e.target.value)}
            />
          </div>
          {validandoNumero && (
            <p className="campo-endereco-dica">{t('endereco.validando')}</p>
          )}
          <p className={pontoAeroportoOk || numeroOk ? 'campo-endereco-ok' : 'campo-endereco-erro'}>
            {ehAeroporto
              ? pontoAeroportoOk
                ? `Ponto confirmado: ${valor.formatted}`
                : 'Escolha o terminal e o nível. O motorista vai a esse meio-fio, não ao centro do aeroporto.'
              : !numero.trim()
                ? 'Falta o número do endereço'
                : validandoNumero
                  ? t('endereco.validando')
                  : numeroOk
                    ? `Endereço confirmado: ${valor.formatted}`
                    : `O número ${numero} não foi confirmado neste endereço`}
          </p>
        </div>
      )}
    </div>
  )
}

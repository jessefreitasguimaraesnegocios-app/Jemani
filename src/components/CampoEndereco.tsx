import { useEffect, useId, useRef, useState } from 'react'
import {
  buscarSugestoesPlaces,
  googleMapsConfigurado,
  resolverPlaceId,
  validarNumeroNoEndereco,
} from '@/services/mapasService'
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
}

export function CampoEndereco({ rotulo, valor, onChange, placeholder }: Props) {
  const id = useId()
  const idNumero = `${id}-numero`
  const idComplemento = `${id}-complemento`
  const valorRef = useRef(valor)
  const ultimaValidacaoRef = useRef<string>('')
  const [texto, setTexto] = useState(valor?.formatted ?? '')
  const [numero, setNumero] = useState(valor?.numero ?? '')
  const [complemento, setComplemento] = useState(valor?.complemento ?? '')
  const [sugestoes, setSugestoes] = useState<Array<{ description: string; place_id: string }>>([])
  const [carregando, setCarregando] = useState(false)
  const [validandoNumero, setValidandoNumero] = useState(false)
  const [erro, setErro] = useState('')

  valorRef.current = valor

  const ehAeroporto = enderecoEhAeroporto(valor)
  const precisaNumero = Boolean(valor && !ehAeroporto)
  const numeroOk = Boolean(valor?.numero_confirmado && numero.trim())

  useEffect(() => {
    setTexto(valor?.formatted ?? '')
    setNumero(valor?.numero ?? '')
    setComplemento(valor?.complemento ?? '')
  }, [valor?.formatted, valor?.numero, valor?.complemento])

  useEffect(() => {
    if (!texto.trim() || valor?.formatted === texto) {
      setSugestoes([])
      return
    }
    const t = window.setTimeout(() => {
      setCarregando(true)
      void buscarSugestoesPlaces(texto)
        .then(setSugestoes)
        .catch(() => setSugestoes([]))
        .finally(() => setCarregando(false))
    }, 280)
    return () => window.clearTimeout(t)
  }, [texto, valor?.formatted])

  useEffect(() => {
    if (!valor || ehAeroporto) return
    const num = numero.trim()
    if (!num || !valor.rua?.trim()) return
    if (valor.numero_confirmado && numerosEnderecoIguais(valor.numero, num)) return

    const chave = `${valor.rua}|${num}|${valor.cidade ?? ''}`
    if (ultimaValidacaoRef.current === chave && !valor.numero_confirmado) {
      // já tentou este número e falhou — não loopa
      return
    }

    const t = window.setTimeout(() => {
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
        })
        .finally(() => setValidandoNumero(false))
    }, 550)

    return () => window.clearTimeout(t)
  }, [numero, complemento, valor?.rua, valor?.place_id, valor?.cidade, valor?.numero_confirmado, ehAeroporto, onChange, valor])

  async function selecionar(placeId: string, description: string) {
    setErro('')
    setCarregando(true)
    try {
      const base = await resolverPlaceId(placeId)
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

      // Se veio da sugestão com número do Google/DEV, confirma; senão exige digitação
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

  function atualizarComplemento(novoComplemento: string) {
    setComplemento(novoComplemento)
    if (!valor) return
    onChange(
      aplicarNumeroNoEndereco(
        valor,
        numero || valor.numero || '',
        novoComplemento,
        Boolean(valor.numero_confirmado),
      ),
    )
  }

  return (
    <div className="campo-endereco">
      <label className="rotulo" htmlFor={id}>
        {rotulo}
      </label>
      <input
        id={id}
        className="campo"
        value={texto}
        placeholder={placeholder ?? 'Ex.: 842 N Brand Blvd, Glendale'}
        autoComplete="off"
        onChange={(e) => {
          setTexto(e.target.value)
          if (valor) onChange(null)
          setNumero('')
          setComplemento('')
          setErro('')
        }}
      />
      {!googleMapsConfigurado() && (
        <p className="campo-endereco-dica">
          Modo DEV: sugestões locais de LA. Configure VITE_MAPBOX_ACCESS_TOKEN no .env para busca real.
        </p>
      )}
      {carregando && <p className="campo-endereco-dica">Buscando...</p>}
      {erro && <p className="campo-endereco-erro">{erro}</p>}
      {sugestoes.length > 0 && (
        <ul className="campo-endereco-lista">
          {sugestoes.map((s) => (
            <li key={s.place_id}>
              <button
                type="button"
                className="campo-endereco-item"
                onClick={() => void selecionar(s.place_id, s.description)}
              >
                {s.description}
              </button>
            </li>
          ))}
        </ul>
      )}

      {valor && (
        <div className="campo-endereco-detalhe">
          {!ehAeroporto && (
            <div className="campo-endereco-grade">
              <div className="campo-endereco-rua">
                <label className="rotulo" htmlFor={`${id}-rua`}>
                  Rua
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
                  Número *
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
              Complemento (opcional)
            </label>
            <input
              id={idComplemento}
              className="campo"
              value={complemento}
              placeholder="Apto, suite, portaria, terminal..."
              onChange={(e) => atualizarComplemento(e.target.value)}
            />
          </div>
          {validandoNumero && (
            <p className="campo-endereco-dica">Validando se o número existe neste endereço...</p>
          )}
          <p
            className={
              ehAeroporto || numeroOk ? 'campo-endereco-ok' : 'campo-endereco-erro'
            }
          >
            {ehAeroporto
              ? `Aeroporto · ${valor.latitude.toFixed(5)}, ${valor.longitude.toFixed(5)}`
              : !numero.trim()
                ? 'Falta o número do endereço'
                : validandoNumero
                  ? 'Validando número...'
                  : numeroOk
                    ? `Endereço confirmado: ${valor.formatted}`
                    : `O número ${numero} não foi confirmado neste endereço`}
          </p>
        </div>
      )}
    </div>
  )
}

import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CampoEndereco } from '@/components/CampoEndereco'
import { useAuth } from '@/contexts/AuthContext'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { usarIdioma } from '@/i18n/usarIdioma'
import { calcularDistanciaKm } from '@/services/mapasService'
import {
  listarHorariosDisponiveis,
  primeiraDataDisponivel,
  validarAntecedenciaMinima,
} from '@/services/reservaValidacao'
import { useDemoStore } from '@/store/demoStore'
import type { EnderecoLocal } from '@/types'
import { enderecoEhAeroporto, enderecoProntoParaReserva } from '@/utils/endereco'
import { SLUG_SHIELD } from '@/data/seed'
import { formatarMoeda } from '@/utils/format'
import './ReservarPage.css'

const SeletorCategoria3D = lazy(() =>
  import('@/components/cliente/SeletorCategoria3D').then((m) => ({
    default: m.SeletorCategoria3D,
  })),
)

const ETAPAS: ChaveTraducao[] = [
  'reserva.etapaTrecho',
  'reserva.etapaQuando',
  'reserva.etapaPassageiros',
  'reserva.etapaCategoria',
  'reserva.etapaDetalhes',
  'reserva.etapaResumo',
]
const MAX_MALAS = 12

const dataInicial = primeiraDataDisponivel()
const horariosIniciais = listarHorariosDisponiveis(dataInicial)

export function ReservarPage() {
  const { t, locale } = usarIdioma()
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const todasCategorias = useDemoStore((s) => s.categorias)
  const categorias = useMemo(
    () =>
      todasCategorias
        .filter((c) => c.ativo)
        .sort((a, b) => {
          if (a.slug === SLUG_SHIELD) return -1
          if (b.slug === SLUG_SHIELD) return 1
          return a.ordem - b.ordem
        }),
    [todasCategorias],
  )
  const calcularPreco = useDemoStore((s) => s.calcularPreco)
  const criarViagem = useDemoStore((s) => s.criarViagem)

  const [etapa, setEtapa] = useState(0)
  const [origemEndereco, setOrigemEndereco] = useState<EnderecoLocal | null>(null)
  const [destinoEndereco, setDestinoEndereco] = useState<EnderecoLocal | null>(null)
  const [dataViagem, setDataViagem] = useState(dataInicial)
  const [horario, setHorario] = useState(horariosIniciais[0] ?? '18:00')
  const [agoraTick, setAgoraTick] = useState(() => Date.now())
  const [passageiros, setPassageiros] = useState(2)
  const [categoriaId, setCategoriaId] = useState(
    categorias.find((c) => c.slug === 'jemani-executive')?.id ?? '',
  )
  const [malas, setMalas] = useState(2)
  const [numeroVoo, setNumeroVoo] = useState('')
  const [terminal, setTerminal] = useState('')
  const [nomePassageiro, setNomePassageiro] = useState(usuario?.nome ?? '')
  const [telefoneContato, setTelefoneContato] = useState(usuario?.telefone ?? '')
  const [observacoes, setObservacoes] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const embarqueAeroporto = enderecoEhAeroporto(origemEndereco)
  const destinoAeroporto = enderecoEhAeroporto(destinoEndereco)

  useEffect(() => {
    if (!categoriaId && categorias[0]) setCategoriaId(categorias[0].id)
  }, [categorias, categoriaId])

  useEffect(() => {
    if (!embarqueAeroporto) {
      setNumeroVoo('')
      setTerminal('')
    }
  }, [embarqueAeroporto])

  useEffect(() => {
    const id = window.setInterval(() => setAgoraTick(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const agora = useMemo(() => new Date(agoraTick), [agoraTick])
  const dataMinima = useMemo(() => primeiraDataDisponivel(agora), [agora])
  const horariosDisponiveis = useMemo(
    () => listarHorariosDisponiveis(dataViagem, agora),
    [dataViagem, agora],
  )

  useEffect(() => {
    if (dataViagem < dataMinima) {
      setDataViagem(dataMinima)
      return
    }
    if (horariosDisponiveis.length === 0) {
      const proxima = primeiraDataDisponivel(agora)
      if (proxima !== dataViagem) setDataViagem(proxima)
      return
    }
    if (!horariosDisponiveis.includes(horario)) {
      setHorario(horariosDisponiveis[0])
    }
  }, [dataViagem, dataMinima, horariosDisponiveis, horario, agora])

  const distanciaKm = useMemo(() => {
    if (!origemEndereco || !destinoEndereco) return undefined
    return calcularDistanciaKm(
      origemEndereco.latitude,
      origemEndereco.longitude,
      destinoEndereco.latitude,
      destinoEndereco.longitude,
    )
  }, [origemEndereco, destinoEndereco])

  const validacaoHorario = useMemo(
    () => validarAntecedenciaMinima(dataViagem, horario, agora),
    [dataViagem, horario, agora],
  )

  const categoria = categorias.find((c) => c.id === categoriaId)

  const preco = useMemo(() => {
    if (!categoriaId || !horario) return null
    try {
      return calcularPreco(categoriaId, horario, distanciaKm)
    } catch {
      return null
    }
  }, [calcularPreco, categoriaId, horario, distanciaKm])

  function montarObservacoes(): string | undefined {
    const partes: string[] = []
    if (telefoneContato.trim()) partes.push(`Contato: ${telefoneContato.trim()}`)
    if (embarqueAeroporto && terminal.trim()) {
      partes.push(`Terminal / portão: ${terminal.trim()}`)
    }
    if (observacoes.trim()) partes.push(observacoes.trim())
    return partes.length ? partes.join('\n') : undefined
  }

  function avancar() {
    setErro('')
    if (etapa === 0) {
      const checkOrigem = enderecoProntoParaReserva(origemEndereco)
      if (!checkOrigem.ok) {
        setErro(`Embarque: ${checkOrigem.mensagem}`)
        return
      }
      const checkDestino = enderecoProntoParaReserva(destinoEndereco)
      if (!checkDestino.ok) {
        setErro(`Destino: ${checkDestino.mensagem}`)
        return
      }
      if (
        origemEndereco!.latitude === destinoEndereco!.latitude &&
        origemEndereco!.longitude === destinoEndereco!.longitude
      ) {
        setErro('Origem e destino precisam ser diferentes.')
        return
      }
    }
    if (etapa === 1) {
      if (!dataViagem || !horario) {
        setErro('Informe data e horário')
        return
      }
      if (horariosDisponiveis.length === 0) {
        setErro('Não há horários com 4h de antecedência nesta data. Escolha outro dia.')
        return
      }
      if (!horariosDisponiveis.includes(horario) || !validacaoHorario.valido) {
        setErro(
          validacaoHorario.mensagem ??
            'Horário inválido. Escolha um dos horários disponíveis (mín. 4h).',
        )
        return
      }
    }
    if (etapa === 2) {
      if (passageiros < 1) {
        setErro('Informe a quantidade de passageiros')
        return
      }
    }
    if (etapa === 3) {
      if (!categoriaId || !categoria) {
        setErro('Escolha uma categoria')
        return
      }
      if (passageiros > categoria.capacidade_max) {
        setErro(
          `${categoria.nome} comporta até ${categoria.capacidade_max} passageiros. Ajuste a quantidade ou escolha outra categoria.`,
        )
        return
      }
      if (passageiros < categoria.capacidade_min) {
        setErro(
          `${categoria.nome} exige no mínimo ${categoria.capacidade_min} passageiros.`,
        )
        return
      }
    }
    if (etapa === 4) {
      if (!nomePassageiro.trim()) {
        setErro('Informe o nome do passageiro principal.')
        return
      }
      if (embarqueAeroporto && !numeroVoo.trim()) {
        setErro('Embarque no aeroporto: informe o número do voo para o motorista acompanhar o pouso.')
        return
      }
      if (malas < 0 || malas > MAX_MALAS) {
        setErro(`Quantidade de malas deve ser entre 0 e ${MAX_MALAS}.`)
        return
      }
    }
    setEtapa((e) => Math.min(e + 1, ETAPAS.length - 1))
  }

  function voltar() {
    setErro('')
    setEtapa((e) => Math.max(e - 1, 0))
  }

  function confirmar(e: FormEvent) {
    e.preventDefault()
    if (!usuario || !preco || !origemEndereco || !destinoEndereco) return
    const check = validarAntecedenciaMinima(dataViagem, horario)
    if (!check.valido || !listarHorariosDisponiveis(dataViagem).includes(horario)) {
      setErro(check.mensagem ?? 'Horário inválido — mínimo de 4 horas de antecedência.')
      return
    }
    if (!nomePassageiro.trim()) {
      setErro('Informe o nome do passageiro principal.')
      return
    }
    setEnviando(true)
    setErro('')
    try {
      const viagem = criarViagem(usuario.id, {
        origemEndereco,
        destinoEndereco,
        data_viagem: dataViagem,
        horario,
        passageiros,
        categoria_id: categoriaId,
        malas,
        numero_voo: embarqueAeroporto && numeroVoo.trim() ? numeroVoo.trim().toUpperCase() : undefined,
        nome_passageiro: nomePassageiro.trim(),
        observacoes: montarObservacoes(),
        distancia_km: distanciaKm,
      })
      navigate(`/app/viagens/${viagem.id}`)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao confirmar')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="animar-entrada mx-auto max-w-2xl">
      <h1 className="fonte-display text-3xl">{t('cliente.reservar.titulo')}</h1>
      <p className="mt-1 text-sm text-[var(--color-slate)]">
        {t('reserva.etapaDe', {
          atual: etapa + 1,
          total: ETAPAS.length,
          nome: t(ETAPAS[etapa]),
        })}
      </p>

      <div className="mt-4 mb-6 flex gap-1">
        {ETAPAS.map((nome, i) => (
          <div
            key={nome}
            className={`h-1.5 flex-1 rounded-full ${i <= etapa ? 'bg-[var(--color-gold)]' : 'bg-[var(--color-sand)]'}`}
          />
        ))}
      </div>

      <form className="cartao space-y-4" onSubmit={confirmar}>
        {etapa === 0 && (
          <>
            <CampoEndereco
              rotulo="Embarque (origem)"
              valor={origemEndereco}
              onChange={setOrigemEndereco}
              placeholder="Ex.: 150 E Olive Ave, Burbank"
            />
            {embarqueAeroporto && (
              <p className="text-xs text-[var(--color-success)]">
                Embarque em aeroporto detectado — pediremos o número do voo nos detalhes.
              </p>
            )}
            <CampoEndereco
              rotulo="Destino"
              valor={destinoEndereco}
              onChange={setDestinoEndereco}
              placeholder="Ex.: 8423 Wilshire Blvd, Beverly Hills"
            />
            {destinoAeroporto && !embarqueAeroporto && (
              <p className="text-xs text-[var(--color-slate)]">
                Destino em aeroporto: chegue com folga para check-in e segurança.
              </p>
            )}
            {distanciaKm != null && (
              <p className="text-sm text-[var(--color-slate)]">
                Distância estimada: {distanciaKm} km
              </p>
            )}
          </>
        )}

        {etapa === 1 && (
          <>
            <div>
              <label className="rotulo" htmlFor="data-viagem">
                Data
              </label>
              <input
                id="data-viagem"
                type="date"
                className="campo"
                value={dataViagem}
                min={dataMinima}
                onChange={(e) => setDataViagem(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="rotulo" htmlFor="horario-viagem">
                Horário (mín. 4h de antecedência · fuso LA)
              </label>
              <select
                id="horario-viagem"
                className="campo"
                value={horariosDisponiveis.includes(horario) ? horario : ''}
                onChange={(e) => setHorario(e.target.value)}
                required
                disabled={horariosDisponiveis.length === 0}
              >
                {horariosDisponiveis.length === 0 ? (
                  <option value="">Sem horários neste dia</option>
                ) : (
                  horariosDisponiveis.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))
                )}
              </select>
              <p className="reserva-horario-dica">
                No mesmo dia, a lista começa só após as 4 horas mínimas. Horários anteriores não
                aparecem.
                {horariosDisponiveis[0]
                  ? ` Primeiro horário disponível: ${horariosDisponiveis[0]}.`
                  : ''}
              </p>
            </div>
            {embarqueAeroporto && (
              <p className="text-xs text-[var(--color-slate)]">
                Para aeroporto, use o horário de pouso previsto — o motorista acompanha atrasos pelo
                voo.
              </p>
            )}
            {!validacaoHorario.valido && horario && (
              <p className="text-sm text-[var(--color-danger)]">{validacaoHorario.mensagem}</p>
            )}
          </>
        )}

        {etapa === 2 && (
          <div>
            <label className="rotulo">Quantidade de passageiros</label>
            <input
              type="number"
              min={1}
              max={20}
              className="campo"
              value={passageiros}
              onChange={(e) => setPassageiros(Number(e.target.value))}
              required
            />
            <p className="mt-1 text-xs text-[var(--color-slate)]">
              Na próxima etapa você escolhe a categoria conforme a capacidade.
            </p>
          </div>
        )}

        {etapa === 3 && (
          <div className="reserva-etapa-categoria">
            <p className="reserva-etapa-categoria-intro">
              {passageiros} passageiro{passageiros === 1 ? '' : 's'} — gire o carro e escolha a
              experiência:
            </p>
            <Suspense
              fallback={<div className="reserva-seletor-carregando">Preparando o showroom…</div>}
            >
              <SeletorCategoria3D
                categorias={categorias}
                categoriaId={categoriaId}
                passageiros={passageiros}
                aoSelecionar={setCategoriaId}
                formatarAdicional={(valor) => formatarMoeda(valor, locale)}
              />
            </Suspense>
          </div>
        )}

        {etapa === 4 && (
          <>
            <div className="rounded-2xl border border-[var(--color-line)] bg-[rgba(184,149,108,0.08)] p-3 text-sm">
              <p className="font-medium text-[var(--color-ink)]">Trecho</p>
              <p className="mt-1 text-[var(--color-slate)]">
                {origemEndereco?.formatted ?? '—'} → {destinoEndereco?.formatted ?? '—'}
              </p>
              {embarqueAeroporto && (
                <p className="mt-2 text-xs text-[var(--color-gold-deep)]">
                  Transfer de aeroporto: número do voo obrigatório para o motorista.
                </p>
              )}
            </div>

            <div>
              <label className="rotulo" htmlFor="nome-passageiro">
                Nome do passageiro principal
              </label>
              <input
                id="nome-passageiro"
                className="campo"
                value={nomePassageiro}
                onChange={(e) => setNomePassageiro(e.target.value)}
                placeholder="Quem o motorista deve procurar"
                required
              />
            </div>

            <div>
              <label className="rotulo" htmlFor="telefone-contato">
                Telefone de contato (opcional)
              </label>
              <input
                id="telefone-contato"
                className="campo"
                type="tel"
                value={telefoneContato}
                onChange={(e) => setTelefoneContato(e.target.value)}
                placeholder="(310) 555-0000"
              />
            </div>

            <div>
              <label className="rotulo" htmlFor="malas">
                Quantidade de malas
              </label>
              <input
                id="malas"
                type="number"
                min={0}
                max={MAX_MALAS}
                className="campo"
                value={malas}
                onChange={(e) => setMalas(Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-[var(--color-slate)]">
                Inclua bagagem de mão e despachada (máx. {MAX_MALAS}).
              </p>
            </div>

            {embarqueAeroporto && (
              <div className="space-y-4 rounded-2xl border border-[var(--color-line)] p-3">
                <p className="text-sm font-medium">Dados do voo (embarque no aeroporto)</p>
                <div>
                  <label className="rotulo" htmlFor="numero-voo">
                    Número do voo
                  </label>
                  <input
                    id="numero-voo"
                    className="campo"
                    value={numeroVoo}
                    onChange={(e) => setNumeroVoo(e.target.value.toUpperCase())}
                    placeholder="Ex.: AA1234, UA892"
                    autoComplete="off"
                    required
                  />
                </div>
                <div>
                  <label className="rotulo" htmlFor="terminal">
                    Terminal / portão (opcional)
                  </label>
                  <input
                    id="terminal"
                    className="campo"
                    value={terminal}
                    onChange={(e) => setTerminal(e.target.value)}
                    placeholder="Ex.: Terminal 4 · Gate 42B"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="rotulo" htmlFor="observacoes">
                Observações (opcional)
              </label>
              <textarea
                id="observacoes"
                className="campo min-h-24"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder={
                  embarqueAeroporto
                    ? 'Ex.: placa com nome, cadeira infantil, atraso previsto...'
                    : 'Ex.: portaria, código do prédio, preferências...'
                }
              />
            </div>
          </>
        )}

        {etapa === 5 && preco && (
          <div className="space-y-3 text-sm">
            <Linha label="Embarque" valor={origemEndereco?.formatted ?? '—'} />
            <Linha label="Destino" valor={destinoEndereco?.formatted ?? '—'} />
            <Linha label="Data" valor={dataViagem.split('-').reverse().join('/')} />
            <Linha label="Horário" valor={horario} />
            <Linha label="Passageiros" valor={String(passageiros)} />
            <Linha label="Malas" valor={String(malas)} />
            <Linha label="Passageiro" valor={nomePassageiro.trim() || '—'} />
            {embarqueAeroporto && numeroVoo.trim() && (
              <Linha label="Voo" valor={numeroVoo.trim().toUpperCase()} />
            )}
            {embarqueAeroporto && terminal.trim() && (
              <Linha label="Terminal" valor={terminal.trim()} />
            )}
            <Linha label="Categoria" valor={categoria?.nome ?? '—'} />
            <Linha label="Distância" valor={`${preco.distancia_km} km`} />
            <hr className="border-[var(--color-line)]" />
            <Linha label="Total" valor={formatarMoeda(preco.total, locale)} destaque />
            <p className="text-xs text-[var(--color-slate)]">
              Após confirmar, a reserva fica aguardando pagamento. Empresas só recebem a corrida
              depois do pagamento aprovado.
            </p>
          </div>
        )}

        {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}

        <div className="flex flex-wrap gap-2 pt-2">
          {etapa > 0 && (
            <button type="button" className="btn-secundario" onClick={voltar}>
              Voltar
            </button>
          )}
          {etapa < ETAPAS.length - 1 ? (
            <button type="button" className="btn-primario" onClick={avancar}>
              Continuar
            </button>
          ) : (
            <button type="submit" className="btn-ouro" disabled={enviando || !preco}>
              {enviando ? 'Confirmando...' : 'Confirmar viagem'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function Linha({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-[var(--color-slate)]">{label}</span>
      <span className={`text-right ${destaque ? 'fonte-display text-2xl' : 'font-medium'}`}>
        {valor}
      </span>
    </div>
  )
}

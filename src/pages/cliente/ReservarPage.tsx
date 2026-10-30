import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { CampoEndereco } from '@/components/CampoEndereco'
import { SeletorCategoria3D } from '@/components/cliente/SeletorCategoria3D'
import { useAuth } from '@/contexts/AuthContext'
import type { ChaveTraducao } from '@/i18n/mensagens'
import { usarIdioma } from '@/i18n/usarIdioma'
import { obterRotaRua, type RotaRua } from '@/services/mapasService'
import {
  hourlyConfigurado,
  listarPacotesMinutos,
  montarJanelaHourly,
  rotuloDuracao,
  type ModalidadeReserva,
} from '@/services/hourlyChauffeur'
import {
  lerAntecedenciaHoras,
  listarHorariosDisponiveis,
  primeiraDataDisponivel,
  validarAntecedenciaMinima,
} from '@/services/reservaValidacao'
import { listarVeiculosNuvem } from '@/services/nuvemVeiculos'
import { useDemoStore } from '@/store/demoStore'
import type { EnderecoLocal } from '@/types'
import { enderecoEhAeroporto, enderecoProntoParaReserva } from '@/utils/endereco'
import { SLUG_SHIELD } from '@/data/seed'
import { categoriasComFrotaDisponivel } from '@/services/frotaCliente'
import { formatarMoeda } from '@/utils/format'
import './ReservarPage.css'

const ETAPAS: ChaveTraducao[] = [
  'reserva.etapaTrecho',
  'reserva.etapaQuando',
  'reserva.etapaCategoria',
  'reserva.etapaDetalhes',
  'reserva.etapaResumo',
]
const MAX_MALAS = 12

export function ReservarPage() {
  const { t, locale } = usarIdioma()
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const todasCategorias = useDemoStore((s) => s.categorias)
  const veiculos = useDemoStore((s) => s.veiculos)
  const empresas = useDemoStore((s) => s.empresas)
  const configuracoes = useDemoStore((s) => s.configuracoes)
  const aplicarVeiculosNuvem = useDemoStore((s) => s.aplicarVeiculosNuvem)
  const categorias = useMemo(
    () =>
      categoriasComFrotaDisponivel(todasCategorias, veiculos, empresas).sort((a, b) => {
        if (a.slug === SLUG_SHIELD) return -1
        if (b.slug === SLUG_SHIELD) return 1
        return a.ordem - b.ordem
      }),
    [todasCategorias, veiculos, empresas],
  )
  const calcularPreco = useDemoStore((s) => s.calcularPreco)
  const calcularPrecoHourlyReserva = useDemoStore((s) => s.calcularPrecoHourlyReserva)
  const criarViagem = useDemoStore((s) => s.criarViagem)
  const regraPreco = useDemoStore((s) => s.regrasPreco.find((r) => r.ativo))
  const antecedenciaHoras = useMemo(
    () => lerAntecedenciaHoras(configuracoes),
    [configuracoes],
  )

  /** Só escolhe modalidade no 1º passo; depois fica travada até voltar. */
  const [modalidadeConfirmada, setModalidadeConfirmada] = useState(false)
  const [modalidade, setModalidade] = useState<ModalidadeReserva>('one_way')
  const [duracaoMinutos, setDuracaoMinutos] = useState(120)
  const [etapa, setEtapa] = useState(0)
  const [origemEndereco, setOrigemEndereco] = useState<EnderecoLocal | null>(null)
  const [destinoEndereco, setDestinoEndereco] = useState<EnderecoLocal | null>(null)
  const ehHourly = modalidade === 'hourly'
  const hourlyOk = hourlyConfigurado(regraPreco)
  const pacotesHourly = regraPreco ? listarPacotesMinutos(regraPreco) : [120]
  const [dataViagem, setDataViagem] = useState(() => primeiraDataDisponivel())
  const [horario, setHorario] = useState('18:00')
  const [agoraTick, setAgoraTick] = useState(() => Date.now())
  const [passageiros, setPassageiros] = useState(2)
  const [categoriaId, setCategoriaId] = useState(
    categorias.find((c) => c.slug === 'jemani-executive')?.id ?? '',
  )
  const [malas, setMalas] = useState(2)
  const [numeroVoo, setNumeroVoo] = useState('')
  const [terminal, setTerminal] = useState('')
  const [naoVouEmbarcar, setNaoVouEmbarcar] = useState(false)
  const [nomePassageiro, setNomePassageiro] = useState(usuario?.nome ?? '')
  const [telefoneContato, setTelefoneContato] = useState(usuario?.telefone ?? '')
  const [observacoes, setObservacoes] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const definirOrigem = useCallback((endereco: EnderecoLocal | null) => {
    setOrigemEndereco(endereco)
    setErro('')
  }, [])
  const definirDestino = useCallback((endereco: EnderecoLocal | null) => {
    setDestinoEndereco(endereco)
    setErro('')
  }, [])

  const embarqueAeroporto = enderecoEhAeroporto(origemEndereco)
  const destinoAeroporto = !ehHourly && enderecoEhAeroporto(destinoEndereco)
  const origemPronta = enderecoProntoParaReserva(origemEndereco).ok
  const destinoPronto = ehHourly ? true : enderecoProntoParaReserva(destinoEndereco).ok

  useEffect(() => {
    if (!ehHourly) return
    if (!pacotesHourly.includes(duracaoMinutos)) {
      setDuracaoMinutos(pacotesHourly[0] ?? 120)
    }
  }, [ehHourly, pacotesHourly, duracaoMinutos])

  useEffect(() => {
    if (!categoriaId && categorias[0]) setCategoriaId(categorias[0].id)
  }, [categorias, categoriaId])

  const trechoComAeroporto = embarqueAeroporto || destinoAeroporto
  const pedirDadosVoo = trechoComAeroporto && !naoVouEmbarcar

  useEffect(() => {
    if (!trechoComAeroporto) {
      setNumeroVoo('')
      setTerminal('')
      setNaoVouEmbarcar(false)
    }
  }, [trechoComAeroporto])

  useEffect(() => {
    if (naoVouEmbarcar) {
      setNumeroVoo('')
      setTerminal('')
    }
  }, [naoVouEmbarcar])

  useEffect(() => {
    const id = window.setInterval(() => setAgoraTick(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let vivo = true
    void listarVeiculosNuvem().then((frota) => {
      if (vivo && frota.length) aplicarVeiculosNuvem(frota)
    })
    return () => {
      vivo = false
    }
  }, [aplicarVeiculosNuvem])

  const agora = useMemo(() => new Date(agoraTick), [agoraTick])
  const dataMinima = useMemo(
    () => primeiraDataDisponivel(agora, undefined, 14, antecedenciaHoras),
    [agora, antecedenciaHoras],
  )
  const horariosDisponiveis = useMemo(
    () => listarHorariosDisponiveis(dataViagem, agora, undefined, 15, antecedenciaHoras),
    [dataViagem, agora, antecedenciaHoras],
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

  const [rota, setRota] = useState<RotaRua | null>(null)

  useEffect(() => {
    if (ehHourly || !origemPronta || !destinoPronto || !origemEndereco || !destinoEndereco) {
      setRota(null)
      return
    }
    let ativo = true
    setRota(null)
    void obterRotaRua(origemEndereco, destinoEndereco).then((resultado) => {
      if (ativo) setRota(resultado)
    })
    return () => {
      ativo = false
    }
  }, [
    ehHourly,
    origemPronta,
    destinoPronto,
    origemEndereco,
    destinoEndereco,
    origemEndereco?.latitude,
    origemEndereco?.longitude,
    destinoEndereco?.latitude,
    destinoEndereco?.longitude,
  ])

  const aguardandoRota = Boolean(!ehHourly && origemPronta && destinoPronto && !rota)

  const validacaoHorario = useMemo(
    () => validarAntecedenciaMinima(dataViagem, horario, agora, undefined, antecedenciaHoras),
    [dataViagem, horario, agora, antecedenciaHoras],
  )

  function escolherModalidade(proxima: ModalidadeReserva) {
    setModalidade(proxima)
    setErro('')
    if (proxima === 'hourly') {
      setDestinoEndereco(null)
      setRota(null)
      setMalas(0)
    }
  }

  function reiniciarEscolhaModalidade() {
    setModalidadeConfirmada(false)
    setEtapa(0)
    setErro('')
    setOrigemEndereco(null)
    setDestinoEndereco(null)
    setRota(null)
    setNumeroVoo('')
    setTerminal('')
    setNaoVouEmbarcar(false)
    setObservacoes('')
  }

  const categoria = categorias.find((c) => c.id === categoriaId)

  const janelaHourly = useMemo(() => {
    if (!ehHourly || !dataViagem || !horario || !duracaoMinutos) return null
    try {
      return montarJanelaHourly(dataViagem, horario, duracaoMinutos)
    } catch {
      return null
    }
  }, [ehHourly, dataViagem, horario, duracaoMinutos])

  const preco = useMemo(() => {
    if (!categoriaId || !horario) return null
    try {
      if (ehHourly) {
        if (!hourlyOk) return null
        return calcularPrecoHourlyReserva(categoriaId, horario, duracaoMinutos)
      }
      if (origemEndereco && destinoEndereco && !rota) return null
      return calcularPreco(categoriaId, horario, rota?.distanciaKm)
    } catch {
      return null
    }
  }, [
    calcularPreco,
    calcularPrecoHourlyReserva,
    categoriaId,
    horario,
    origemEndereco,
    destinoEndereco,
    rota,
    ehHourly,
    hourlyOk,
    duracaoMinutos,
  ])

  function montarObservacoes(): string | undefined {
    const partes: string[] = []
    if (telefoneContato.trim()) partes.push(`Contato: ${telefoneContato.trim()}`)
    if (trechoComAeroporto && naoVouEmbarcar) {
      partes.push('Cliente marcou: não vou embarcar (sem dados de voo).')
    }
    if (pedirDadosVoo && terminal.trim()) {
      partes.push(`Portão: ${terminal.trim()}`)
    }
    if (observacoes.trim()) partes.push(observacoes.trim())
    return partes.length ? partes.join('\n') : undefined
  }

  function avancar() {
    setErro('')
    if (etapa === 0) {
      if (ehHourly && !hourlyOk) {
        setErro(
          'Hourly Chauffeur ainda sem preço por hora. Peça ao admin para configurar em Preços.',
        )
        return
      }
      const checkOrigem = enderecoProntoParaReserva(origemEndereco)
      if (!checkOrigem.ok) {
        setErro(`Embarque: ${checkOrigem.mensagem}`)
        return
      }
      if (!ehHourly) {
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
      } else if (!duracaoMinutos || !pacotesHourly.includes(duracaoMinutos)) {
        setErro('Selecione a duração contratada (mínimo 2 horas).')
        return
      }
    }
    if (etapa === 1) {
      if (!dataViagem || !horario) {
        setErro(ehHourly ? 'Informe data e horário de início' : 'Informe data e horário')
        return
      }
      if (horariosDisponiveis.length === 0) {
        setErro(
          `Não há horários com ${antecedenciaHoras}h de antecedência nesta data. Escolha outro dia.`,
        )
        return
      }
      if (!horariosDisponiveis.includes(horario) || !validacaoHorario.valido) {
        setErro(
          validacaoHorario.mensagem ??
            `Horário inválido. Escolha um dos horários disponíveis (mín. ${antecedenciaHoras}h).`,
        )
        return
      }
      if (pedirDadosVoo && !numeroVoo.trim()) {
        setErro(
          embarqueAeroporto
            ? 'Embarque no aeroporto: informe o número do voo para o motorista acompanhar o pouso.'
            : 'Destino no aeroporto: informe o número do voo para o motorista acompanhar a partida.',
        )
        return
      }
    }
    if (etapa === 2) {
      if (!categoriaId || !categoria) {
        setErro('Escolha uma categoria')
        return
      }
    }
    if (etapa === 3) {
      if (passageiros < 1) {
        setErro('Informe a quantidade de passageiros')
        return
      }
      if (!categoria) {
        setErro('Escolha uma categoria')
        return
      }
      if (passageiros > categoria.capacidade_max) {
        setErro(
          `${categoria.nome} comporta até ${categoria.capacidade_max} passageiros. Ajuste a quantidade ou escolha outra categoria.`,
        )
        return
      }
      if (!nomePassageiro.trim()) {
        setErro('Informe o nome do passageiro principal.')
        return
      }
      if (!ehHourly && (malas < 0 || malas > MAX_MALAS)) {
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
    if (!usuario || !preco || !origemEndereco) return
    if (!ehHourly && (!destinoEndereco || !rota)) return
    if (ehHourly && !hourlyOk) {
      setErro('Hourly Chauffeur sem preço configurado.')
      return
    }
    const check = validarAntecedenciaMinima(
      dataViagem,
      horario,
      new Date(),
      undefined,
      antecedenciaHoras,
    )
    if (!check.valido || !listarHorariosDisponiveis(dataViagem).includes(horario)) {
      setErro(
        check.mensagem ??
          `Horário inválido — mínimo de ${antecedenciaHoras} ${
            antecedenciaHoras === 1 ? 'hora' : 'horas'
          } de antecedência.`,
      )
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
        modalidade,
        origemEndereco,
        destinoEndereco: ehHourly ? null : destinoEndereco,
        data_viagem: dataViagem,
        horario,
        passageiros,
        categoria_id: categoriaId,
        duracao_minutos: ehHourly ? duracaoMinutos : undefined,
        malas: ehHourly ? undefined : malas,
        numero_voo:
          pedirDadosVoo && numeroVoo.trim() ? numeroVoo.trim().toUpperCase() : undefined,
        nome_passageiro: nomePassageiro.trim(),
        observacoes: montarObservacoes(),
        distancia_km: ehHourly ? undefined : rota?.distanciaKm,
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

      {!modalidadeConfirmada ? (
        <div className="reserva-escolha">
          <p className="reserva-escolha-texto">Escolha o tipo de viagem para começar:</p>
          <div className="reserva-modalidade" role="group" aria-label="Modalidade da reserva">
            <button
              type="button"
              className={`reserva-modalidade-btn ${!ehHourly ? 'reserva-modalidade-btn--ativo' : ''}`}
              onClick={() => escolherModalidade('one_way')}
            >
              ONE-WAY RIDE
            </button>
            <button
              type="button"
              className={`reserva-modalidade-btn ${ehHourly ? 'reserva-modalidade-btn--ativo' : ''}`}
              onClick={() => escolherModalidade('hourly')}
              disabled={!hourlyOk}
            >
              HOURLY CHAUFFEUR
            </button>
          </div>
          {!hourlyOk && (
            <p className="reserva-hourly-aviso">
              Hourly Chauffeur ainda sem preço por hora na tabela administrativa. ONE-WAY continua
              disponível.
            </p>
          )}
          <button
            type="button"
            className="btn-primario reserva-escolha-iniciar"
            onClick={() => {
              setModalidadeConfirmada(true)
              setEtapa(0)
              setErro('')
            }}
          >
            Continuar com {ehHourly ? 'Hourly Chauffeur' : 'One-Way Ride'}
          </button>
        </div>
      ) : (
        <>
      <div className="reserva-modalidade-travada">
        <p>
          <span>Tipo de viagem</span>
          <strong>{ehHourly ? 'HOURLY CHAUFFEUR' : 'ONE-WAY RIDE'}</strong>
        </p>
        {etapa === 0 && (
          <button type="button" className="reserva-trocar-modalidade" onClick={reiniciarEscolhaModalidade}>
            Trocar tipo
          </button>
        )}
      </div>

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
              rotulo={ehHourly ? 'Embarque (pickup)' : 'Embarque (origem)'}
              valor={origemEndereco}
              onChange={definirOrigem}
              placeholder="Rua e número em qualquer cidade, ou JFK, LAX, LHR, GRU..."
              papel="origem"
            />
            {ehHourly && (
              <div>
                <label className="rotulo" htmlFor="reserva-duracao">
                  Duração contratada (mín. 2h)
                </label>
                <select
                  id="reserva-duracao"
                  className="campo"
                  value={duracaoMinutos}
                  onChange={(e) => setDuracaoMinutos(Number(e.target.value))}
                >
                  {pacotesHourly.map((m) => (
                    <option key={m} value={m}>
                      {rotuloDuracao(m)}
                    </option>
                  ))}
                </select>
                <p className="reserva-horario-dica">
                  Destino final não é exigido — o motorista fica à disposição pelo período
                  contratado (as directed).
                </p>
              </div>
            )}
            {embarqueAeroporto && (
              <p className="text-xs text-[var(--color-success)]">
                Embarque no aeroporto: o carro busca no nível de desembarque (chegadas) do terminal.
                Os dados do voo entram na próxima etapa.
              </p>
            )}
            {!ehHourly && (
              <CampoEndereco
                rotulo="Destino"
                valor={destinoEndereco}
                onChange={definirDestino}
                placeholder="Rua e número em qualquer cidade, ou JFK, LAX, LHR, GRU..."
                papel="destino"
              />
            )}
            {!ehHourly && destinoAeroporto && !embarqueAeroporto && (
              <p className="text-xs text-[var(--color-slate)]">
                Destino no aeroporto: o desembarque do carro fica no nível de embarque (saídas) do
                terminal escolhido.
              </p>
            )}
            {aguardandoRota && (
              <p className="text-sm text-[var(--color-slate)]">Calculando a rota pelas ruas...</p>
            )}
            {rota?.provedor === 'mapbox' && (
              <p className="text-sm text-[var(--color-slate)]">
                Distância pela rota: {rota.distanciaKm} km · cerca de {rota.tempoMinutos} min
              </p>
            )}
            {rota?.provedor === 'haversine' && (
              <p className="text-sm text-[var(--color-slate)]">
                Rota pelas ruas indisponível. Distância estimada em linha reta: {rota.distanciaKm} km
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
                Horário (mín. {antecedenciaHoras}h de antecedência · fuso LA)
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
                No mesmo dia, a lista começa só após as {antecedenciaHoras}{' '}
                {antecedenciaHoras === 1 ? 'hora mínima' : 'horas mínimas'} definidas pelo admin.
                Horários anteriores não aparecem.
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

            {trechoComAeroporto && (
              <div className="reserva-bloco-voo">
                <p className="reserva-bloco-voo-titulo">
                  {embarqueAeroporto
                    ? 'Dados do voo (embarque no aeroporto)'
                    : 'Dados do voo (destino no aeroporto)'}
                </p>
                <label className="reserva-check-nao-embarcar">
                  <input
                    type="checkbox"
                    checked={naoVouEmbarcar}
                    onChange={(e) => setNaoVouEmbarcar(e.target.checked)}
                  />
                  <span>Não vou embarcar</span>
                </label>
                {!naoVouEmbarcar && (
                  <>
                    <p className="reserva-bloco-voo-dica">
                      Obrigatório. O motorista acompanha a previsão de{' '}
                      {embarqueAeroporto ? 'pouso' : 'decolagem'} pelo número do voo.
                    </p>
                    <div>
                      <label className="rotulo" htmlFor="numero-voo">
                        Número do voo *
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
                        Portão (opcional)
                      </label>
                      <input
                        id="terminal"
                        className="campo"
                        value={terminal}
                        onChange={(e) => setTerminal(e.target.value)}
                        placeholder="Ex.: 42B"
                      />
                    </div>
                    <div>
                      <label className="rotulo" htmlFor="observacoes-voo">
                        Observações (opcional)
                      </label>
                      <textarea
                        id="observacoes-voo"
                        className="campo min-h-24"
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Ex.: placa com nome, cadeira infantil, atraso previsto..."
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {etapa === 2 && (
          <div className="reserva-etapa-categoria">
            <SeletorCategoria3D
              categorias={categorias}
              categoriaId={categoriaId}
              passageiros={passageiros}
              veiculos={veiculos}
              empresas={empresas}
              aoSelecionar={setCategoriaId}
              formatarAdicional={(valor) => formatarMoeda(valor, locale)}
            />
          </div>
        )}

        {etapa === 3 && (
          <>
            <div className="rounded-2xl border border-[var(--color-line)] bg-[rgba(184,149,108,0.08)] p-3 text-sm">
              <p className="font-medium text-[var(--color-ink)]">
                {ehHourly ? 'HOURLY CHAUFFEUR' : 'ONE-WAY RIDE'}
              </p>
              <p className="mt-1 text-[var(--color-slate)]">
                {ehHourly
                  ? `${origemEndereco?.formatted ?? '—'} · ${rotuloDuracao(duracaoMinutos)}`
                  : `${origemEndereco?.formatted ?? '—'} → ${destinoEndereco?.formatted ?? '—'}`}
              </p>
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
              <label className="rotulo" htmlFor="passageiros">
                Quantidade de passageiros
              </label>
              <input
                id="passageiros"
                type="number"
                min={1}
                max={20}
                className="campo"
                value={passageiros}
                onChange={(e) => setPassageiros(Number(e.target.value))}
                required
              />
            </div>

            {!ehHourly && (
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
            )}

            {!trechoComAeroporto && (
              <div>
                <label className="rotulo" htmlFor="observacoes">
                  Observações (opcional)
                </label>
                <textarea
                  id="observacoes"
                  className="campo min-h-24"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex.: portaria, código do prédio, preferências..."
                />
              </div>
            )}
          </>
        )}

        {etapa === 4 && preco && (
          <div className="space-y-3 text-sm">
            <Linha
              label="Modalidade"
              valor={ehHourly ? 'HOURLY CHAUFFEUR' : 'ONE-WAY RIDE'}
            />
            <Linha label="Embarque" valor={origemEndereco?.formatted ?? '—'} />
            {!ehHourly && <Linha label="Destino" valor={destinoEndereco?.formatted ?? '—'} />}
            <Linha label="Data" valor={dataViagem.split('-').reverse().join('/')} />
            <Linha label={ehHourly ? 'Início' : 'Horário'} valor={horario} />
            {ehHourly && (
              <>
                <Linha label="Duração" valor={rotuloDuracao(duracaoMinutos)} />
                <Linha
                  label="Término previsto"
                  valor={
                    janelaHourly
                      ? janelaHourly.fim.toLocaleTimeString(locale, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'
                  }
                />
                <Linha
                  label="Franquia de milhas"
                  valor={`${'franquia_milhas' in preco ? preco.franquia_milhas : 0} mi incluídas`}
                />
              </>
            )}
            <Linha label="Passageiros" valor={String(passageiros)} />
            {!ehHourly && <Linha label="Malas" valor={String(malas)} />}
            <Linha label="Passageiro" valor={nomePassageiro.trim() || '—'} />
            {trechoComAeroporto && naoVouEmbarcar && (
              <Linha label="Voo" valor="Não vou embarcar" />
            )}
            {pedirDadosVoo && numeroVoo.trim() && (
              <Linha label="Voo" valor={numeroVoo.trim().toUpperCase()} />
            )}
            {pedirDadosVoo && terminal.trim() && (
              <Linha label="Portão" valor={terminal.trim()} />
            )}
            <Linha label="Categoria" valor={categoria?.nome ?? '—'} />
            {!ehHourly && (
              <Linha
                label="Distância"
                valor={
                  rota?.provedor === 'mapbox'
                    ? `${preco.distancia_km} km · ${rota.tempoMinutos} min`
                    : `${preco.distancia_km} km`
                }
              />
            )}
            <hr className="border-[var(--color-line)]" />
            <Linha label="Total" valor={formatarMoeda(preco.total, locale)} destaque />
            {ehHourly && regraPreco && (
              <div className="reserva-hourly-regras text-xs text-[var(--color-slate)]">
                <p>
                  <strong>Extensão:</strong>{' '}
                  {regraPreco.regra_extensao ??
                    '+30 min / +1h / +2h com disponibilidade e pagamento confirmado.'}
                </p>
                <p>
                  <strong>Cancelamento:</strong>{' '}
                  {regraPreco.regra_cancelamento ?? 'Conforme política da plataforma.'}
                </p>
                <p>
                  <strong>Cobranças extras:</strong>{' '}
                  {regraPreco.cobrancas_adicionais ??
                    'Pedágios, estacionamento e milhas acima da franquia.'}
                </p>
              </div>
            )}
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
        </>
      )}
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

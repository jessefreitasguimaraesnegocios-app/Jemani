type ConfigLike = { chave: string; valor: string }

let contexto: AudioContext | null = null
let preparado = false

function ler(configs: ConfigLike[], chave: string, padrao = 'true') {
  return configs.find((c) => c.chave === chave)?.valor ?? padrao
}

function obterContexto() {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!contexto || contexto.state === 'closed') contexto = new Ctx()
  return contexto
}

export function prepararFeedback() {
  if (preparado || typeof window === 'undefined') return
  preparado = true
  const liberar = () => {
    const ctx = obterContexto()
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  }
  window.addEventListener('pointerdown', liberar, { passive: true })
  window.addEventListener('touchstart', liberar, { passive: true })
  window.addEventListener('keydown', liberar)
}

function tocarSom() {
  const ctx = obterContexto()
  if (!ctx) return
  const iniciar = () => {
    const agora = ctx.currentTime
    ;[523.25, 784].forEach((frequencia, indice) => {
      const osc = ctx.createOscillator()
      const ganho = ctx.createGain()
      const inicio = agora + indice * 0.16
      osc.type = 'sine'
      osc.frequency.value = frequencia
      ganho.gain.setValueAtTime(0.0001, inicio)
      ganho.gain.exponentialRampToValueAtTime(0.09, inicio + 0.03)
      ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.22)
      osc.connect(ganho)
      ganho.connect(ctx.destination)
      osc.start(inicio)
      osc.stop(inicio + 0.24)
    })
  }
  if (ctx.state === 'suspended') void ctx.resume().then(iniciar)
  else iniciar()
}

function tocarSomAbrirCarta() {
  const ctx = obterContexto()
  if (!ctx) return
  const iniciar = () => {
    const agora = ctx.currentTime
    const amostras = Math.floor(ctx.sampleRate * 0.12)
    const buffer = ctx.createBuffer(1, amostras, ctx.sampleRate)
    const canal = buffer.getChannelData(0)
    for (let i = 0; i < amostras; i++) {
      canal[i] = (Math.random() * 2 - 1) * (1 - i / amostras)
    }
    const ruido = ctx.createBufferSource()
    ruido.buffer = buffer
    const filtro = ctx.createBiquadFilter()
    filtro.type = 'bandpass'
    filtro.frequency.value = 1800
    filtro.Q.value = 0.85
    const ganhoRuido = ctx.createGain()
    ganhoRuido.gain.setValueAtTime(0.0001, agora)
    ganhoRuido.gain.exponentialRampToValueAtTime(0.07, agora + 0.018)
    ganhoRuido.gain.exponentialRampToValueAtTime(0.0001, agora + 0.13)
    ruido.connect(filtro)
    filtro.connect(ganhoRuido)
    ganhoRuido.connect(ctx.destination)
    ruido.start(agora)
    ruido.stop(agora + 0.14)

    const osc = ctx.createOscillator()
    const ganho = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(880, agora + 0.04)
    osc.frequency.exponentialRampToValueAtTime(640, agora + 0.26)
    ganho.gain.setValueAtTime(0.0001, agora + 0.04)
    ganho.gain.exponentialRampToValueAtTime(0.055, agora + 0.07)
    ganho.gain.exponentialRampToValueAtTime(0.0001, agora + 0.3)
    osc.connect(ganho)
    ganho.connect(ctx.destination)
    osc.start(agora + 0.04)
    osc.stop(agora + 0.32)
  }
  if (ctx.state === 'suspended') void ctx.resume().then(iniciar)
  else iniciar()
}

export function dispararFeedbackAbrirCarta(configs: ConfigLike[]) {
  if (typeof window === 'undefined') return
  if (ler(configs, 'som_notificacao') !== 'true') return
  prepararFeedback()
  try {
    tocarSomAbrirCarta()
  } catch {
    /* o aparelho bloqueou o áudio */
  }
}

function padraoVibracao(tipo: string) {
  if (tipo === 'mensagem') return [90, 50, 90]
  if (tipo === 'atribuicao' || tipo === 'nova_solicitacao' || tipo === 'status' || tipo === 'pagamento') {
    return [180, 80, 180]
  }
  return [140]
}

export function dispararFeedbackAlerta(configs: ConfigLike[], tipo = '') {
  if (typeof window === 'undefined') return
  prepararFeedback()

  if (ler(configs, 'som_notificacao') === 'true') {
    try {
      tocarSom()
    } catch {
      /* o aparelho bloqueou o áudio */
    }
  }

  if (ler(configs, 'vibracao') === 'true' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(padraoVibracao(tipo))
  }
}

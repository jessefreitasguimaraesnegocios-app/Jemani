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

type ConfigLike = { chave: string; valor: string }

function ler(configs: ConfigLike[], chave: string, padrao = 'true') {
  return configs.find((c) => c.chave === chave)?.valor ?? padrao
}

export function dispararFeedbackAlerta(configs: ConfigLike[]) {
  if (typeof window === 'undefined') return

  if (ler(configs, 'som_notificacao') === 'true') {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) {
        const ctx = new Ctx()
        const osc = ctx.createOscillator()
        const ganho = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = 880
        ganho.gain.value = 0.05
        osc.connect(ganho)
        ganho.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.12)
        void ctx.close()
      }
    } catch {
      /* ignore */
    }
  }

  if (ler(configs, 'vibracao') === 'true' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(40)
  }
}

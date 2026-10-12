import { useEffect } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { useAuth } from '@/contexts/AuthContext'
import {
  assinarNuvem,
  entrarNuvem,
  gravarOfertasNuvem,
  gravarViagemNuvem,
  listarOfertasNuvem,
  listarViagensNuvem,
} from '@/services/nuvemCorrida'
import { useDemoStore } from '@/store/demoStore'

export function SincronizarNuvem() {
  const { usuario } = useAuth()
  const aplicarViagemNuvem = useDemoStore((s) => s.aplicarViagemNuvem)
  const aplicarOfertaNuvem = useDemoStore((s) => s.aplicarOfertaNuvem)

  useEffect(() => {
    if (!usuario) return
    let ativo = true
    let canal: RealtimeChannel | null = null

    void (async () => {
      const senha = useDemoStore.getState().senhas[usuario.email]
      const entrou = await entrarNuvem(usuario.email, senha ?? '')
      if (!entrou || !ativo) return
      if (usuario.tipo === 'cliente') {
        const estado = useDemoStore.getState()
        const minhas = estado.viagens.filter((v) => v.cliente_id === usuario.id)
        for (const viagem of minhas) await gravarViagemNuvem(viagem)
        await gravarOfertasNuvem(estado.atribuicoes.filter((a) => minhas.some((v) => v.id === a.viagem_id)))
      }
      const viagens = await listarViagensNuvem()
      const ofertas = await listarOfertasNuvem()
      if (!ativo) return
      for (const viagem of viagens) aplicarViagemNuvem(viagem, true)
      for (const oferta of ofertas) aplicarOfertaNuvem(oferta, true)
      canal = assinarNuvem(
        (viagem) => aplicarViagemNuvem(viagem, false),
        (oferta) => aplicarOfertaNuvem(oferta, false),
      )
    })()

    return () => {
      ativo = false
      void canal?.unsubscribe()
    }
  }, [usuario?.id, usuario?.email, aplicarViagemNuvem, aplicarOfertaNuvem])

  return null
}

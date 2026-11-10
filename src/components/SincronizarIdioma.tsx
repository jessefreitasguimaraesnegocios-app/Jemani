import { useEffect, type ReactNode } from 'react'
import { usarTemaConta } from '@/hooks/usarPreferenciasConta'
import { usarIdioma } from '@/i18n/usarIdioma'

function aplicarTema(valor?: string) {
  const tema = valor === 'escuro' || valor === 'claro' || valor === 'sistema' ? valor : 'escuro'
  let resolvido = tema
  if (tema === 'sistema') {
    resolvido = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
  }
  document.documentElement.dataset.tema = resolvido
}

export function SincronizarIdioma({ children }: { children: ReactNode }) {
  usarIdioma()
  const { tema } = usarTemaConta()

  useEffect(() => {
    aplicarTema(tema)
    if (tema !== 'sistema') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const aoMudar = () => aplicarTema('sistema')
    media.addEventListener('change', aoMudar)
    return () => media.removeEventListener('change', aoMudar)
  }, [tema])

  return children
}

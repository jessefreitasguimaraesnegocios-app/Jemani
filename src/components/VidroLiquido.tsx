import type { HTMLAttributes, ReactNode } from 'react'

type VarianteVidro = 'claro' | 'regular' | 'gelado' | 'fumado' | 'ouro' | 'tinta'

type PropsVidroLiquido = {
  variante?: VarianteVidro
  interativo?: boolean
  pilula?: boolean
  comPlaca?: boolean
  className?: string
  children?: ReactNode
} & HTMLAttributes<HTMLDivElement>

const CLASSES_VARIANTE: Record<VarianteVidro, string> = {
  claro: 'vidro--claro',
  regular: 'vidro--regular',
  gelado: 'vidro--gelado',
  fumado: 'vidro--fumado',
  ouro: 'vidro--ouro',
  tinta: 'vidro--tinta',
}

export function VidroLiquido({
  variante = 'regular',
  interativo = false,
  pilula = false,
  comPlaca = false,
  className = '',
  children,
  ...restante
}: PropsVidroLiquido) {
  const classes = [
    'vidro',
    CLASSES_VARIANTE[variante],
    pilula ? 'vidro--pilula' : '',
    interativo ? 'vidro--interativo' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...restante}>
      {comPlaca ? <div className="vidro-placa">{children}</div> : children}
    </div>
  )
}

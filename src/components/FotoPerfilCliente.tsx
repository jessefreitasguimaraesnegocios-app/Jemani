import './FotoPerfilCliente.css'

type TamanhoFoto = 'perfil' | 'corrida' | 'motorista'

type Props = {
  url?: string | null
  nome: string
  tamanho?: TamanhoFoto
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
}

export function FotoPerfilCliente({ url, nome, tamanho = 'corrida' }: Props) {
  const classe = `foto-perfil foto-perfil--${tamanho}`
  if (url) {
    return <img className={classe} src={url} alt={nome} loading="lazy" decoding="async" />
  }
  return (
    <span className={`${classe} foto-perfil--vazio`} aria-hidden="true">
      {iniciais(nome)}
    </span>
  )
}

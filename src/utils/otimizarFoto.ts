export const TAMANHO_MAX_ARQUIVO_BYTES = 5 * 1024 * 1024
export const TAMANHO_MAX_OTIMIZADO_BYTES = 380 * 1024
const LADO_MAX = 640

export type FotoOtimizada = {
  blob: Blob
  tipo: 'image/webp' | 'image/jpeg'
  extensao: 'webp' | 'jpg'
  dataUrl: string
}

function lerArquivoComoImagem(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo)
    const imagem = new Image()
    imagem.onload = () => {
      URL.revokeObjectURL(url)
      resolve(imagem)
    }
    imagem.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a imagem.'))
    }
    imagem.src = url
  })
}

function canvasParaBlob(
  canvas: HTMLCanvasElement,
  tipo: string,
  qualidade: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Falha ao compactar a foto.'))
        else resolve(blob)
      },
      tipo,
      qualidade,
    )
  })
}

function blobParaDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(String(leitor.result))
    leitor.onerror = () => reject(new Error('Falha ao ler a foto otimizada.'))
    leitor.readAsDataURL(blob)
  })
}

async function otimizarFoto(
  arquivo: File,
  ladoMax: number,
  tamanhoMaxOtimizado: number,
): Promise<FotoOtimizada> {
  if (!arquivo.type.startsWith('image/')) {
    throw new Error('Envie um arquivo de imagem (JPG, PNG ou WebP).')
  }
  if (arquivo.size > TAMANHO_MAX_ARQUIVO_BYTES) {
    throw new Error('A foto pode ter no máximo 5 MB antes do envio.')
  }

  const imagem = await lerArquivoComoImagem(arquivo)
  const maiorLado = Math.max(imagem.naturalWidth, imagem.naturalHeight)
  const escala = maiorLado > ladoMax ? ladoMax / maiorLado : 1
  const largura = Math.max(1, Math.round(imagem.naturalWidth * escala))
  const altura = Math.max(1, Math.round(imagem.naturalHeight * escala))

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não foi possível preparar a foto.')
  ctx.drawImage(imagem, 0, 0, largura, altura)

  const tentativas: Array<{ tipo: 'image/webp' | 'image/jpeg'; qualidade: number }> = [
    { tipo: 'image/webp', qualidade: 0.82 },
    { tipo: 'image/webp', qualidade: 0.72 },
    { tipo: 'image/jpeg', qualidade: 0.78 },
    { tipo: 'image/jpeg', qualidade: 0.65 },
  ]

  let melhor: Blob | null = null
  let tipoUsado: 'image/webp' | 'image/jpeg' = 'image/jpeg'

  for (const tentativa of tentativas) {
    try {
      const blob = await canvasParaBlob(canvas, tentativa.tipo, tentativa.qualidade)
      melhor = blob
      tipoUsado = tentativa.tipo
      if (blob.size <= tamanhoMaxOtimizado) break
    } catch {
      // WebP pode falhar em alguns navegadores; segue para JPEG.
    }
  }

  if (!melhor) throw new Error('Não foi possível otimizar a foto.')
  if (melhor.size > tamanhoMaxOtimizado) {
    throw new Error('A foto ficou grande demais depois da otimização. Escolha outra imagem.')
  }

  return {
    blob: melhor,
    tipo: tipoUsado,
    extensao: tipoUsado === 'image/webp' ? 'webp' : 'jpg',
    dataUrl: await blobParaDataUrl(melhor),
  }
}

/** Redimensiona e compacta a foto para WebP (ou JPEG) sem pesar no Storage. */
export async function otimizarFotoPerfil(arquivo: File): Promise<FotoOtimizada> {
  return otimizarFoto(arquivo, LADO_MAX, TAMANHO_MAX_OTIMIZADO_BYTES)
}

/** Foto de veículo no catálogo (maior que avatar). */
export async function otimizarFotoVeiculo(arquivo: File): Promise<FotoOtimizada> {
  return otimizarFoto(arquivo, 1280, 900 * 1024)
}

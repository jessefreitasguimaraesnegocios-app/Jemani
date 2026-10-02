export type EstiloCarro = {
  corCarroceria: string
  luzAmbiente: string
  luzPonto: string
  escala: number
  alongamento: [number, number, number]
}

export function obterEstiloCarro(slug: string): EstiloCarro {
  switch (slug) {
    case 'jemani-executive':
      return {
        corCarroceria: '#2c3348',
        luzAmbiente: '#2a3040',
        luzPonto: '#e8d4b0',
        escala: 1.05,
        alongamento: [1, 1, 1],
      }
    case 'jemani-black':
      return {
        corCarroceria: '#0a0a0c',
        luzAmbiente: '#1a1820',
        luzPonto: '#c4a574',
        escala: 1.05,
        alongamento: [1, 1, 1],
      }
    case 'jemani-suv':
      return {
        corCarroceria: '#1f2a24',
        luzAmbiente: '#1a2820',
        luzPonto: '#a8c4a0',
        escala: 1.08,
        alongamento: [0.95, 1.22, 1.08],
      }
    case 'jemani-luxe':
      return {
        corCarroceria: '#3a2f28',
        luzAmbiente: '#2a2218',
        luzPonto: '#f0e0c0',
        escala: 1.1,
        alongamento: [1.05, 1, 1],
      }
    case 'jemani-limo':
      return {
        corCarroceria: '#111318',
        luzAmbiente: '#1a1520',
        luzPonto: '#c9a878',
        escala: 0.95,
        alongamento: [1.45, 0.95, 1],
      }
    case 'jemani-van':
      return {
        corCarroceria: '#243040',
        luzAmbiente: '#1c2838',
        luzPonto: '#9eb4c8',
        escala: 1.05,
        alongamento: [1.15, 1.35, 1.15],
      }
    case 'jemani-shield':
      return {
        corCarroceria: '#0c1222',
        luzAmbiente: '#1a140c',
        luzPonto: '#e8c878',
        escala: 1.12,
        alongamento: [1, 1.18, 1.1],
      }
    default:
      return {
        corCarroceria: '#1a1f2e',
        luzAmbiente: '#2a2438',
        luzPonto: '#e8d4b0',
        escala: 1.05,
        alongamento: [1, 1, 1],
      }
  }
}

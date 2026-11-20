function digitoModulo11(soma: number) {
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

export function documentoFiscalValido(valor: string) {
  const documento = valor.trim().toUpperCase()
  if (/^(?:\d{9}|\d{2}-\d{7})$/.test(documento)) {
    return !/^0{9}$/.test(documento.replace('-', ''))
  }

  const compacto = documento.replace(/[./-]/g, '')
  if (/^(\d)\1+$/.test(compacto)) return false

  if (/^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(documento)) {
    return [9, 10].every((posicao) => {
      const soma = [...compacto.slice(0, posicao)].reduce(
        (total, digito, indice) => total + Number(digito) * (posicao + 1 - indice),
        0,
      )
      return digitoModulo11(soma) === Number(compacto[posicao])
    })
  }

  if (!/^(?:[A-Z0-9]{12}\d{2}|[A-Z0-9]{2}\.[A-Z0-9]{3}\.[A-Z0-9]{3}\/[A-Z0-9]{4}-\d{2})$/.test(documento)) {
    return false
  }
  return [12, 13].every((posicao) => {
    const soma = [...compacto.slice(0, posicao)].reduce(
      (total, caractere, indice) =>
        total + (caractere.charCodeAt(0) - 48) * (2 + ((posicao - 1 - indice) % 8)),
      0,
    )
    return digitoModulo11(soma) === Number(compacto[posicao])
  })
}

export function formatarTelefoneEua(valor: string) {
  const numero = /^(?:\+?1[ .-]?)?(?:\(([2-9]\d{2})\)|([2-9]\d{2}))[ .-]?([2-9]\d{2})[ .-]?(\d{4})$/.exec(valor.trim())
  return numero ? `+1 (${numero[1] ?? numero[2]}) ${numero[3]}-${numero[4]}` : null
}

export function emailCadastroValido(valor: string) {
  return /^[a-z\d!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z\d!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(valor.trim())
}

const dominiosSugeridos = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com']

export function sugerirEmails(valor: string) {
  const [usuario, dominio, excedente] = valor.trim().split('@')
  if (!usuario || dominio == null || excedente != null) return []

  return dominiosSugeridos
    .filter((opcao) => opcao !== dominio.toLowerCase() && opcao.startsWith(dominio.toLowerCase()))
    .map((opcao) => `${usuario}@${opcao}`)
    .filter(emailCadastroValido)
}

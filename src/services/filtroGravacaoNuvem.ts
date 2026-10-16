export function historicoPodeIrParaNuvem(
  item: { viagem_id: string; usuario_id?: string | null },
  usuarioId: string,
  viagensExistentes: ReadonlySet<string>,
) {
  if (!viagensExistentes.has(item.viagem_id)) return false
  if (item.usuario_id && item.usuario_id !== usuarioId) return false
  return true
}

export function ofertasComEmpresaCadastrada<T extends { empresa_id: string }>(
  ofertas: T[],
  empresasCadastradas: ReadonlySet<string>,
) {
  return ofertas.filter((oferta) => empresasCadastradas.has(oferta.empresa_id))
}

export function ofertaLocalPodeSubir(
  local: { viagem_id: string; empresa_id: string; status: string },
  nuvem: readonly { viagem_id: string; empresa_id: string; status: string }[],
) {
  const remota = nuvem.find(
    (item) => item.viagem_id === local.viagem_id && item.empresa_id === local.empresa_id,
  )
  if (!remota || remota.status === local.status) return !remota
  return remota.status === 'oferecida'
}

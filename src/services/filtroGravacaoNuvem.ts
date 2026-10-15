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

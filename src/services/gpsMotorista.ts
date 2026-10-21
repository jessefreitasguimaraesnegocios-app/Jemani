/** Limiar local (~15 m) — mapa e status por GPS. */
export const LIMIAR_LOCAL_GRAUS = 0.00015
/** Limiar na nuvem em corrida (~50 m). */
export const LIMIAR_NUVEM_CORRIDA_GRAUS = 0.00045
/** Limiar na nuvem com turno ocioso (~100 m). */
export const LIMIAR_NUVEM_TURNO_OCIOSO_GRAUS = 0.0009

/** Mínimo entre envios à nuvem durante corrida. */
export const INTERVALO_NUVEM_CORRIDA_MS = 20_000
/** Heartbeat em corrida mesmo com pouco deslocamento. */
export const HEARTBEAT_NUVEM_CORRIDA_MS = 45_000
/** Mínimo entre envios de turno sem corrida ativa. */
export const INTERVALO_NUVEM_TURNO_OCIOSO_MS = 90_000

const STATUS_GPS_CORRIDA = new Set([
  'motorista_a_caminho',
  'motorista_chegou',
  'passageiro_embarcou',
  'viagem_em_andamento',
])

type UltimoEnvio = { em: number; latitude: number; longitude: number }

const enviosViagem = new Map<string, UltimoEnvio>()
const enviosTurno = new Map<string, UltimoEnvio>()

export function posicaoMudouBastante(
  latA: number,
  lngA: number,
  latB: number,
  lngB: number,
  limiarGraus: number,
) {
  return Math.abs(latA - latB) >= limiarGraus || Math.abs(lngA - lngB) >= limiarGraus
}

export function statusExigeGpsCorrida(status: string) {
  return STATUS_GPS_CORRIDA.has(status)
}

function avaliarEnvio(
  ultimo: UltimoEnvio | undefined,
  latitude: number,
  longitude: number,
  agora: number,
  intervaloMinMs: number,
  limiarGraus: number,
  heartbeatMs?: number,
) {
  if (!ultimo) return true
  const elapsed = agora - ultimo.em
  if (elapsed < intervaloMinMs) return false
  if (posicaoMudouBastante(ultimo.latitude, ultimo.longitude, latitude, longitude, limiarGraus)) {
    return true
  }
  if (heartbeatMs != null && elapsed >= heartbeatMs) return true
  return false
}

export function deveGravarPosicaoViagemNuvem(
  viagemId: string,
  latitude: number,
  longitude: number,
  agora = Date.now(),
) {
  return avaliarEnvio(
    enviosViagem.get(viagemId),
    latitude,
    longitude,
    agora,
    INTERVALO_NUVEM_CORRIDA_MS,
    LIMIAR_NUVEM_CORRIDA_GRAUS,
    HEARTBEAT_NUVEM_CORRIDA_MS,
  )
}

export function registrarEnvioPosicaoViagem(
  viagemId: string,
  latitude: number,
  longitude: number,
  agora = Date.now(),
) {
  enviosViagem.set(viagemId, { em: agora, latitude, longitude })
}

export function deveGravarPosicaoTurnoNuvem(
  motoristaId: string,
  latitude: number,
  longitude: number,
  emCorrida: boolean,
  agora = Date.now(),
) {
  if (emCorrida) {
    return avaliarEnvio(
      enviosTurno.get(motoristaId),
      latitude,
      longitude,
      agora,
      INTERVALO_NUVEM_CORRIDA_MS,
      LIMIAR_NUVEM_CORRIDA_GRAUS,
      HEARTBEAT_NUVEM_CORRIDA_MS,
    )
  }
  return avaliarEnvio(
    enviosTurno.get(motoristaId),
    latitude,
    longitude,
    agora,
    INTERVALO_NUVEM_TURNO_OCIOSO_MS,
    LIMIAR_NUVEM_TURNO_OCIOSO_GRAUS,
  )
}

export function registrarEnvioPosicaoTurno(
  motoristaId: string,
  latitude: number,
  longitude: number,
  agora = Date.now(),
) {
  enviosTurno.set(motoristaId, { em: agora, latitude, longitude })
}

/** Só para testes. */
export function limparControleGpsMotorista() {
  enviosViagem.clear()
  enviosTurno.clear()
}

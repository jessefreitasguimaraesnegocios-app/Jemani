import { useState } from 'react'
import { CampoEndereco } from '@/components/CampoEndereco'
import { BotaoSalvar } from '@/components/BotaoSalvar'
import {
  liberadasDaViagem,
  lerParadasPorBloco,
  lerRaioParadasKm,
  paradasOrdenadas,
  slotsParadaRestantes,
  validarParadaNoRaio,
} from '@/services/paradasHourly'
import { useDemoStore } from '@/store/demoStore'
import type { EnderecoLocal, Viagem } from '@/types'
import { enderecoProntoParaReserva } from '@/utils/endereco'
import './ParadasHourlyCliente.css'

type Props = {
  viagem: Viagem
}

export function ParadasHourlyCliente({ viagem }: Props) {
  const configuracoes = useDemoStore((s) => s.configuracoes)
  const empresas = useDemoStore((s) => s.empresas)
  const adicionarParadaHourly = useDemoStore((s) => s.adicionarParadaHourly)
  const [endereco, setEndereco] = useState<EnderecoLocal | null>(null)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')

  const lista = paradasOrdenadas(viagem)
  const liberadas = liberadasDaViagem(viagem, configuracoes)
  const porBloco = lerParadasPorBloco(configuracoes)
  const restantes = slotsParadaRestantes(viagem, configuracoes)
  const atualId = lista.find((p) => p.status === 'pendente')?.id
  const empresa = empresas.find((e) => e.id === viagem.empresa_id)
  const raioKm = lerRaioParadasKm(configuracoes)
  const ativa = ['viagem_em_andamento', 'passageiro_embarcou', 'motorista_chegou', 'motorista_a_caminho', 'motorista_atribuido', 'empresa_confirmada'].includes(
    viagem.status,
  )
  const paga = viagem.payment_status === 'paid'

  if (!ativa || !paga) return null

  function adicionar() {
    setErro('')
    setMsg('')
    const check = enderecoProntoParaReserva(endereco)
    if (!check.ok || !endereco) {
      setErro(check.mensagem ?? 'Selecione o próximo endereço.')
      throw new Error('endereco')
    }
    const noRaio = validarParadaNoRaio({ viagem, empresa, endereco, raioKm })
    if (!noRaio.ok) {
      setErro(noRaio.mensagem)
      throw new Error('raio')
    }
    try {
      adicionarParadaHourly(viagem.id, endereco)
      setEndereco(null)
      setMsg('Endereço enviado ao motorista.')
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível adicionar.')
      throw err
    }
  }

  return (
    <section className="paradas-hourly">
      <div className="paradas-hourly-cabeca">
        <h2 className="fonte-display text-2xl">Roteiro do chauffeur</h2>
        <p>
          Envie até {liberadas} endereços neste bloco. O motorista vê a lista em ordem — o atual em
          destaque e os já atendidos ficam suaves.
        </p>
      </div>

      {lista.length > 0 && (
        <ol className="paradas-hourly-lista">
          {lista.map((parada, idx) => (
            <li
              key={parada.id}
              className={[
                'paradas-hourly-item',
                parada.status === 'chegou' ? 'paradas-hourly-item--feito' : '',
                parada.id === atualId ? 'paradas-hourly-item--atual' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span>
                {parada.status === 'chegou' ? '✓' : parada.id === atualId ? '→' : idx + 1}
              </span>
              <p>{parada.endereco}</p>
            </li>
          ))}
        </ol>
      )}

      {restantes > 0 ? (
        <div className="paradas-hourly-form">
          <CampoEndereco
            rotulo={`Próximo endereço (${lista.length + 1}/${liberadas})`}
            valor={endereco}
            onChange={setEndereco}
            placeholder="Para onde o chauffeur deve ir agora?"
          />
          <BotaoSalvar className="btn-primario" aoSalvar={adicionar} rotuloOk="Enviado">
            Enviar ao motorista
          </BotaoSalvar>
          <p className="paradas-hourly-dica">
            Ainda {restantes} {restantes === 1 ? 'vaga' : 'vagas'} neste bloco · raio {raioKm} km
          </p>
        </div>
      ) : (
        <div className="paradas-hourly-limite">
          <p>
            Você usou os {liberadas} endereços deste bloco. Quer continuar o roteiro? Adicione mais
            horas em HOURLY CHAUFFEUR acima — após o pagamento, liberamos +{porBloco} endereços.
          </p>
        </div>
      )}

      {erro && <p className="paradas-hourly-erro">{erro}</p>}
      {msg && <p className="paradas-hourly-ok">{msg}</p>}
    </section>
  )
}

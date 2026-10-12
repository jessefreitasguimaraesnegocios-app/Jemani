import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Center, useGLTF } from '@react-three/drei'
import { Box3, Color, Vector3, type Group, type Mesh, type MeshStandardMaterial, type Object3D } from 'three'
import { obterEstiloCarro } from './paletaCarro'

type Props = {
  slug: string
  girando?: boolean
}

const PRETO = '#07080c'

function ehCarroceria(nome: string) {
  const n = nome.toLowerCase()
  return n.startsWith('paint') || n === 'teal' || n === 'cream' || n === 'orange'
}

function clonarCena(cena: Object3D) {
  const clone = cena.clone(true)
  clone.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh || !mesh.material) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    if (Array.isArray(mesh.material)) mesh.material = mesh.material.map((m) => m.clone())
    else mesh.material = mesh.material.clone()
  })
  return clone
}

function pintarDePreto(raiz: Object3D) {
  const cor = new Color(PRETO)
  raiz.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    const materiais = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of materiais) {
      if (!mat || !('color' in mat)) continue
      const std = mat as MeshStandardMaterial
      if (!ehCarroceria(std.name || '')) continue
      std.color.copy(cor)
      std.metalness = 0.82
      std.roughness = 0.22
      const verniz = std as MeshStandardMaterial & { clearcoat?: number; clearcoatRoughness?: number }
      if (typeof verniz.clearcoat === 'number') {
        verniz.clearcoat = 1
        verniz.clearcoatRoughness = 0.08
      }
      std.needsUpdate = true
    }
  })
}

function ModeloGlb({ arquivo, slug }: { arquivo: string; slug: string }) {
  const giroRef = useRef<Group>(null)
  const escalaRef = useRef<Group>(null)
  const { scene } = useGLTF(arquivo)
  const modelo = useMemo(() => {
    const clone = clonarCena(scene)
    pintarDePreto(clone)
    return clone
  }, [scene])

  useLayoutEffect(() => {
    const grupo = escalaRef.current
    if (!grupo) return
    grupo.scale.setScalar(1)
    grupo.updateWorldMatrix(true, true)
    const caixa = new Box3().setFromObject(grupo)
    const tamanho = caixa.getSize(new Vector3())
    const maior = Math.max(tamanho.x, tamanho.y, tamanho.z, 0.001)
    grupo.scale.setScalar(2.85 / maior)
  }, [modelo, slug])

  useFrame((_, delta) => {
    if (!giroRef.current) return
    giroRef.current.rotation.y += delta * 0.35
  })

  return (
    <group ref={giroRef}>
      <group ref={escalaRef} rotation={[0, Math.PI * 0.22, 0]}>
        <Center precise>
          <primitive object={modelo} />
        </Center>
      </group>
    </group>
  )
}

export function ModeloCarro3D({ slug }: Props) {
  const estilo = obterEstiloCarro(slug)
  return <ModeloGlb key={estilo.arquivo + slug} arquivo={estilo.arquivo} slug={slug} />
}

for (const arquivo of [
  '/modelos/carros/classe-s.glb',
  '/modelos/carros/lucid.glb',
  '/modelos/carros/volvo.glb',
  '/modelos/carros/escalade.glb',
  '/modelos/carros/expedition.glb',
  '/modelos/carros/sprinter.glb',
  '/modelos/carros/shuttle.glb',
  '/modelos/carros/charter.glb',
]) {
  useGLTF.preload(arquivo)
}

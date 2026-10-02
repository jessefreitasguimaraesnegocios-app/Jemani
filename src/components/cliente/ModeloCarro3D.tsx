import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Center, useGLTF } from '@react-three/drei'
import {
  Color,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
} from 'three'
import { obterEstiloCarro } from './paletaCarro'

const CAMINHO_MODELO = '/modelos/carros/ferrari.glb'

type Props = {
  slug: string
  girando?: boolean
}

function ehMaterialCarroceria(nome: string) {
  const n = nome.toLowerCase()
  return (
    n === 'body_color' ||
    n.includes('body') ||
    n.includes('paint') ||
    n.includes('carpaint') ||
    n.includes('carroceria')
  )
}

function clonarCena(cena: Object3D) {
  const clone = cena.clone(true)
  clone.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => m.clone())
    } else if (mesh.material) {
      mesh.material = mesh.material.clone()
    }
  })
  return clone
}

function aplicarTinta(raiz: Object3D, corHex: string) {
  const cor = new Color(corHex)
  const candidatos: MeshStandardMaterial[] = []

  raiz.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    const materiais = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of materiais) {
      if (!mat || !('color' in mat)) continue
      const std = mat as MeshStandardMaterial
      if (ehMaterialCarroceria(std.name || mesh.name || '')) {
        candidatos.push(std)
      }
    }
  })

  const alvo =
    candidatos.length > 0
      ? candidatos
      : (() => {
          const todos: MeshStandardMaterial[] = []
          raiz.traverse((obj) => {
            const mesh = obj as Mesh
            if (!mesh.isMesh) return
            const materiais = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            for (const mat of materiais) {
              if (!mat || !('metalness' in mat)) continue
              const std = mat as MeshStandardMaterial
              if ((std.metalness ?? 0) >= 0.2 && (std.roughness ?? 1) <= 0.7) {
                todos.push(std)
              }
            }
          })
          return todos.slice(0, 2)
        })()

  for (const mat of alvo) {
    mat.color.copy(cor)
    mat.metalness = Math.max(mat.metalness ?? 0.6, 0.55)
    mat.roughness = Math.min(mat.roughness ?? 0.35, 0.4)
    mat.needsUpdate = true
  }
}

export function ModeloCarro3D({ slug, girando = true }: Props) {
  const grupoRef = useRef<Group>(null)
  const { scene } = useGLTF(CAMINHO_MODELO)
  const estilo = useMemo(() => obterEstiloCarro(slug), [slug])

  const modelo = useMemo(() => {
    const clone = clonarCena(scene)
    aplicarTinta(clone, estilo.corCarroceria)
    return clone
  }, [scene, estilo.corCarroceria])

  useLayoutEffect(() => {
    aplicarTinta(modelo, estilo.corCarroceria)
  }, [modelo, estilo.corCarroceria])

  useFrame((_, delta) => {
    if (!grupoRef.current || !girando) return
    grupoRef.current.rotation.y += delta * 0.45
  })

  return (
    <group ref={grupoRef} key={slug}>
      <Center cacheKey={slug} precise>
        <group
          scale={[
            estilo.escala * estilo.alongamento[0],
            estilo.escala * estilo.alongamento[1],
            estilo.escala * estilo.alongamento[2],
          ]}
          rotation={[0, Math.PI * 0.18, 0]}
        >
          <primitive object={modelo} />
        </group>
      </Center>
    </group>
  )
}

useGLTF.preload(CAMINHO_MODELO)

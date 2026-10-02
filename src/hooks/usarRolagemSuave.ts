import { useEffect, type RefObject } from 'react'
import Lenis from 'lenis'

export function usarRolagemSuave(
  wrapperRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const wrapper = wrapperRef.current
    const content = contentRef.current
    if (!wrapper || !content) return

    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.05,
      smoothWheel: true,
      touchMultiplier: 1.35,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })

    let animacaoId = 0
    function quadro(tempo: number) {
      lenis.raf(tempo)
      animacaoId = requestAnimationFrame(quadro)
    }
    animacaoId = requestAnimationFrame(quadro)

    return () => {
      cancelAnimationFrame(animacaoId)
      lenis.destroy()
    }
  }, [wrapperRef, contentRef])
}

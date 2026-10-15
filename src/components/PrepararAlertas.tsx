import { useEffect } from 'react'
import { prepararFeedback } from '@/utils/feedbackAlerta'

export function PrepararAlertas() {
  useEffect(() => {
    prepararFeedback()
  }, [])
  return null
}

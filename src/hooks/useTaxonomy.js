import { useEffect, useState } from 'react'
import { watchTaxonomy } from '../services/taxonomyService.js'

export function useTaxonomy(type) {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubscribe = watchTaxonomy(type, setItems, (err) => setError(err.message))
    return unsubscribe
  }, [type])

  return { items, error, setError }
}

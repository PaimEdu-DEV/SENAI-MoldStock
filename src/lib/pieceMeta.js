export function idsToNames(ids = [], options = []) {
  if (options.length > 0 && ids.length === options.length) return ['Todos']
  return ids.map((id) => options.find((item) => item.id === id)?.name).filter(Boolean)
}

export function formatDimensions(dimensions = {}) {
  if (!dimensions.altura && !dimensions.largura && !dimensions.comprimento) {
    return ''
  }
  return `${dimensions.altura || '-'} x ${dimensions.largura || '-'} x ${dimensions.comprimento || '-'}`
}

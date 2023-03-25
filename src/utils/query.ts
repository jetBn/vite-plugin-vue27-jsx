// import qs from 'querystring'

export interface VueQuery {
  vue?: boolean
  src?: boolean
  type?: 'script' | 'template' | 'style' | 'custom'
  index?: number
  lang?: string
  raw?: boolean
  from?: string,
  scoped?: boolean
}

export function parseVueRequest(id: string) {
  const [filename, rawQuery] = id.split('?', 2)
  const query = Object.fromEntries(new URLSearchParams(rawQuery)) as VueQuery
  if (query.vue != null) {
    query.vue = true
  }
  if (query.index != null) {
    query.index = Number(query.index)
  }
  if (query.raw != null) {
    query.raw = true
  }
  if (query.scoped != null) {
    query.scoped = true
  }
  return {
    filename,
    query
  }
}

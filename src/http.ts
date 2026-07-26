// Kleiner fetch-Wrapper mit Timeout. Die WebView macht die echten
// Netz-Requests; ein einzelner haengender Request soll die App nicht
// blockieren (vgl. platform-glasses: Calls mit Timeout absichern).

export async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

export type AIAPIFormat = 'openai' | 'gemini' | 'anthropic'
export type AIAuthType = 'bearer' | 'api-key' | 'none'

/** Inference URLs are public configuration. Credentials belong only in headers. */
export function endpointIssue(value: string, apiKey = ''): string | null {
  const endpoint = value.trim()
  if (!endpoint) return 'Add the full API endpoint URL.'
  if (endpoint.length > 2_000 || /[\r\n\s]/.test(endpoint)) return 'Enter a valid API endpoint URL.'
  if (apiKey.trim() && (endpoint.includes(apiKey.trim()) || endpoint.includes(encodeURIComponent(apiKey.trim())))) {
    return 'Keep your API key in the key field, outside the endpoint URL.'
  }
  if (/\b(?:sk-[\w-]{8,}|AIza[\w-]{12,})/.test(endpoint)) {
    return 'Keep credentials outside the endpoint URL.'
  }
  if (/[{}]/.test(endpoint.replaceAll('{model}', 'model'))) return 'Only {model} is supported as an endpoint placeholder.'
  let url: URL
  try { url = new URL(endpoint.replaceAll('{model}', 'model')) } catch { return 'Enter a valid API endpoint URL.' }
  if (endpoint.includes('{model}')) {
    const placeholderUrl = new URL(endpoint.replaceAll('{model}', 'poiem-model-slot'))
    if (!placeholderUrl.pathname.includes('poiem-model-slot') || placeholderUrl.hostname.includes('poiem-model-slot')) {
      return 'Use {model} only in the endpoint path.'
    }
  }
  if (url.username || url.password || url.hash || /#/.test(endpoint)) {
    return 'Use an endpoint URL without credentials or a fragment.'
  }
  const query = [...url.searchParams.entries()]
  if ((query.length > 0 && (query.length !== 1 || query[0][0] !== 'api-version' || !/^\d{4}-\d{2}-\d{2}(?:-preview)?$/.test(query[0][1]))) || (endpoint.includes('?') && query.length === 0)) {
    return 'Only an Azure api-version date is allowed in the endpoint query. Keep API keys in headers.'
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]'
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    return 'Use HTTPS, or HTTP for a service on localhost.'
  }
  return null
}

/** A credential header cannot replace browser-controlled or protocol headers. */
export function authHeaderIssue(value: string): string | null {
  const header = value.trim()
  if (/^(?:sk-|AIza|gsk_|hf_|xox[baprs]-)/i.test(header)) {
    return 'Enter the header name only. Keep its value in the API key field.'
  }
  if (!header || header.length > 100 || !/^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/.test(header)) {
    return 'Enter a valid API key header name, such as X-API-Key.'
  }
  if (/^(?:accept|content-type|host|origin|referer|cookie|set-cookie|content-length|connection|user-agent|anthropic-version|anthropic-dangerous-direct-browser-access)$|^(?:sec-|proxy-)/i.test(header)) {
    return 'Use the header your provider expects for API keys.'
  }
  return null
}

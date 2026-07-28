
export default function safeUrl(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const parsed = new URL(url) 
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null
  } catch {
    return null
  }
}

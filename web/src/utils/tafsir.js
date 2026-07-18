export function parseTafsir(tafsirLong) {
  const dateMatch = tafsirLong.match(/^(\d{4})-\d{2}-\d{2}\s*/)
  if (!dateMatch) return { year: null, body: tafsirLong }
  return {
    year: dateMatch[1],
    body: tafsirLong.slice(dateMatch[0].length),
  }
}

const META_MARKER = /الملف\s+مدقق.*$/s
const SENTENCE_END = /(?<=[.؟!])\s+/u

export function splitTafsirParagraphs(text, maxLen = 350) {
  if (!text || !text.trim()) return []

  const cleaned = text.replace(META_MARKER, '').trim()
  if (!cleaned) return []

  const sentences = cleaned.split(SENTENCE_END).filter(s => s.trim())

  const paragraphs = []
  let current = ''
  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence
    if (current && candidate.length >= maxLen) {
      paragraphs.push(current)
      current = sentence
    } else {
      current = candidate
    }
  }
  if (current) paragraphs.push(current)

  return paragraphs
}

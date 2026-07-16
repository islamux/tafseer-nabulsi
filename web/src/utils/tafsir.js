export function parseTafsir(tafsirLong) {
  const dateMatch = tafsirLong.match(/^(\d{4})-\d{2}-\d{2}\s*/)
  if (!dateMatch) return { year: null, body: tafsirLong }
  return {
    year: dateMatch[1],
    body: tafsirLong.slice(dateMatch[0].length),
  }
}

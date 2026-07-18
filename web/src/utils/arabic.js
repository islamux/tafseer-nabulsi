export const toArabicNum = (n) =>
  String(n).replace(/[0-9]/g, d => '\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669'[d])

const WAQF_MARKS_SRC = '\u06d6-\u06dc\u06de'
const WAQF_MARKS = new RegExp(`[${WAQF_MARKS_SRC}]`)
const WAQF_SPLIT = new RegExp(`[\\s]*([${WAQF_MARKS_SRC}])[\\s]*`)

export function splitAyahSegments(text) {
  if (!text) return [text]
  return text.split(WAQF_SPLIT).reduce((acc, part, i) => {
    if (WAQF_MARKS.test(part)) {
      if (acc.length) acc[acc.length - 1] += part
    } else if (part !== '') {
      acc.push(part)
    }
    return acc
  }, [])
}

const TASHKEEL = /[\u064b-\u065f\u0670\u06d6-\u06dc\u06df-\u06e8]/
const ALEF_VARIANTS = /[\u0622\u0623\u0625\u0671]/g
const BASMALA = 'بسم الله الرحمن الرحيم'

export function stripLeadingBasmala(text) {
  if (!text) return text

  let bi = 0
  let i = 0
  while (i < text.length && bi < BASMALA.length) {
    const ch = text[i]
    if (TASHKEEL.test(ch)) { i++; continue }
    const norm = ch.replace(ALEF_VARIANTS, 'ا')
    if (norm === BASMALA[bi]) { bi++; i++ }
    else break
  }

  if (bi === BASMALA.length) {
    while (i < text.length && TASHKEEL.test(text[i])) i++
    return text.slice(i).replace(/^[\s\u0640]+/, '')
  }
  return text
}

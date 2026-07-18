import { toArabicNum } from '../utils/arabic'
import { splitTafsirParagraphs } from '../utils/tafsir'

export default function TafsirText({ body }) {
  const paragraphs = splitTafsirParagraphs(body)
  if (paragraphs.length === 0) return null

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {paragraphs.map((para, i) => (
        <p
          key={`p${i}`}
          className="arabic-text text-tafsir text-lg leading-[2.1] text-justify"
        >
          {toArabicNum(para)}
        </p>
      ))}
    </div>
  )
}

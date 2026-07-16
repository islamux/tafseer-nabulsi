import { Link } from 'react-router-dom'
import StateMessage from './StateMessage'

export default function NotFound() {
  return (
    <StateMessage
      emoji="📭"
      title="الصفحة غير موجودة"
    >
      الصفحة التي تبحث عنها غير متاحة
      <Link
        to="/"
        className="mt-6 px-4 py-2 rounded-lg text-sm font-medium no-underline arabic-text badge-accent"
      >
        العودة للرئيسية
      </Link>
    </StateMessage>
  )
}

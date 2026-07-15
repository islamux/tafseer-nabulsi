import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <p className="text-6xl mb-4">📭</p>
      <h2 className="text-xl font-bold mb-2 arabic-text" style={{ color: 'var(--text-primary)' }}>
        الصفحة غير موجودة
      </h2>
      <p className="text-sm mb-6 arabic-text" style={{ color: 'var(--text-secondary)' }}>
        الصفحة التي تبحث عنها غير متاحة
      </p>
      <Link
        to="/"
        className="px-4 py-2 rounded-lg text-sm font-medium no-underline arabic-text"
        style={{ backgroundColor: 'var(--accent)', color: 'var(--text-on-accent)' }}
      >
        العودة للرئيسية
      </Link>
    </div>
  )
}

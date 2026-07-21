export default function Spinner({ className = '', label = 'جارٍ التحميل' }) {
  return (
    <div
      className={`flex items-center justify-center py-20 ${className}`}
      role="status"
      aria-live="polite"
    >
      <div
        className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"
        aria-hidden="true"
      ></div>
      <span className="sr-only">{label}</span>
    </div>
  )
}

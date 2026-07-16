export default function StateMessage({ emoji, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      {emoji && <p className="text-6xl mb-4">{emoji}</p>}
      {title && (
        <h2 className="text-xl font-bold mb-2 arabic-text text-primary">{title}</h2>
      )}
      {children && (
        <p className="text-sm mb-6 arabic-text text-secondary">{children}</p>
      )}
      {action}
    </div>
  )
}

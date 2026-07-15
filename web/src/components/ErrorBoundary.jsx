import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <p className="text-6xl mb-4">⚠️</p>
          <h2 className="text-xl font-bold mb-2 arabic-text" style={{ color: 'var(--text-primary)' }}>
            حدث خطأ
          </h2>
          <p className="text-sm mb-6 arabic-text" style={{ color: 'var(--text-secondary)' }}>
            {this.state.error?.message || 'خطأ غير متوقع'}
          </p>
          <Link
            to="/"
            className="px-4 py-2 rounded-lg text-sm font-medium no-underline arabic-text"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-on-accent)' }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            العودة للرئيسية
          </Link>
        </div>
      )
    }
    return this.props.children
  }
}

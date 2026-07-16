import { Component } from 'react'
import { Link } from 'react-router-dom'
import StateMessage from './StateMessage'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <StateMessage
          emoji="⚠️"
          title="حدث خطأ"
        >
          {this.state.error?.message || 'خطأ غير متوقع'}
          <Link
            to="/"
            className="mt-6 px-4 py-2 rounded-lg text-sm font-medium no-underline arabic-text badge-accent"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            العودة للرئيسية
          </Link>
        </StateMessage>
      )
    }
    return this.props.children
  }
}

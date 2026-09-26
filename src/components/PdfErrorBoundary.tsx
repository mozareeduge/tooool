import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  resetKey: string | null
  onError: (message: string) => void
}

interface State {
  error: Error | null
}

export class PdfErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PDF viewer error', error, info)
    this.props.onError(error.message || 'Could not load or render this PDF.')
  }

  componentDidUpdate(previousProps: Props) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="mx-auto grid min-h-[50vh] w-full max-w-xl place-items-center p-6">
        <div className="w-full rounded-3xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <h2 className="font-bold text-slate-900">Could not open this PDF</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Choose another PDF from the sidebar. The current file may be encrypted, malformed, or unsupported by PDF.js.
          </p>
        </div>
      </div>
    )
  }
}

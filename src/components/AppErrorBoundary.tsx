import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled application error', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-6 text-slate-900">
        <section className="w-full max-w-lg rounded-3xl border border-red-200 bg-white p-6 shadow-xl">
          <h1 className="text-lg font-bold">The app hit an unexpected error</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Your source files were not uploaded anywhere. Reload the page and try the same file again.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-red-50 p-3 text-xs text-red-800">
            {this.state.error.message || 'Unknown error'}
          </pre>
          <button
            type="button"
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            onClick={() => window.location.reload()}
          >
            Reload app
          </button>
        </section>
      </main>
    )
  }
}

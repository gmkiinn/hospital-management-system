import { useRouteError } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from './ui'

export function ErrorPage() {
  const error = useRouteError()
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred.'

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold text-slate-800">
          Something went wrong
        </h1>
        <p className="mt-1 text-sm text-slate-500">{message}</p>
        <Button className="mt-5" onClick={() => (window.location.href = '/')}>
          Back to home
        </Button>
      </div>
    </div>
  )
}

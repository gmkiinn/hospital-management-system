import { Link } from 'react-router-dom'
import { Button } from '../components/ui'

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="text-center">
        <p className="text-5xl font-bold text-slate-300">404</p>
        <h1 className="mt-3 text-lg font-semibold text-slate-800">
          Page not found
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          The page you’re looking for doesn’t exist.
        </p>
        <Link to="/">
          <Button className="mt-5">Back to home</Button>
        </Link>
      </div>
    </div>
  )
}

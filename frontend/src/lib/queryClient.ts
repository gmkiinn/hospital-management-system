import { QueryCache, QueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import toast from 'react-hot-toast'

export const queryClient = new QueryClient({
  // Surface unexpected query failures once, as a toast. 401s are handled by the
  // axios auth interceptor (token refresh / redirect), so skip them here.
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof AxiosError && error.response?.status === 401) return
      const detail =
        error instanceof AxiosError
          ? (error.response?.data?.detail ?? error.message)
          : 'Something went wrong while loading data'
      toast.error(String(detail))
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

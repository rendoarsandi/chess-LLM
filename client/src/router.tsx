import { createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 2000, refetchOnWindowFocus: true } },
  })
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultErrorComponent: () => (
      <main className="fatal-error">
        <h1>The page could not load.</h1>
        <p>Your benchmark runs continue on the server.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload page
        </button>
      </main>
    ),
    Wrap: ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

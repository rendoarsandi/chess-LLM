import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import { RootDocument } from '../RootDocument'
import '@fontsource-variable/public-sans'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'GameBench — LLM game benchmarks' },
      {
        name: 'description',
        content:
          'Run controlled LLM chess benchmarks, watch matches, and compare recorded results.',
      },
    ],
    links: [{ rel: 'icon', type: 'image/svg+xml', href: '/gamebench.svg' }],
  }),
  component: Outlet,
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <div className="empty-message">
      <h1>Page not found</h1>
      <Link className="button primary" to="/">
        Go to benchmark runs
      </Link>
    </div>
  ),
})

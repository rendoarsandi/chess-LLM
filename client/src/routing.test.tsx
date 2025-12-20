import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import React from 'react';

describe('Routing Infrastructure', () => {
  it('should be able to render a route using react-router', () => {
    const routes = [
      {
        path: '/',
        element: <div>Home Page</div>,
      },
      {
        path: '/test',
        element: <div>Test Page</div>,
      },
    ];

    const router = createMemoryRouter(routes, {
      initialEntries: ['/test'],
    });

    render(<RouterProvider router={router} />);

    expect(screen.getByText('Test Page')).toBeInTheDocument();
  });
});

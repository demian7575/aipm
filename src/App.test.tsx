import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders merge request controls and mindmap canvas', () => {
    render(<App />);

    expect(screen.getByText(/AI Project Manager Workspace/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create MR/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/AI planning mindmap/i)).toBeInTheDocument();
  });
});

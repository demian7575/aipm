import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, vi } from 'vitest';
import App from './App';
import { mockMindmap } from './data/mockMindmap';

const mockResponse = {
  json: async () => mockMindmap,
  ok: true,
  status: 200,
} as Response;

beforeEach(() => {
  vi.spyOn(global, 'fetch').mockResolvedValue(mockResponse);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('App', () => {
  it('renders the merge request summary and story panels', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /MR: Bootstrap AI Project Manager Mindmap/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Mindmap Overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sync from GitHub MR/i })).toBeInTheDocument();
    expect(screen.getByText(/Acceptance Test Activity/i)).toBeInTheDocument();
  });

  it('opens the create story modal from the detail panel', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Draft Child Story/i }));

    expect(screen.getByRole('dialog', { name: /Draft child story/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/As a/i)).toBeInTheDocument();
  });
});

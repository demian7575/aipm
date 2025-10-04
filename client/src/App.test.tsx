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
  it('renders the merge request summary and planning controls', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /Mindmap dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Merge Requests/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create MR/i })).toBeInTheDocument();
    expect(screen.getByText(/Acceptance Test Activity/i)).toBeInTheDocument();
    expect(screen.getByText(/MR: Bootstrap AI Project Manager Mindmap/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mindmap graph view/i)).toBeInTheDocument();
  });

  it('opens the create story modal from the detail panel', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /Add Child User Story/i }));

    expect(screen.getByRole('dialog', { name: /Create User Story/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/As a/i)).toBeInTheDocument();
  });
});

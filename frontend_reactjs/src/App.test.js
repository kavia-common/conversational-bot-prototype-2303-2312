import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

describe('App integration (chat-only layout)', () => {
  test('renders initial assistant welcome message and disabled preview action', () => {
    render(<App />);

    // Seeded assistant message from chatStore
    expect(
      screen.getByText(/Describe the website you want to prototype/i)
    ).toBeInTheDocument();

    // Preview button should be present and disabled initially
    expect(screen.getByRole('button', { name: /Open Preview/i })).toBeDisabled();
  });

  test('submitting a prompt shows assistant response and enables preview action', async () => {
    render(<App />);

    // Enter a prompt and submit
    const input = screen.getByLabelText(/Enter your prompt/i);
    const send = screen.getByRole('button', { name: /Send prompt/i });
    fireEvent.change(input, { target: { value: 'Create a dark SaaS landing with contact' } });
    fireEvent.click(send);

    await waitFor(
      () =>
        expect(
          screen.getByText(
            /Preview updated\. You can refine with follow-up prompts/i
          )
        ).toBeInTheDocument(),
      { timeout: 4000 }
    );

    // Preview button enabled
    expect(screen.getByRole('button', { name: /Open Preview/i })).toBeEnabled();
  });

  test('reset clears messages back to welcome and disables preview', async () => {
    render(<App />);

    // Generate content first
    const input = screen.getByLabelText(/Enter your prompt/i);
    const send = screen.getByRole('button', { name: /Send prompt/i });
    fireEvent.change(input, { target: { value: 'Make a portfolio homepage' } });
    fireEvent.click(send);

    await waitFor(
      () =>
        expect(
          screen.getByText(
            /Preview updated\. You can refine with follow-up prompts/i
          )
        ).toBeInTheDocument(),
      { timeout: 4000 }
    );

    // Click Reset
    const resetBtn = screen.getByRole('button', { name: /Reset chat and preview/i });
    fireEvent.click(resetBtn);

    // Welcome message restored
    expect(
      screen.getByText(/Describe the website you want to prototype/i)
    ).toBeInTheDocument();

    // Preview disabled again
    expect(screen.getByRole('button', { name: /Open Preview/i })).toBeDisabled();
  });

  test('preview button exists and is enabled when content exists', async () => {
    render(<App />);

    // Initially present but disabled
    const previewBtn = screen.getByRole('button', { name: /Open Preview/i });
    expect(previewBtn).toBeDisabled();

    // Generate content
    const input = screen.getByLabelText(/Enter your prompt/i);
    const send = screen.getByRole('button', { name: /Send prompt/i });
    fireEvent.change(input, { target: { value: 'Create a blog homepage' } });
    fireEvent.click(send);

    await waitFor(
      () =>
        expect(
          screen.getByText(/Preview updated\. You can refine with follow-up prompts/i)
        ).toBeInTheDocument(),
      { timeout: 4000 }
    );

    // Button enabled now
    expect(previewBtn).toBeEnabled();
  });
});

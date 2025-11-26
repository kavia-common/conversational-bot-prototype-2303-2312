import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from './App';

// Helper to get preview iframe (when content exists) or empty-state status element
function getPreviewElements() {
  const status = screen.queryByRole('status');
  const iframe = screen.queryByTitle('Prototype Preview');
  return { status, iframe };
}

describe('App integration', () => {
  test('renders initial assistant welcome message', () => {
    render(<App />);
    // Seeded assistant message from chatStore
    expect(
      screen.getByText(/Describe the website you want to prototype/i)
    ).toBeInTheDocument();

    // Preview empty state visible initially
    const { status, iframe } = getPreviewElements();
    expect(status).toBeInTheDocument();
    expect(status).toHaveTextContent(/No preview yet/i);
    expect(iframe).not.toBeInTheDocument();

    // Export buttons exist but disabled initially
    expect(screen.getByRole('button', { name: /Copy HTML to clipboard/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Download HTML/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Open preview in new tab/i })).toBeDisabled();
  });

  test('submitting a prompt shows assistant response and replaces preview empty-state with generated content', async () => {
    render(<App />);

    // Enter a prompt and submit
    const input = screen.getByLabelText(/Enter your prompt/i);
    const send = screen.getByRole('button', { name: /Send prompt/i });
    fireEvent.change(input, { target: { value: 'Create a dark SaaS landing with contact' } });
    fireEvent.click(send);

    // Assistant "typing"/"thinking" message shows transiently (could be "Thinking..." or animated indicator)
    // We assert eventual assistant acknowledgement message from generator.
    await waitFor(
      () =>
        expect(
          screen.getByText(
            /Preview updated\. You can refine with follow-up prompts/i
          )
        ).toBeInTheDocument(),
      { timeout: 4000 }
    );

    // Preview should now render an iframe with generated srcDoc; empty-state should be gone
    await waitFor(() => {
      const { status, iframe } = getPreviewElements();
      expect(status).not.toBeInTheDocument();
      expect(iframe).toBeInTheDocument();
    });

    // Export action buttons should now be enabled as content exists
    expect(screen.getByRole('button', { name: /Copy HTML to clipboard/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Download HTML/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Open preview in new tab/i })).toBeEnabled();
  });

  test('reset clears messages back to welcome and clears preview', async () => {
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

    // Verify preview shows iframe
    await waitFor(() => {
      const { iframe } = getPreviewElements();
      expect(iframe).toBeInTheDocument();
    });

    // Click Reset
    const resetBtn = screen.getByRole('button', { name: /Reset chat and preview/i });
    fireEvent.click(resetBtn);

    // Welcome message restored
    expect(
      screen.getByText(/Describe the website you want to prototype/i)
    ).toBeInTheDocument();

    // Preview empty state back
    const { status, iframe } = getPreviewElements();
    expect(status).toBeInTheDocument();
    expect(status).toHaveTextContent(/No preview yet/i);
    expect(iframe).not.toBeInTheDocument();

    // Export actions disabled again
    expect(screen.getByRole('button', { name: /Copy HTML to clipboard/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Download HTML/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Open preview in new tab/i })).toBeDisabled();
  });

  test('export buttons exist and are enabled when content exists', async () => {
    render(<App />);

    // Initially present but disabled
    const copyBtn = screen.getByRole('button', { name: /Copy HTML to clipboard/i });
    const downloadBtn = screen.getByRole('button', { name: /Download HTML/i });
    const openBtn = screen.getByRole('button', { name: /Open preview in new tab/i });
    expect(copyBtn).toBeDisabled();
    expect(downloadBtn).toBeDisabled();
    expect(openBtn).toBeDisabled();

    // Generate content
    const input = screen.getByLabelText(/Enter your prompt/i);
    const send = screen.getByRole('button', { name: /Send prompt/i });
    fireEvent.change(input, { target: { value: 'Create a blog homepage' } });
    fireEvent.click(send);

    // Wait for assistant response and preview iframe
    await waitFor(
      () =>
        expect(
          screen.getByText(/Preview updated\. You can refine with follow-up prompts/i)
        ).toBeInTheDocument(),
      { timeout: 4000 }
    );
    await waitFor(() => {
      const { iframe } = getPreviewElements();
      expect(iframe).toBeInTheDocument();
    });

    // Buttons enabled now
    expect(copyBtn).toBeEnabled();
    expect(downloadBtn).toBeEnabled();
    expect(openBtn).toBeEnabled();
  });
});

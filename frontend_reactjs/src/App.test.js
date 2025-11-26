import { render, screen } from '@testing-library/react';
import App from './App';

test('renders assistant welcome message', () => {
  render(<App />);
  const text = screen.getByText(/Describe the website you want to prototype/i);
  expect(text).toBeInTheDocument();
});

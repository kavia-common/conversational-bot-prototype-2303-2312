import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App'; // Main chat layout + provider
import PreviewPage from './PreviewPage';

// Lightweight hash router to avoid adding dependencies.
// Supports: "#/preview" => PreviewPage, default => App
function Router() {
  const getPath = () => {
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    // Normalize hash path
    const path = (hash || '').replace(/^#/, '');
    return path || '/';
  };

  const [path, setPath] = useState(getPath());

  useEffect(() => {
    const onHashChange = () => setPath(getPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const element = useMemo(() => {
    if (path === '/preview') {
      return <PreviewPage />;
    }
    return <App />;
  }, [path]);

  return element;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);

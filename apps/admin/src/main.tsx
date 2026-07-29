import { ThemeProvider, Toaster } from '@firecare/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { queryClient } from './lib/query';
import { useAuth } from './store/auth';

// Exchange the refresh cookie for an access token once, at startup.
void useAuth.getState().bootstrap();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);

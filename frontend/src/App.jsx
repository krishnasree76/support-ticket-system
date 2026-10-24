import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import DashboardPage from './pages/DashboardPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetailsPage from './pages/TicketDetailsPage';
import NotFoundPage from './pages/NotFoundPage';
import { AppDataProvider, useAppData } from './context/AppDataContext';
import { ToastProvider } from './context/ToastContext';
import { TicketFormProvider } from './context/TicketFormContext';
import { ErrorMessage, Spinner } from './components/States';

// Meta (statuses, categories, transitions) is needed by every page, so the app
// waits for it once instead of every component handling a missing value.
function AppRoutes() {
  const { meta, metaError, reloadMeta } = useAppData();

  if (metaError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card w-full max-w-md">
          <ErrorMessage title="Cannot connect to the API" message={metaError} onRetry={reloadMeta} />
        </div>
      </div>
    );
  }
  if (!meta) return <Spinner label="Loading workspace…" className="min-h-screen" />;

  return (
    <TicketFormProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/:id" element={<TicketDetailsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </TicketFormProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppDataProvider>
          <AppRoutes />
        </AppDataProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

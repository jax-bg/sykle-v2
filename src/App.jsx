import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from './components/Layout';
// Add page imports here
import Garden from './pages/Garden';
import Log from './pages/Log';
import Plant from './pages/Plant';
import Oasis from './pages/Oasis';
import Harvest from './pages/Harvest';
import Glean from './pages/Glean';
import Login from './pages/Login';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  const auth = useAuth();
  const authMessage = (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Sign in required</h2>
        <p className="text-muted-foreground mb-6">
          You must sign in before viewing this page.
        </p>
        <button
          type="button"
          onClick={auth.navigateToLogin}
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Sign in
        </button>
      </div>
    </div>
  );

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Garden />} />
        <Route path="/log" element={<Log />} />
        <Route path="/plant" element={<Plant />} />
        <Route path="/oasis" element={<Oasis />} />
        <Route path="/harvest" element={<Harvest />} />
        <Route path="/glean" element={<Glean />} />
        <Route path="/login" element={<Login />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
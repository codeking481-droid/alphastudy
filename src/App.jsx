import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from '@/pages/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import ScrollToTop from '@/components/ScrollToTop';
import Home from '@/pages/Home';
import Notes from '@/pages/Notes';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ProtectedRoute from '@/components/ProtectedRoute';

const AuthenticatedApp = () => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/notes" element={<Notes />} />
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
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App

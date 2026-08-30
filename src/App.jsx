import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Public pages
import Home from './pages/Home.jsx';
import CategoryPage from './pages/CategoryPage';
import ArticlePage from './pages/ArticlePage';
import SearchPage from './pages/SearchPage';
import Pricing from './pages/Pricing';
import SavedArticles from './pages/SavedArticles';
import MyProfile from './pages/MyProfile';

// Admin layout + pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ArticlesList from './pages/admin/ArticlesList';
import ArticleEditor from './pages/admin/ArticleEditor';
import MediaLibrary from './pages/admin/MediaLibrary';
import CategoriesManager from './pages/admin/CategoriesManager';
import UsersManager from './pages/admin/UsersManager';
import SiteSettings from './pages/admin/SiteSettings';
import UserProfile from './pages/admin/UserProfile';
import CommentsManager from './pages/admin/CommentsManager';
import Communications from './pages/admin/Communications';
import SubscriptionsManager from './pages/admin/SubscriptionsManager';
import ArticleAnalytics from './pages/admin/ArticleAnalytics';
import AdsManager from './pages/admin/AdsManager';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin"></div>
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

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/category/:slug" element={<CategoryPage />} />
      <Route path="/article/:slug" element={<ArticlePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/saved" element={<SavedArticles />} />
      <Route path="/profile" element={<MyProfile />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="articles" element={<ArticlesList />} />
        <Route path="articles/new" element={<ArticleEditor />} />
        <Route path="articles/:id" element={<ArticleEditor />} />
        <Route path="media" element={<MediaLibrary />} />
        <Route path="categories" element={<CategoriesManager />} />
        <Route path="users" element={<UsersManager />} />
        <Route path="users/:id" element={<UserProfile />} />
        <Route path="settings" element={<SiteSettings />} />
        <Route path="profile" element={<UserProfile />} />
        <Route path="comments" element={<CommentsManager />} />
        <Route path="communications" element={<Communications />} />
        <Route path="subscriptions" element={<SubscriptionsManager />} />
        <Route path="analytics" element={<ArticleAnalytics />} />
        <Route path="ads" element={<AdsManager />} />
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
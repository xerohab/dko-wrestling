import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

// Auth pages (public)
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

// Public pages
import Home from './pages/Home.jsx';
import CategoryPage from './pages/CategoryPage';
import ArticlePage from './pages/ArticlePage';
import SearchPage from './pages/SearchPage';
import Pricing from './pages/Pricing';
import JoinLink from './pages/JoinLink';
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
import PerkSphereAdmin from './pages/admin/PerkSphereAdmin';

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            {/* Auth routes — public */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />

            {/* Public content — viewable without login */}
            <Route path="/" element={<Home />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/article/:slug" element={<ArticlePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/join/:code" element={<JoinLink />} />

            {/* Account-only — login required */}
            <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
              <Route path="/saved" element={<SavedArticles />} />
              <Route path="/profile" element={<MyProfile />} />

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
                <Route path="perksphere" element={<PerkSphereAdmin />} />
              </Route>
            </Route>

            <Route path="*" element={<PageNotFound />} />
          </Routes>
          <Toaster />
        </Router>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
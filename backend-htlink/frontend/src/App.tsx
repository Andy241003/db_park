// src/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
// Legacy imports removed from the active park runtime
// import MainLayout from './layouts/MainLayout';
// import DashboardSelection from './pages/DashboardSelection';
import Login from './pages/Login';

// Admin imports
import AdminLayout from './pages/admin/AdminLayout';

// Shared imports
import SharedSettingsLayout from './layouts/SharedSettingsLayout';
import Media from './pages/Media';

// VR Hotel imports kept out of the active park runtime
// import VRHotelActivities from './pages/vr-hotel/Activities';
// import VRHotelContact from './pages/vr-hotel/Contact';
// ... (all VR Hotel imports removed)

// Travel Link imports kept out of the active park runtime
// import MainLayout from './layouts/MainLayout';
// import DashboardSelection from './pages/DashboardSelection';

// Park admin imports currently re-exported from compatibility paths
import ParkAchievements from './pages/restaurant/Achievements';
import ParkActivities from './pages/restaurant/Activities';
import ParkAttractions from './pages/restaurant/Attractions';
import ParkCareers from './pages/restaurant/Careers';
import ParkContact from './pages/restaurant/Contact';
import ParkDashboard from './pages/restaurant/Dashboard';
import ParkDining from './pages/restaurant/Dining';
import ParkEvents from './pages/restaurant/Events';
import ParkGallery from './pages/restaurant/Gallery';
import ParkGamesActivities from './pages/restaurant/GamesActivities';
import ParkHome from './pages/restaurant/Home';
import ParkIntroduction from './pages/restaurant/Introduction';
import ParkLanguages from './pages/restaurant/Languages';
import ParkMapTour from './pages/restaurant/MapTour';
import ParkPromotions from './pages/restaurant/Promotions';
import ParkLayout from './pages/restaurant/RestaurantLayout';
import ParkServices from './pages/restaurant/Services';
import ParkSettings from './pages/restaurant/Settings';
import ParkTenants from './pages/restaurant/Tenants';
import ParkTicketTypes from './pages/restaurant/TicketTypes';
import ParkUsers from './pages/restaurant/Users';
import ParkVisitorInformation from './pages/restaurant/VisitorInformation';
import { autoDetectLanguage } from './utils/languageDetection';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  // Direct localStorage check, bypass useAuth hook
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = localStorage.getItem('access_token');
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    return !!(token && isAuth);
  });

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('access_token');
      const isAuth = localStorage.getItem('isAuthenticated') === 'true';
      const newState = !!(token && isAuth);
      
      setIsAuthenticated((prev) => (prev === newState ? prev : newState));
    };

    // Check immediately
    checkAuth();

    // Listen for storage events
    const handleStorageChange = () => {
      checkAuth();
    };

    // Listen for custom auth events
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChanged', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChanged', handleAuthChange);
    };
  }, []);

  // Auto-detect browser language on app mount
  useEffect(() => {
    // Only run if user is authenticated
    if (isAuthenticated) {
      autoDetectLanguage().catch(error => {
        console.error('Failed to auto-detect language:', error);
      });
    }
  }, [isAuthenticated]); // Run when auth state changes

  return (
    <QueryClientProvider client={queryClient}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Legacy dashboard selection removed from the active park runtime */}
            {/* <Route path="/dashboard-selection" element={...} /> */}
            
            {/* Core Admin Routes - Super Admin only */}
            <Route 
              path="/admin/*" 
              element={
                isAuthenticated ? (
                  <ProtectedRoute requireOwner>
                    <AdminLayout />
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            
            {/* Shared Settings Route - Accessible by all authenticated users */}
            <Route 
              path="/settings" 
              element={
                isAuthenticated ? (
                  <SharedSettingsLayout />
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />
            
            {/* VR Hotel routes are intentionally separate from the park runtime */}
            {/* <Route path="/vr-hotel/*" element={...} /> */}

            {/* Park Admin Routes */}
            <Route 
              path="/park/*" 
              element={
                isAuthenticated ? (
                  <ProtectedRoute>
                    <Routes>
                      <Route element={<ParkLayout />}>
                        <Route path="" element={<ParkDashboard />} />
                        <Route path="activities" element={<ParkActivities />} />
                        <Route path="users" element={<ParkUsers />} />
                        <Route path="tenants" element={<ProtectedRoute requireAdmin><ParkTenants /></ProtectedRoute>} />
                        <Route path="home" element={<ParkHome />} />
                        <Route path="info" element={<Navigate to="/park/home" replace />} />
                        <Route path="introduction" element={<ParkIntroduction />} />
                        <Route path="about" element={<Navigate to="/park/introduction" replace />} />
                        <Route path="visit-info" element={<ParkVisitorInformation />} />
                        <Route path="menu" element={<Navigate to="/park/dining-services" replace />} />
                        <Route path="ticket-types" element={<ParkTicketTypes />} />
                        <Route path="dining-services" element={<ParkDining />} />
                        <Route path="space" element={<Navigate to="/park/map-tour" replace />} />
                        <Route path="map-tour" element={<ParkMapTour />} />
                        <Route path="branches" element={<Navigate to="/park/attractions" replace />} />
                        <Route path="attractions" element={<ParkAttractions />} />
                        <Route path="events" element={<ParkEvents />} />
                        <Route path="schedule-events" element={<ParkEvents />} />
                        <Route path="games-activities" element={<ParkGamesActivities />} />
                        <Route path="careers" element={<ParkCareers />} />
                        <Route path="promotions" element={<ParkPromotions />} />
                        <Route path="offers" element={<ParkPromotions />} />
                        <Route path="achievements" element={<ParkAchievements />} />
                        <Route path="gallery" element={<ParkGallery />} />
                        <Route path="library" element={<ParkGallery />} />
                        <Route path="media" element={<Media defaultSource="restaurant" />} />
                        <Route path="contact" element={<ParkContact />} />
                        <Route path="languages" element={<ParkLanguages />} />
                        <Route path="services" element={<ParkServices />} />
                        <Route path="services-support" element={<ParkServices />} />
                        <Route path="settings" element={<ParkSettings />} />
                      </Route>
                    </Routes>
                  </ProtectedRoute>
                ) : (
                  <Navigate to="/login" replace />
                )
              } 
            />

            {/* Default route: redirect to the active park dashboard */}
            <Route 
              path="/" 
              element={isAuthenticated ? <Navigate to="/park" replace /> : <Navigate to="/login" replace />} 
            />
            <Route path="/*" element={<Navigate to="/park" replace />} />
          </Routes>
        </div>
      </Router>
      {/* Modern Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#363636',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;


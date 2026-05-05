import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Header from '../../components/layout/Header';
import RestaurantSidebar from '../../components/layout/RestaurantSidebar';
import { isAuthenticated } from '../../services/api';

const RestaurantLayout: React.FC = () => {
  const location = useLocation();
  const baseSegment = '/park';
  const sectionLabel = 'Adventure Park';

  // Check authentication
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Map routes to page titles and breadcrumbs
  const getPageInfo = (pathname: string) => {
    const path = pathname.replace(baseSegment, '');
    switch (path) {
      case '':
      case '/':
        return { title: 'Dashboard', breadcrumb: `${sectionLabel} / Dashboard` };
      case '/info':
      case '/home':
        return { title: 'Home', breadcrumb: `${sectionLabel} / Home` };
      case '/introduction':
        return { title: 'Introduction', breadcrumb: `${sectionLabel} / Introduction` };
      case '/map-tour':
        return { title: 'Map & Tour', breadcrumb: `${sectionLabel} / Map & Tour` };
      case '/attractions':
        return { title: 'Points of Interest', breadcrumb: `${sectionLabel} / Points of Interest` };
      case '/games-activities':
        return { title: 'Games & Activities', breadcrumb: `${sectionLabel} / Games & Activities` };
      case '/ticket-types':
        return { title: 'Ticket Types & Pricing', breadcrumb: `${sectionLabel} / Ticket Types & Pricing` };
      case '/schedule-events':
        return { title: 'Schedule & Events', breadcrumb: `${sectionLabel} / Schedule & Events` };
      case '/dining-services':
        return { title: 'Dining', breadcrumb: `${sectionLabel} / Dining` };
      case '/services-support':
        return { title: 'Services & Support', breadcrumb: `${sectionLabel} / Services & Support` };
      case '/visit-info':
        return { title: 'Visitor Information', breadcrumb: `${sectionLabel} / Visitor Information` };
      case '/offers':
        return { title: 'Offers', breadcrumb: `${sectionLabel} / Offers` };
      case '/library':
        return { title: 'Library', breadcrumb: `${sectionLabel} / Library` };
      case '/users':
        return { title: 'Users', breadcrumb: `${sectionLabel} / Users` };
      case '/about':
        return { title: 'Introduction', breadcrumb: `${sectionLabel} / Introduction` };
      case '/menu':
        return { title: 'Dining', breadcrumb: `${sectionLabel} / Dining` };
      case '/events':
        return { title: 'Schedule & Events', breadcrumb: `${sectionLabel} / Schedule & Events` };
      case '/careers':
        return { title: 'Careers', breadcrumb: `${sectionLabel} / Careers` };
      case '/promotions':
        return { title: 'Offers', breadcrumb: `${sectionLabel} / Offers` };
      case '/services':
        return { title: 'Services & Support', breadcrumb: `${sectionLabel} / Services & Support` };
      case '/achievements':
        return { title: 'Achievements', breadcrumb: `${sectionLabel} / Achievements` };
      case '/gallery':
        return { title: 'Library', breadcrumb: `${sectionLabel} / Library` };
      case '/contact':
        return { title: 'Contact', breadcrumb: `${sectionLabel} / Contact` };
      case '/languages':
        return { title: 'Languages', breadcrumb: `${sectionLabel} / Languages` };
      case '/tenants':
        return { title: 'Tenants', breadcrumb: `${sectionLabel} / Tenants` };
      case '/settings':
        return { title: 'Settings', breadcrumb: `${sectionLabel} / Settings` };
      case '/activities':
        return { title: 'Activity Log', breadcrumb: `${sectionLabel} / Activity Log` };
      default:
        return { title: 'Adventure Park', breadcrumb: sectionLabel };
    }
  };

  const pageInfo = getPageInfo(location.pathname);

  const handleSearch = (_query: string) => {
    // Implement global search logic here
  };

  const handleNotifications = () => {
    // Implement notification logic here
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <RestaurantSidebar />
      <div className="sm:ml-64">
        <Header 
          title={pageInfo.title} 
          breadcrumb={pageInfo.breadcrumb}
          onSearch={handleSearch}
          onNotificationClick={handleNotifications}
        />
        <main className="pt-20 px-6 pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default RestaurantLayout;






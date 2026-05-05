// src/components/layout/RestaurantSidebar.tsx
import {
  faBriefcase,
  faBullhorn,
  faCalendarAlt,
  faChartLine,
  faCircleInfo,
  faGear,
  faGlobe,
  faHome,
  faImages,
  faInfo,
  faMapMarkerAlt,
  faPhone,
  faRightFromBracket,
  faShieldAlt,
  faTrophy,
  faUtensils,
  faWarehouse
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

type NavLinkItem = {
  path: string;
  icon: any;
  label: string;
  visible: boolean;
  matchPaths?: string[];
};

const RestaurantSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = usePermissions();
  const basePath = '/park';
  const tenantName = localStorage.getItem('tenant_name') || 'Adventure Park Admin';
  const tenantLabel = localStorage.getItem('tenant_code') || 'Adventure Park';

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.clear();
      navigate("/login");
    }
  };

  const isPathActive = (path: string) => {
    if (path === basePath) {
      return location.pathname === basePath || location.pathname === `${basePath}/`;
    }
    return location.pathname.startsWith(path);
  };

  const isActive = (link: NavLinkItem) => {
    const matchPaths = link.matchPaths ?? [link.path];
    return matchPaths.some(isPathActive);
  };

  const navItems = [
    {
      section: 'OVERVIEW',
      links: [
        { path: basePath, icon: faChartLine, label: 'Dashboard', visible: true },
        {
          path: `${basePath}/home`,
          icon: faHome,
          label: 'Home',
          visible: true,
          matchPaths: [`${basePath}/info`, `${basePath}/home`],
        },
        {
          path: `${basePath}/introduction`,
          icon: faCircleInfo,
          label: 'Introduction',
          visible: true,
          matchPaths: [`${basePath}/introduction`, `${basePath}/about`],
        },
      ],
    },
    {
      section: 'ATTRACTIONS',
      links: [
        {
          path: `${basePath}/map-tour`,
          icon: faWarehouse,
          label: 'Map & Tour',
          visible: true,
          matchPaths: [`${basePath}/map-tour`],
        },
        {
          path: `${basePath}/attractions`,
          icon: faMapMarkerAlt,
          label: 'Points of Interest',
          visible: true,
          matchPaths: [`${basePath}/attractions`],
        },
        {
          path: `${basePath}/games-activities`,
          icon: faCalendarAlt,
          label: 'Games & Activities',
          visible: true,
          matchPaths: [`${basePath}/games-activities`],
        },
      ],
    },
    {
      section: 'SERVICES',
      links: [
        {
          path: `${basePath}/ticket-types`,
          icon: faUtensils,
          label: 'Ticket Types & Pricing',
          visible: true,
          matchPaths: [`${basePath}/ticket-types`],
        },
        {
          path: `${basePath}/schedule-events`,
          icon: faCalendarAlt,
          label: 'Schedule & Events',
          visible: true,
          matchPaths: [`${basePath}/schedule-events`, `${basePath}/events`],
        },
        {
          path: `${basePath}/dining-services`,
          icon: faUtensils,
          label: 'Dining',
          visible: true,
          matchPaths: [`${basePath}/dining-services`],
        },
        {
          path: `${basePath}/services-support`,
          icon: faPhone,
          label: 'Services & Support',
          visible: true,
          matchPaths: [`${basePath}/services-support`, `${basePath}/services`],
        },
      ],
    },
    {
      section: 'INFORMATION',
      links: [
        {
          path: `${basePath}/visit-info`,
          icon: faInfo,
          label: 'Visitor Information',
          visible: true,
          matchPaths: [`${basePath}/visit-info`],
        },
        { path: `${basePath}/contact`, icon: faPhone, label: 'Contact', visible: true },
        { path: `${basePath}/careers`, icon: faBriefcase, label: 'Careers', visible: true },
        {
          path: `${basePath}/offers`,
          icon: faBullhorn,
          label: 'Offers',
          visible: true,
          matchPaths: [`${basePath}/offers`, `${basePath}/promotions`],
        },
        {
          path: `${basePath}/library`,
          icon: faImages,
          label: 'Library',
          visible: true,
          matchPaths: [`${basePath}/library`, `${basePath}/gallery`],
        },
        {
          path: `${basePath}/achievements`,
          icon: faTrophy,
          label: 'Achievements',
          visible: true,
        },
      ],
    },
    {
      section: 'SYSTEM',
      links: [
        { path: `${basePath}/users`, icon: faBriefcase, label: 'Users', visible: permissions.canManageUsers },
        { path: `${basePath}/tenants`, icon: faShieldAlt, label: 'Tenants', visible: permissions.canManageTenant || permissions.isAdmin },
        { path: `${basePath}/languages`, icon: faGlobe, label: 'Languages', visible: true },
        { path: `${basePath}/settings`, icon: faGear, label: 'Settings', visible: true },
      ],
    },
  ];

  return (
    <aside className="fixed hidden h-full w-64 overflow-y-auto bg-slate-900 text-white sm:block">
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-emerald-500 p-1.5 shadow-lg shadow-emerald-500/30">
            <FontAwesomeIcon icon={faUtensils} className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">Adventure Park</span>
        </div>
      </div>

      <div className="border-b border-slate-800 bg-slate-800/40 px-4 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{tenantLabel}</p>
        <p className="mt-1 text-sm font-semibold text-slate-100">{tenantName}</p>
      </div>

      <nav className="p-5">
        {navItems.map((section) => {
          const visibleLinks = section.links.filter(link => link.visible);

          if (visibleLinks.length === 0) {
            return null;
          }

          return (
            <div key={section.section} className="mb-6">
              <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{section.section}</h3>
              <ul className="space-y-1">
                {visibleLinks.map((link) => {
                  const active = isActive(link);
                  const isCoreAdmin = link.path.startsWith('/admin');
                  const isSettings = link.path === '/settings';

                  return (
                    <li key={link.path}>
                      <Link
                        to={link.path}
                        onClick={() => {
                          if (isCoreAdmin || isSettings) {
                            localStorage.setItem('admin_context', 'park');
                          }
                        }}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          active
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <FontAwesomeIcon icon={link.icon} className="h-4 w-4" />
                        <span>{link.label}</span>
                      </Link>
                    </li>
                  );
                })}
                {section.section === 'SYSTEM' && (
                  <li>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                    >
                      <FontAwesomeIcon icon={faRightFromBracket} className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default RestaurantSidebar;



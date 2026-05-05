import { LifeBuoy, MapPin, Sparkles, Tag } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  restaurantActivityLogsApi,
  restaurantAttractionsApi,
  restaurantPromotionsApi,
  restaurantServicesApi,
  type RestaurantActivityItem,
} from '../../services/restaurantApi';
import { tenantApi, type TenantSettings } from '../../services/tenantApi';

interface RestaurantDashboardStats {
  totalServices: number;
  totalRecentActivities: number;
  totalPromotions: number;
  totalPointsOfInterest: number;
}

interface TenantDisplayInfo {
  id?: number;
  name: string;
  code: string;
}

const RestaurantDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = '/park';
  const [stats, setStats] = useState<RestaurantDashboardStats>({
    totalServices: 0,
    totalRecentActivities: 0,
    totalPromotions: 0,
    totalPointsOfInterest: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RestaurantActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantInfo, setTenantInfo] = useState<TenantDisplayInfo>({
    id: localStorage.getItem('tenant_id') ? Number(localStorage.getItem('tenant_id')) : undefined,
    name: localStorage.getItem('tenant_name') || 'Current Tenant',
    code: localStorage.getItem('tenant_code') || 'unknown',
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadTenantInfo = async () => {
    try {
      const response = await tenantApi.getCurrentTenant();
      const tenantData: TenantSettings = response.data;
      const nextTenant = {
        id: tenantData.id,
        name: tenantData.name || tenantData.code,
        code: tenantData.code,
      };

      setTenantInfo(nextTenant);
      localStorage.setItem('tenant_id', String(tenantData.id));
      localStorage.setItem('tenant_name', nextTenant.name);
      localStorage.setItem('tenant_code', tenantData.code);
    } catch (error) {
      console.error('Failed to load tenant info:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      await loadTenantInfo();

      const [services, promotions, attractions] = await Promise.all([
        restaurantServicesApi.getServices().catch(() => []),
        restaurantPromotionsApi.getPromotions().catch(() => []),
        restaurantAttractionsApi.getAttractions().catch(() => []),
      ]);

      const activities = await restaurantActivityLogsApi.getRecentActivities(10);

      setStats({
        totalServices: services?.length || 0,
        totalRecentActivities: activities?.length || 0,
        totalPromotions: promotions?.length || 0,
        totalPointsOfInterest: attractions?.length || 0,
      });

      setRecentActivities(activities);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-slate-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="mb-2 text-3xl font-bold">Welcome back!</h2>
            <p className="text-lg text-blue-100">
              Manage your amusement park content and keep every visitor experience up to date
            </p>
          </div>

          <div className="min-w-[220px] rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">Current Tenant</p>
            <p className="mt-2 text-lg font-bold text-white">{tenantInfo.name}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-blue-100">
              <span className="rounded-full bg-white/10 px-2.5 py-1 font-medium">{tenantInfo.code}</span>
              {tenantInfo.id !== undefined && (
                <span className="rounded-full bg-white/10 px-2.5 py-1 font-medium">ID {tenantInfo.id}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => navigate(`${basePath}/services-support`)}
            className="rounded-md bg-white px-6 py-2.5 font-medium text-blue-600 shadow-sm transition-colors hover:bg-blue-50"
          >
            Add Service
          </button>
          <button
            onClick={() => navigate(`${basePath}/attractions`)}
            className="rounded-md bg-white px-6 py-2.5 font-medium text-blue-600 shadow-sm transition-colors hover:bg-blue-50"
          >
            Add Point of Interest
          </button>
          <button
            onClick={() => navigate(`${basePath}/promotions`)}
            className="rounded-md bg-white/90 px-6 py-2.5 font-medium text-blue-600 shadow-sm transition-colors hover:bg-white"
          >
            Add Promotion
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-600">Services</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalServices}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <LifeBuoy className="h-7 w-7 text-white" />
            </div>
          </div>
          <button
            onClick={() => navigate(`${basePath}/services-support`)}
            className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all -&gt;
          </button>
        </div>

        <div className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-600">Recent Activities</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalRecentActivities}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 via-pink-600 to-red-600">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
          </div>
          <button
            onClick={() => navigate(`${basePath}/activities`)}
            className="mt-4 text-sm font-medium text-pink-600 hover:text-pink-700"
          >
            View all -&gt;
          </button>
        </div>

        <div className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-600">Promotions</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalPromotions}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 via-cyan-600 to-blue-600">
              <Tag className="h-7 w-7 text-white" />
            </div>
          </div>
          <button
            onClick={() => navigate(`${basePath}/promotions`)}
            className="mt-4 text-sm font-medium text-cyan-600 hover:text-cyan-700"
          >
            View all -&gt;
          </button>
        </div>

        <div className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-1 text-sm font-medium text-slate-600">Points of Interest</p>
              <p className="text-3xl font-bold text-slate-900">{stats.totalPointsOfInterest}</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600">
              <MapPin className="h-7 w-7 text-white" />
            </div>
          </div>
          <button
            onClick={() => navigate(`${basePath}/attractions`)}
            className="mt-4 text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            View all -&gt;
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-md">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
          <button
            onClick={() => navigate(`${basePath}/activities`)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all
          </button>
        </div>

        <div className="space-y-3">
          {recentActivities && recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 rounded-lg border-l-4 p-4 transition-colors hover:bg-gray-50"
                style={{ borderColor: activity.iconBg }}
              >
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: activity.iconBg,
                    color: activity.iconColor,
                  }}
                >
                  <i className={activity.icon}></i>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{activity.text}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                    <span>{activity.user_name}</span>
                    <span>�</span>
                    <span>{activity.time}</span>
                    {activity.ip_address && (
                      <>
                        <span>�</span>
                        <span>IP {activity.ip_address}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center">
              <div className="mb-2 text-slate-400">
                <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="font-medium text-slate-600">No recent activity</p>
              <p className="mt-1 text-sm text-slate-500">
                Activity will appear here once you start making changes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantDashboard;




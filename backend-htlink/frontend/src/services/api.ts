import type { AxiosResponse } from 'axios';
import axios from 'axios';
import { getApiBaseUrl } from '../utils/api';

// API Base Configuration
const API_BASE_URL = import.meta.env.DEV ? '/api/v1' : getApiBaseUrl();

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  // FORCE no cache for all requests
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});

// Get tenant code from user login (multi-tenant support)
const getTenantCode = (): string => {
  // First check if user is logged in and has tenant from backend
  const userTenantCode = localStorage.getItem('tenant_code');
  if (userTenantCode) {
    return userTenantCode;
  }
  
  // Fallback: Legacy domain-based detection for backward compatibility
  const hostname = window.location.hostname;
  if (hostname.includes('zalominiapp.vtlink.vn')) {
    return 'premier_admin';
  }
  
  // Default for localhost and other domains
  return 'demo';
};

// Request interceptor to add auth token and tenant header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    const tenantCode = getTenantCode();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Always add tenant header (backend expects X-Tenant-Code)
    config.headers['X-Tenant-Code'] = tenantCode;
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Setup interceptors for auth and permission handling
import { setupAxiosInterceptors } from '../utils/axiosInterceptors';
setupAxiosInterceptors(apiClient);

// Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface DashboardStats {
  total_page_views: number;
  page_views_growth: number;
  unique_visitors: number;
  categories_this_month: number;
  features_this_month: number;
  period_days: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  text: string;
  time: string;
  user_name: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  ip_address?: string;
}

export interface LoginResponse {
  access_token: string;
  user_info?: {
    id: number;
    email: string;
    full_name: string;
    is_active: boolean;
    tenant_id: number;
  };
  tenant_info?: {
    id?: number;
    code?: string | null;
    name?: string | null;
  };
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  is_active: boolean;
  tenant_id: number;
  service_access?: number; // 0 = Travel Link only, 1 = VR Hotel only, 2 = Both
  created_at: string;
  updated_at?: string;
}

export interface Property {
  id: number;
  name: string;
  description?: string;
  address?: string;
  tenant_id: number;
  created_at: string;
  updated_at?: string;
}

export interface Feature {
  id: number;
  tenant_id: number;
  category_id: number;
  slug: string;
  icon_key?: string;
  is_system: boolean;
  created_at: string;
  // Include translations for display
  title?: string;
  short_desc?: string;
  // Translations keyed by locale code
  translations?: {
    [locale: string]: {
      title: string;
      short_desc?: string;
    };
  };
}

export interface FeatureCategory {
  id: number;
  tenant_id: number;
  slug: string;
  icon_key?: string;
  priority?: number; // Higher number = higher priority
  is_system: boolean;
  created_at: string;
  // Translations keyed by locale code (added by backend)
  name?: string; // Legacy field
  translations?: {
    [locale: string]: {
      title: string;
      short_desc?: string;
    };
  };
}

export interface Post {
  id: number;
  tenant_id: number;
  property_id: number;
  feature_id: number;
  slug: string;
  vr360_url?: string;
  status: 'draft' | 'published' | 'archived';
  pinned: boolean;
  cover_media_id?: number;
  published_at?: string;
  created_by?: number;
  created_at: string;
  updated_at?: string;
}

export interface UIPost extends Post {
  // UI-specific fields for display
  title: string;
  excerpt: string;
  locale: string;
  localeName: string;
  flagClass: string;
  content?: string;
  vrLink?: string;
  updatedAt: string; // For legacy compatibility
  uiKey?: string; // Unique key for React rendering
  content_html?: string; // HTML content
  translations?: any[]; // Array of translations for this post
}

export interface FeatureCategoryCreate {
  slug: string;
  icon_key?: string;
  is_system?: boolean;
}

export interface FeatureCategoryUpdate {
  slug?: string;
  icon_key?: string;
  priority?: number;
  is_system?: boolean;
}

// Legacy interface for backwards compatibility
export interface PropertyCategory extends FeatureCategory {
  name?: string;
  description?: string;
}

// Authentication API
export const authAPI = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { username, password } = credentials;
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    
    const response: AxiosResponse<LoginResponse> = await axios.post(
      `${API_BASE_URL}/auth/login`,
      `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      { headers }
    );
    
    // Save token to localStorage (tenant is auto-detected by backend)
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('isAuthenticated', 'true');
    if (response.data.user_info?.tenant_id) {
      localStorage.setItem('tenant_id', response.data.user_info.tenant_id.toString());
    }
    if (response.data.tenant_info?.code) {
      localStorage.setItem('tenant_code', response.data.tenant_info.code);
      localStorage.setItem('tenant_name', response.data.tenant_info.name || response.data.tenant_info.code);
    }
    
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('tenant_code');
    localStorage.removeItem('tenant_id');
    localStorage.setItem('isAuthenticated', 'false');
  },

  getCurrentUser: async (): Promise<User> => {
    const response: AxiosResponse<User> = await apiClient.get('/users/me');
    
    // Save user data to localStorage
    localStorage.setItem('currentUser', JSON.stringify(response.data));
    
    return response.data;
  },

  getUserServices: async () => {
    const response = await apiClient.get('/auth/me/services');
    return response.data;
  },
};

// Properties API
export const propertiesAPI = {
  getAll: async (): Promise<Property[]> => {
    const response: AxiosResponse<Property[]> = await apiClient.get('/properties/');
    return response.data;
  },

  getById: async (id: number): Promise<Property> => {
    const response: AxiosResponse<Property> = await apiClient.get(`/properties/${id}`);
    return response.data;
  },

  create: async (property: Partial<Property>): Promise<Property> => {
    const response: AxiosResponse<Property> = await apiClient.post('/properties/', property);
    return response.data;
  },

  update: async (id: number, property: Partial<Property>): Promise<Property> => {
    const response: AxiosResponse<Property> = await apiClient.put(`/properties/${id}`, property);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/properties/${id}`);
  },
};

// Features API
export const featuresAPI = {
  getAll: async (): Promise<Feature[]> => {
    const response: AxiosResponse<Feature[]> = await apiClient.get('/features/?include_translations=true');
    return response.data;
  },

  getById: async (id: number): Promise<Feature> => {
    const response: AxiosResponse<Feature> = await apiClient.get(`/features/${id}`);
    return response.data;
  },

  create: async (feature: any): Promise<Feature> => {
    const response: AxiosResponse<Feature> = await apiClient.post('/features/', feature);
    return response.data;
  },

  update: async (id: number, feature: any): Promise<Feature> => {
    const response: AxiosResponse<Feature> = await apiClient.put(`/features/${id}`, feature);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/features/${id}`);
  },

  createTranslation: async (featureId: number, locale: string, data: { title: string; description?: string; short_desc?: string }): Promise<void> => {
    const payload = {
      feature_id: featureId,
      locale: locale,
      title: data.title,
      short_desc: data.short_desc || ''
    };
    const response = await apiClient.post(`/translations/features`, payload);
    return response.data;
  },

  updateTranslation: async (featureId: number, locale: string, data: { title?: string; short_desc?: string }): Promise<any> => {
    const response = await apiClient.put(`/translations/features/${featureId}/${locale}`, data);
    return response.data;
  },
};

// Property Categories API
export const categoriesAPI = {
  getAll: async (): Promise<PropertyCategory[]> => {
    const response: AxiosResponse<PropertyCategory[]> = await apiClient.get('/property-categories/');
    return response.data;
  },

  getById: async (id: number): Promise<PropertyCategory> => {
    const response: AxiosResponse<PropertyCategory> = await apiClient.get(`/property-categories/${id}`);
    return response.data;
  },

  create: async (category: FeatureCategoryCreate): Promise<FeatureCategory> => {
    const response: AxiosResponse<FeatureCategory> = await apiClient.post('/categories/', category);
    return response.data;
  },

  update: async (id: number, category: FeatureCategoryUpdate): Promise<FeatureCategory> => {
    const response: AxiosResponse<FeatureCategory> = await apiClient.put(`/categories/${id}?_t=${Date.now()}`, category);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/categories/${id}`);
  },
};

// Posts API
export const postsAPI = {
  // By default include_translations=true so frontend receives all locale variants
  getAll: async (feature_id?: number, includeTranslations: boolean = true): Promise<Post[]> => {
    const params: any = { include_translations: includeTranslations };
    if (feature_id) params.feature_id = feature_id;
    const response: AxiosResponse<Post[]> = await apiClient.get('/posts/', { params });
    return response.data;
  },
  
  // Get lightweight count of posts per feature (without loading full content)
  getCount: async (feature_id: number): Promise<number> => {
    const params = { feature_id, include_translations: true };
    const response: AxiosResponse<Post[]> = await apiClient.get('/posts/', { params });
    
    // Count all post translations (as displayed in UI)
    // Each post has a translations array, expand them to count UI items
    let totalCount = 0;
    response.data.forEach((post: any) => {
      if (post.translations) {
        if (Array.isArray(post.translations)) {
          totalCount += post.translations.length;
        } else if (typeof post.translations === 'object') {
          totalCount += Object.keys(post.translations).length;
        }
      } else {
        totalCount += 1; // No translations, count the post itself
      }
    });
    
    return totalCount;
  },

  getById: async (id: number): Promise<Post> => {
    const response: AxiosResponse<Post> = await apiClient.get(`/posts/${id}`);
    return response.data;
  },

  create: async (post: Partial<Post>): Promise<Post> => {
    const response: AxiosResponse<Post> = await apiClient.post('/posts/', post);
    return response.data;
  },

  update: async (id: number, post: Partial<Post>): Promise<Post> => {
    const response: AxiosResponse<Post> = await apiClient.put(`/posts/${id}`, post);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/posts/${id}`);
  },
};

// Utility functions
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('access_token');
  const isAuth = localStorage.getItem('isAuthenticated') === 'true';
  return !!(token && isAuth);
};

export const getCurrentUserFromStorage = (): User | null => {
  const userStr = localStorage.getItem('currentUser');
  if (userStr) {
    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }
  return null;
};

// Analytics API
export const analyticsAPI = {
  trackPageView: async (pagePath: string, referrer?: string): Promise<void> => {
    await apiClient.post('/analytics/page-view', {
      page_path: pagePath,
      referrer: referrer || document.referrer,
      session_id: getSessionId()
    });
  },

  logActivity: async (
    activityType: string, 
    description: string, 
    entityType?: string, 
    entityId?: number,
    extraData?: any
  ): Promise<void> => {
    await apiClient.post('/analytics/activity', {
      activity_type: activityType,
      description,
      entity_type: entityType,
      entity_id: entityId,
      extra_data: extraData
    });
  },

  getDashboardStats: async (days: number = 30): Promise<DashboardStats> => {
    const response = await apiClient.get(`/analytics/dashboard-stats?days=${days}`);
    return response.data;
  },

  getRecentActivities: async (limit: number = 10): Promise<ActivityItem[]> => {
    try {
      // Try authenticated endpoint first
      const response = await apiClient.get(`/activity-logs/?limit=${limit}&days=7`);
      // Handle both array and object with 'value' key
      const logs = Array.isArray(response.data) ? response.data : (response.data.value || []);
      return transformActivityLogs(logs);
    } catch (error) {
      try {
        // Fallback to public endpoint
        const response = await apiClient.get(`/activity-logs/public?limit=${limit}&days=7&tenant_id=1`);
        const logs = Array.isArray(response.data) ? response.data : (response.data.value || []);
        return transformActivityLogs(logs);
      } catch (publicError) {
        console.warn('Activity logs API not available, using mock data');
        return getMockActivities(limit);
      }
    }
  },

  getAllActivities: async (limit: number = 50, days: number = 30): Promise<ActivityItem[]> => {
    try {
      // Try authenticated endpoint first
      const response = await apiClient.get(`/activity-logs/?limit=${limit}&days=${days}`);
      // Handle both array and object with 'value' key
      const logs = Array.isArray(response.data) ? response.data : (response.data.value || []);
      return transformActivityLogs(logs);
    } catch (error) {
      try {
        // Fallback to public endpoint
        const response = await apiClient.get(`/activity-logs/public?limit=${limit}&days=${days}&tenant_id=1`);
        const logs = Array.isArray(response.data) ? response.data : (response.data.value || []);
        return transformActivityLogs(logs);
      } catch (publicError) {
        return getMockActivities(limit);
      }
    }
  }
};

// Helper function to get or create session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem('session_id', sessionId);
  }
  return sessionId;
};

// Helper function to transform activity logs from backend
const transformActivityLogs = (logs: any[]): ActivityItem[] => {
  // Filter out analytics_event activities
  const filteredLogs = logs.filter(log => log.activity_type !== 'analytics_event');
  
  return filteredLogs.map(log => {
    const details = log.details || {};
    const activityType = log.activity_type;
    const username = details.username || 'System User';

    // Parse created_at - backend sends UTC time
    // If it doesn't have 'Z' suffix, add it to indicate UTC
    let createdAtStr = log.created_at;
    if (!createdAtStr.endsWith('Z') && !createdAtStr.includes('+')) {
      createdAtStr += 'Z';
    }
    const createdAt = new Date(createdAtStr);

    // Calculate relative time
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    let timeAgo: string;
    if (diffMinutes < 1) {
      timeAgo = 'Just now';
    } else if (diffMinutes < 60) {
      timeAgo = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 30) {
      timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      timeAgo = createdAt.toLocaleDateString();
    }

    // Generate activity text based on type
    let text = details.message || `${activityType.replace('_', ' ')} performed`;
    let icon = 'fas fa-info-circle';
    let iconBg = '#f3f4f6';
    let iconColor = '#6b7280';

    // Customize based on activity type
    switch (activityType) {
      case 'create_feature':
        text = details.message || `New feature "${details.feature_name || 'Unknown'}" was added`;
        icon = 'fas fa-plus';
        iconBg = '#eff6ff';
        iconColor = '#2563eb';
        break;
      case 'update_feature':
        text = details.message || `Feature "${details.feature_name || 'Unknown'}" was updated`;
        icon = 'fas fa-edit';
        iconBg = '#f0fdf4';
        iconColor = '#16a34a';
        break;
      case 'delete_feature':
        text = details.message || `Feature "${details.feature_name || 'Unknown'}" was deleted`;
        icon = 'fas fa-trash';
        iconBg = '#fef2f2';
        iconColor = '#dc2626';
        break;
      case 'create_category':
        text = details.message || `New category "${details.category_slug || 'Unknown'}" was created`;
        icon = 'fas fa-folder-plus';
        iconBg = '#eff6ff';
        iconColor = '#2563eb';
        break;
      case 'update_category':
        text = details.message || `Category "${details.category_slug || 'Unknown'}" was updated`;
        icon = 'fas fa-folder-open';
        iconBg = '#f0fdf4';
        iconColor = '#16a34a';
        break;
      case 'delete_category':
        text = details.message || `Category "${details.category_slug || 'Unknown'}" was deleted`;
        icon = 'fas fa-trash';
        iconBg = '#fef2f2';
        iconColor = '#dc2626';
        break;
      case 'create_post':
        text = details.message || `New post "${details.post_in?.title || details.post_title || 'Unknown'}" was created`;
        icon = 'fas fa-file-alt';
        iconBg = '#eff6ff';
        iconColor = '#2563eb';
        break;
      case 'update_post':
        text = details.message || `Post "${details.post_in?.title || details.post_title || 'Unknown'}" was updated`;
        icon = 'fas fa-edit';
        iconBg = '#f0fdf4';
        iconColor = '#16a34a';
        break;
      case 'delete_post':
        text = details.message || `Post "${details.post_title || 'Unknown'}" was deleted`;
        icon = 'fas fa-trash';
        iconBg = '#fef2f2';
        iconColor = '#dc2626';
        break;
      case 'publish_post':
        text = details.message || `Post "${details.post_title || 'Unknown'}" was published`;
        icon = 'fas fa-bullhorn';
        iconBg = '#f0fdf4';
        iconColor = '#16a34a';
        break;
      case 'create_property':
        text = details.message || `New property "${details.property_name || 'Unknown'}" was created`;
        icon = 'fas fa-building';
        iconBg = '#eff6ff';
        iconColor = '#2563eb';
        break;
      case 'update_property':
        text = details.message || `Property "${details.property_name || 'Unknown'}" was updated`;
        icon = 'fas fa-edit';
        iconBg = '#f0fdf4';
        iconColor = '#16a34a';
        break;
      case 'delete_property':
        text = details.message || `Property was deleted`;
        icon = 'fas fa-trash';
        iconBg = '#fef2f2';
        iconColor = '#dc2626';
        break;
      case 'create_user':
        text = details.message || `New user "${details.user_email || 'Unknown'}" was created`;
        icon = 'fas fa-user-plus';
        iconBg = '#eff6ff';
        iconColor = '#2563eb';
        break;
      case 'update_user':
        text = details.message || `User "${details.user_email || 'Unknown'}" was updated`;
        icon = 'fas fa-user-edit';
        iconBg = '#f0fdf4';
        iconColor = '#16a34a';
        break;
      case 'delete_user':
        text = details.message || `User was deleted`;
        icon = 'fas fa-user-times';
        iconBg = '#fef2f2';
        iconColor = '#dc2626';
        break;
      case 'upload_media':
        text = details.message || `New media "${details.filename || 'file'}" was uploaded`;
        icon = 'fas fa-upload';
        iconBg = '#f0f9ff';
        iconColor = '#0369a1';
        break;
      case 'login':
        const loginIP = details.ip_address || log.ip_address;
        text = details.message || `User logged in${loginIP ? ` from ${loginIP}` : ''}`;
        icon = 'fas fa-sign-in-alt';
        iconBg = '#f0fdf4';
        iconColor = '#16a34a';
        break;
      case 'logout':
        const logoutIP = details.ip_address || log.ip_address;
        text = details.message || `User logged out${logoutIP ? ` from ${logoutIP}` : ''}`;
        icon = 'fas fa-sign-out-alt';
        iconBg = '#fef3c7';
        iconColor = '#d97706';
        break;
      default:
        // Use message from backend if available
        text = details.message || `Activity: ${activityType}`;
        icon = 'fas fa-info-circle';
        iconBg = '#f3f4f6';
        iconColor = '#6b7280';
    }

    return {
      id: log.id.toString(),
      type: activityType,
      text,
      time: timeAgo,
      user_name: username,
      icon,
      iconBg,
      iconColor,
      ip_address: details.ip_address || log.ip_address || undefined,
    };
  });
};

// Mock activities for fallback
const getMockActivities = (limit: number): ActivityItem[] => {
  const mockActivities: ActivityItem[] = [
    {
      id: "1",
      type: "login",
      text: 'User logged in from 192.168.1.100',
      time: "30 minutes ago",
      user_name: "Admin User",
      icon: "fas fa-sign-in-alt",
      iconBg: "#f0fdf4",
      iconColor: "#16a34a",
      ip_address: "192.168.1.100",
    },
    {
      id: "2",
      type: "create_feature",
      text: 'New feature "WiFi Information" was added to Services category',
      time: "2 hours ago",
      user_name: "Admin User",
      icon: "fas fa-plus",
      iconBg: "#eff6ff",
      iconColor: "#2563eb",
    },
    {
      id: "3",
      type: "logout",
      text: 'User logged out from 192.168.1.100',
      time: "3 hours ago",
      user_name: "Editor User",
      icon: "fas fa-sign-out-alt",
      iconBg: "#fef3c7",
      iconColor: "#d97706",
      ip_address: "192.168.1.100",
    },
    {
      id: "4",
      type: "update_category",
      text: 'Category "Services" was updated with new translations',
      time: "4 hours ago",
      user_name: "Editor User",
      icon: "fas fa-edit",
      iconBg: "#f0fdf4",
      iconColor: "#16a34a",
    },
    {
      id: "5",
      type: "create_post",
      text: 'New post "Hotel Amenities Guide" was created',
      time: "1 day ago",
      user_name: "Content Manager",
      icon: "fas fa-file-alt",
      iconBg: "#eff6ff",
      iconColor: "#2563eb",
    },
    {
      id: "6",
      type: "login",
      text: 'User logged in from 203.162.4.191',
      time: "1 day ago",
      user_name: "Content Manager",
      icon: "fas fa-sign-in-alt",
      iconBg: "#f0fdf4",
      iconColor: "#16a34a",
      ip_address: "203.162.4.191",
    },
    {
      id: "7",
      type: "upload_media",
      text: 'New image "hotel-lobby.jpg" was uploaded',
      time: "2 days ago",
      user_name: "Editor User",
      icon: "fas fa-upload",
      iconBg: "#f0f9ff",
      iconColor: "#0369a1",
    },
    {
      id: "8",
      type: "publish_post",
      text: 'Post "Welcome to our hotel" was published',
      time: "3 days ago",
      user_name: "Admin User",
      icon: "fas fa-bullhorn",
      iconBg: "#f0fdf4",
      iconColor: "#16a34a",
    }
  ];

  return mockActivities.slice(0, limit);
};

// Default export
export default apiClient;

import {
  faBuilding,
  faCode,
  faGlobe,
  faLanguage,
  faRotate,
  faSave,
  faShieldAlt,
  faSpinner,
  faToggleOff,
  faToggleOn,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import type { TenantSettings } from '../../services/tenantApi';
import { tenantApi } from '../../services/tenantApi';

type TenantFormState = {
  name: string;
  code: string;
  default_locale: string;
  fallback_locale: string;
  is_active: boolean;
};

const LOCALE_OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Ti\u1ebfng Vi\u1ec7t' },
  { code: 'zh', name: '\u4e2d\u6587' },
  { code: 'ja', name: '\u65e5\u672c\u8a9e' },
  { code: 'ko', name: '\ud55c\uad6d\uc5b4' },
  { code: 'fr', name: 'Fran\u00e7ais' },
  { code: 'de', name: 'Deutsch' },
  { code: 'es', name: 'Espa\u00f1ol' },
];

const EMPTY_FORM: TenantFormState = {
  name: '',
  code: '',
  default_locale: 'en',
  fallback_locale: 'en',
  is_active: true,
};

const RestaurantTenants: React.FC = () => {
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [formData, setFormData] = useState<TenantFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const currentTenantCode = localStorage.getItem('tenant_code') || '';

  const isDirty = useMemo(() => {
    if (!settings) return false;

    return (
      (formData.name || '') !== (settings.name || '') ||
      (formData.code || '') !== (settings.code || '') ||
      formData.default_locale !== (settings.default_locale || 'en') ||
      formData.fallback_locale !== (settings.fallback_locale || 'en') ||
      formData.is_active !== (settings.is_active ?? true)
    );
  }, [formData, settings]);

  const syncLocalTenantContext = (tenantData: TenantSettings) => {
    localStorage.setItem('tenant_code', tenantData.code);
    localStorage.setItem('tenant_name', tenantData.name || tenantData.code);
    localStorage.setItem('tenant_id', String(tenantData.id));
  };

  const loadTenantSettings = async (showRefreshToast = false) => {
    const token = localStorage.getItem('access_token');
    const isAuth = localStorage.getItem('isAuthenticated') === 'true';
    const tenantCode = localStorage.getItem('tenant_code');

    if (!token || !isAuth || !tenantCode) {
      toast.error('Please login to view tenant settings');
      setLoading(false);
      return;
    }

    try {
      if (loading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const response = await tenantApi.getCurrentTenant();
      const tenantData = response.data;

      setSettings(tenantData);
      setFormData({
        name: tenantData.name || '',
        code: tenantData.code || tenantCode,
        default_locale: tenantData.default_locale || 'en',
        fallback_locale: tenantData.fallback_locale || 'en',
        is_active: tenantData.is_active ?? true,
      });

      syncLocalTenantContext(tenantData);

      if (showRefreshToast) {
        toast.success('Tenant settings refreshed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to load tenant settings';
      toast.error(errorMessage);
      setSettings(null);
      setFormData({
        ...EMPTY_FORM,
        code: currentTenantCode,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleInputChange = <K extends keyof TenantFormState>(field: K, value: TenantFormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await tenantApi.updateCurrentTenant(formData);
      const tenantData = response.data;
      setSettings(tenantData);
      setFormData({
        name: tenantData.name || '',
        code: tenantData.code || '',
        default_locale: tenantData.default_locale || 'en',
        fallback_locale: tenantData.fallback_locale || 'en',
        is_active: tenantData.is_active ?? true,
      });
      syncLocalTenantContext(tenantData);
      toast.success('Tenant settings updated successfully');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update tenant settings';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadTenantSettings();
  }, []);

  useEffect(() => {
    const handleAuthChange = () => {
      loadTenantSettings();
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'tenant_code' || event.key === 'tenant_id') {
        loadTenantSettings();
      }
    };

    window.addEventListener('authStateChanged', handleAuthChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('authStateChanged', handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center text-slate-600">
          <FontAwesomeIcon icon={faSpinner} spin className="mb-3 text-2xl text-blue-600" />
          <p className="text-base font-semibold">Loading tenant settings...</p>
          <p className="mt-1 text-sm text-slate-500">We are pulling the latest tenant information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Tenant Settings</h2>
            <p className="mt-1 text-sm text-slate-500">Manage your organization identity, language defaults, and tenant status.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => loadTenantSettings(true)}
              disabled={refreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              <FontAwesomeIcon icon={refreshing ? faSpinner : faRotate} spin={refreshing} />
              Refresh
            </button>
            <Link
              to="/park/settings"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-700 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              <FontAwesomeIcon icon={faGlobe} />
              Park Settings
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
            <div className="mb-5 flex items-center gap-3 text-lg font-semibold text-slate-900">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm">
                <FontAwesomeIcon icon={faBuilding} />
              </div>
              <span>Basic Information</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Organization Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter organization name"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  <FontAwesomeIcon icon={faCode} className="mr-2 text-slate-500" />
                  Tenant Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter tenant code"
                />
                <p className="mt-1.5 text-xs text-slate-500">Used for API access and domain identification.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
            <div className="mb-5 flex items-center gap-3 text-lg font-semibold text-slate-900">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-sm">
                <FontAwesomeIcon icon={faLanguage} />
              </div>
              <span>Localization Settings</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Default Language</label>
                <select
                  value={formData.default_locale}
                  onChange={(e) => handleInputChange('default_locale', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LOCALE_OPTIONS.map((locale) => (
                    <option key={locale.code} value={locale.code}>
                      {locale.name} ({locale.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Fallback Language</label>
                <select
                  value={formData.fallback_locale}
                  onChange={(e) => handleInputChange('fallback_locale', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LOCALE_OPTIONS.map((locale) => (
                    <option key={locale.code} value={locale.code}>
                      {locale.name} ({locale.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
            <div className="mb-5 flex items-center gap-3 text-lg font-semibold text-slate-900">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-sm">
                <FontAwesomeIcon icon={faShieldAlt} />
              </div>
              <span>Status & Information</span>
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Active Status</h3>
                  <p className="mt-1 text-sm text-slate-500">Enable or disable this tenant for system access.</p>
                </div>
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => handleInputChange('is_active', !formData.is_active)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      formData.is_active
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={formData.is_active ? faToggleOn : faToggleOff}
                      className={formData.is_active ? 'text-emerald-600' : 'text-slate-500'}
                    />
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-slate-500">ID:</span>
                    <span className="ml-2 text-slate-900">{settings?.id ?? '--'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500">Current Code:</span>
                    <span className="ml-2 text-slate-900">{settings?.code || currentTenantCode || '--'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500">Created:</span>
                    <span className="ml-2 text-slate-900">{settings?.created_at ? new Date(settings.created_at).toLocaleDateString() : '--'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500">Updated:</span>
                    <span className="ml-2 text-slate-900">{settings?.updated_at ? new Date(settings.updated_at).toLocaleDateString() : '--'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500">Plan ID:</span>
                    <span className="ml-2 text-slate-900">{settings?.plan_id ?? '--'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <Link
            to="/park/settings"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-6 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Back to Settings
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            <FontAwesomeIcon icon={saving ? faSpinner : faSave} spin={saving} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default RestaurantTenants;


import { faCheck, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { cafeLanguagesApi, cafeSettingsApi } from '../../services/restaurantApi';

// CSS Class Constants
const SECTION_CLASS = 'rounded-xl border border-slate-200 bg-white p-6';
const LABEL_CLASS = 'mb-2 block text-sm font-medium text-slate-700';
const SELECT_CLASS = 'w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm';

// Language definitions
const LANGUAGES = [
  { code: 'ar', flag: '🇸🇦', name: 'Arabic', nativeName: 'العربية' },
  { code: 'de', flag: '🇩🇪', name: 'German', nativeName: 'Deutsch' },
  { code: 'en', flag: '🇬🇧', name: 'English', nativeName: 'English' },
  { code: 'es', flag: '🇪🇸', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'French', nativeName: 'Français' },
  { code: 'hi', flag: '🇮🇳', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'id', flag: '🇮🇩', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'it', flag: '🇮🇹', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', flag: '🇯🇵', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', flag: '🇰🇷', name: 'Korean', nativeName: '한국어' },
  { code: 'ms', flag: '🇲🇾', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'pt', flag: '🌐', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', flag: '🇷🇺', name: 'Russian', nativeName: 'Русский' },
  { code: 'ta', flag: '🇮🇳', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'th', flag: '🇹🇭', name: 'Thai', nativeName: 'ภาษาไทย' },
  { code: 'tl', flag: '🇵🇭', name: 'Filipino (Tagalog)', nativeName: 'Tagalog' },
  { code: 'vi', flag: '🇻🇳', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'yue', flag: '🇭🇰', name: 'Cantonese', nativeName: '粵語' },
  { code: 'zh', flag: '🇨🇳', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', flag: '🇹🇼', name: 'Chinese (Traditional)', nativeName: '中文（繁體）' },
];

const TIMEZONES = [
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (GMT+9)' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho Chi Minh (GMT+7)' },
  { value: 'Asia/Seoul', label: 'Asia/Seoul (GMT+9)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (GMT+8)' },
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'America/New_York', label: 'America/New York (GMT-5)' },
  { value: 'Europe/London', label: 'Europe/London (GMT+0)' },
];

const DATE_FORMATS = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-03-15)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (15/03/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (03/15/2024)' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (15-03-2024)' },
];

interface LanguageSettings {
  default_language: string;
  fallback_language: string;
  supported_languages: string[];
  timezone: string;
  date_format: string;
}

const RestaurantLanguages: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [settings, setSettings] = useState<LanguageSettings>({
    default_language: 'en',
    fallback_language: 'en',
    supported_languages: ['en', 'vi'],
    timezone: 'Asia/Ho_Chi_Minh',
    date_format: 'YYYY-MM-DD',
  });

  const [originalSettings, setOriginalSettings] = useState<LanguageSettings>(settings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Load languages from dedicated API
      const languages = await cafeLanguagesApi.getLanguages();
      const supportedLanguages = languages.map(lang => lang.locale);
      const defaultLanguage = languages.find(lang => lang.is_default)?.locale || 'en';
      
      // Load regional settings from general settings
      const cafeSettings = await cafeSettingsApi.getSettings();

      const loadedSettings: LanguageSettings = {
        default_language: defaultLanguage,
        fallback_language: cafeSettings.settings_json?.fallback_language || defaultLanguage,
        supported_languages: supportedLanguages,
        timezone: cafeSettings.settings_json?.timezone || 'Asia/Ho_Chi_Minh',
        date_format: cafeSettings.settings_json?.date_format || 'YYYY-MM-DD',
      };

      setSettings(loadedSettings);
      setOriginalSettings(loadedSettings);
      setHasChanges(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to load language settings');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = useCallback((field: keyof LanguageSettings, value: any) => {
    // Update local state for all fields
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const toggleLanguage = useCallback((code: string) => {
    const isSelected = settings.supported_languages.includes(code);
    
    if (isSelected) {
      if (settings.supported_languages.length <= 1) {
        toast.error('At least one language is required');
        return;
      }

      const nextLanguages = settings.supported_languages.filter(lang => lang !== code);

      // Remove from local state
      setSettings(prev => {
        const nextDefault = prev.default_language === code ? nextLanguages[0] : prev.default_language;
        const nextFallback = prev.fallback_language === code ? nextDefault : prev.fallback_language;

        return {
          ...prev,
          default_language: nextDefault,
          fallback_language: nextFallback,
          supported_languages: nextLanguages,
        };
      });
    } else {
      // Add to local state
      setSettings(prev => ({
        ...prev,
        supported_languages: [...prev.supported_languages, code]
      }));
    }
    
    setHasChanges(true);
  }, [settings.supported_languages]);

  const handleSave = async () => {
    try {
      setSaving(true);

      // Save all settings at once
      // 1. Update supported languages
      const languagesToAdd = settings.supported_languages.filter(
        lang => !originalSettings.supported_languages.includes(lang)
      );
      const languagesToRemove = originalSettings.supported_languages.filter(
        lang => !settings.supported_languages.includes(lang)
      );

      // Add new languages
      for (const lang of languagesToAdd) {
        await cafeLanguagesApi.addLanguage(lang);
      }

      // Remove languages
      for (const lang of languagesToRemove) {
        await cafeLanguagesApi.removeLanguage(lang);
      }

      // 2. Update default language if changed
      if (settings.default_language !== originalSettings.default_language) {
        await cafeLanguagesApi.setDefaultLanguage(settings.default_language);
      }

      // 3. Update regional settings and fallback language only if changed
      if (settings.timezone !== originalSettings.timezone || 
          settings.date_format !== originalSettings.date_format ||
          settings.fallback_language !== originalSettings.fallback_language) {
        const currentData = await cafeSettingsApi.getSettings();
        const existingJson = currentData.settings_json || {};
        
        await cafeSettingsApi.updateSettings({
          settings_json: {
            ...existingJson,
            timezone: settings.timezone,
            date_format: settings.date_format,
            fallback_language: settings.fallback_language,
          },
        });
      }

      setOriginalSettings(settings);
      setHasChanges(false);
      window.dispatchEvent(new CustomEvent('restaurant-languages-updated', {
        detail: {
          supportedLanguages: settings.supported_languages,
          defaultLanguage: settings.default_language,
        }
      }));
      toast.success('Settings saved successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
      // Reload settings on error to reset to server state
      await loadSettings();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading language settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Language Settings */}
      <div className={SECTION_CLASS}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-lg font-semibold text-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white">
              <FontAwesomeIcon icon={faGlobe} />
            </div>
            Language Settings
          </div>
        </div>

        <p className="mb-5 text-sm text-slate-500">
          Configure supported languages for your property. Select languages you want to provide content in.
        </p>

        {/* Default Language */}
        <div className="mb-5">
          <label className={LABEL_CLASS}>Default Language</label>
          <select
            className={SELECT_CLASS}
            value={settings.default_language}
            onChange={(e) => handleFieldChange('default_language', e.target.value)}
          >
            {LANGUAGES.filter(lang => settings.supported_languages.includes(lang.code)).map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Primary language for your property content
          </p>
        </div>

        {/* Fallback Language */}
        <div className="mb-5">
          <label className={LABEL_CLASS}>Fallback Language</label>
          <select
            className={SELECT_CLASS}
            value={settings.fallback_language}
            onChange={(e) => handleFieldChange('fallback_language', e.target.value)}
          >
            {LANGUAGES.filter(lang => settings.supported_languages.includes(lang.code)).map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Language to use when content is not available in the requested language
          </p>
        </div>

        {/* Supported Languages */}
        <div className="mb-5">
          <label className={LABEL_CLASS}>
            Supported Languages
            <span className="ml-2 text-xs font-normal text-slate-500">({LANGUAGES.length} available)</span>
          </label>
          <p className="mb-3 text-xs text-slate-500">
            Select languages to support. Only selected languages will appear in translation modals.
          </p>

          <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            {LANGUAGES.map((lang) => {
              const isSelected = settings.supported_languages.includes(lang.code);

              return (
                <div
                  key={lang.code}
                  onClick={() => toggleLanguage(lang.code)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-500 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex h-5 w-6 items-center justify-center rounded-sm bg-slate-200 text-xs">
                      {lang.flag}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-slate-900">{lang.name}</h4>
                      </div>
                      <div className="text-xs text-slate-500">{lang.nativeName}</div>
                    </div>
                  </div>
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-sm border-2 transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 text-transparent'
                    }`}
                  >
                    <FontAwesomeIcon icon={faCheck} className="text-xs" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 mt-6">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Regional Settings */}
      <div className={SECTION_CLASS}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-lg font-semibold text-slate-900">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white">
              <FontAwesomeIcon icon={faGlobe} />
            </div>
            Regional Settings
          </div>
        </div>

        <p className="mb-5 text-sm text-slate-500">
          Configure timezone and regional display preferences for your amusement park.
        </p>

        {/* Timezone */}
        <div className="mb-5">
          <label className={LABEL_CLASS}>Timezone</label>
          <select
            className={SELECT_CLASS}
            value={settings.timezone}
            onChange={(e) => handleFieldChange('timezone', e.target.value)}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Format */}
        <div className="mb-5">
          <label className={LABEL_CLASS}>Date Format</label>
          <select
            className={SELECT_CLASS}
            value={settings.date_format}
            onChange={(e) => handleFieldChange('date_format', e.target.value)}
          >
            {DATE_FORMATS.map((fmt) => (
              <option key={fmt.value} value={fmt.value}>
                {fmt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 mt-6">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantLanguages;




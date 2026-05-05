import { faImage, faPhotoFilm, faStar, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import MediaPickerModal from '../../components/MediaPickerModal';
import { restaurantSettingsApi, type RestaurantSettings } from '../../services/restaurantApi';
import { getApiBaseUrl } from '../../utils/api';

const RestaurantSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState({
    primaryColor: '#8eb18e',
    backgroundColor: '#ffffff',
    bookingUrl: '',
    messengerUrl: '',
    phoneNumber: '',
    metaTitle: '',
    metaDescription: '',
    keywords: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logoMediaId, setLogoMediaId] = useState<number | null>(null);
  const [faviconMediaId, setFaviconMediaId] = useState<number | null>(null);
  const [metaImageMediaId, setMetaImageMediaId] = useState<number | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [faviconUrl, setFaviconUrl] = useState<string>('');
  const [metaImageUrl, setMetaImageUrl] = useState<string>('');
  
  // Media picker modal state
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [currentMediaPicker, setCurrentMediaPicker] = useState<'logo' | 'favicon' | 'meta_image' | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const data = await restaurantSettingsApi.getSettings();
      
      // Map API response to local state
      setSettings({
        primaryColor: data.primary_color || '#8eb18e',
        backgroundColor: data.background_color || '#ffffff',
        bookingUrl: data.booking_url || '',
        messengerUrl: data.messenger_url || '',
        phoneNumber: data.phone_number || '',
        metaTitle: data.meta_title || '',
        metaDescription: data.meta_description || '',
        keywords: data.meta_keywords || '',
      });
      
      // Set or clear logo
      if (data.logo_media_id) {
        setLogoMediaId(data.logo_media_id);
        const API_BASE_URL = getApiBaseUrl();
        setLogoUrl(`${API_BASE_URL}/media/${data.logo_media_id}/view`);
      } else {
        setLogoMediaId(null);
        setLogoUrl('');
      }
      
      // Set or clear favicon
      if (data.favicon_media_id) {
        setFaviconMediaId(data.favicon_media_id);
        const API_BASE_URL = getApiBaseUrl();
        setFaviconUrl(`${API_BASE_URL}/media/${data.favicon_media_id}/view`);
      } else {
        setFaviconMediaId(null);
        setFaviconUrl('');
      }
      
      // Set or clear meta image for SEO
      if (data.meta_image_media_id) {
        setMetaImageMediaId(data.meta_image_media_id);
        const API_BASE_URL = getApiBaseUrl();
        setMetaImageUrl(`${API_BASE_URL}/media/${data.meta_image_media_id}/view`);
      } else {
        setMetaImageMediaId(null);
        setMetaImageUrl('');
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      toast.error(error.response?.data?.detail || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleRemoveLogo = async () => {
    if (!logoMediaId) return;
    
    try {
      await restaurantSettingsApi.updateSettings({ logo_media_id: null });
      
      setLogoMediaId(null);
      setLogoUrl('');
      
      toast.success('Logo removed successfully');
    } catch (error: any) {
      console.error('Failed to remove logo:', error);
      toast.error('Failed to remove logo');
    }
  };

  const handleRemoveFavicon = async () => {
    if (!faviconMediaId) return;
    
    try {
      await restaurantSettingsApi.updateSettings({ favicon_media_id: null });
      
      setFaviconMediaId(null);
      setFaviconUrl('');
      
      toast.success('Favicon removed successfully');
    } catch (error: any) {
      console.error('Failed to remove favicon:', error);
      toast.error('Failed to remove favicon');
    }
  };

  const handleRemoveMetaImage = async () => {
    if (!metaImageMediaId) return;
    
    try {
      await restaurantSettingsApi.updateSettings({ meta_image_media_id: null });
      
      setMetaImageMediaId(null);
      setMetaImageUrl('');
      
      toast.success('Meta image removed successfully');
    } catch (error: any) {
      console.error('Failed to remove meta image:', error);
      toast.error('Failed to remove meta image');
    }
  };

  // Media picker handlers
  const openMediaPicker = (type: 'logo' | 'favicon' | 'meta_image') => {
    setCurrentMediaPicker(type);
    setMediaPickerOpen(true);
  };

  const handleMediaSelect = async (mediaId: number, mediaUrl: string) => {
    try {
      if (currentMediaPicker === 'logo') {
        setLogoMediaId(mediaId);
        setLogoUrl(mediaUrl);
        await restaurantSettingsApi.updateSettings({ logo_media_id: mediaId });
        toast.success('Logo updated successfully');
      } else if (currentMediaPicker === 'favicon') {
        setFaviconMediaId(mediaId);
        setFaviconUrl(mediaUrl);
        await restaurantSettingsApi.updateSettings({ favicon_media_id: mediaId });
        toast.success('Favicon updated successfully');
      } else if (currentMediaPicker === 'meta_image') {
        setMetaImageMediaId(mediaId);
        setMetaImageUrl(mediaUrl);
        await restaurantSettingsApi.updateSettings({ meta_image_media_id: mediaId });
        toast.success('Meta image updated successfully');
      }
    } catch (error: any) {
      console.error('Failed to update media:', error);
      toast.error('Failed to update image');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      
      // Map local state to API format
      const updateData: Partial<RestaurantSettings> = {
        primary_color: settings.primaryColor,
        background_color: settings.backgroundColor,
        booking_url: settings.bookingUrl.trim() === '' ? null : settings.bookingUrl,
        messenger_url: settings.messengerUrl.trim() === '' ? null : settings.messengerUrl,
        phone_number: settings.phoneNumber.trim() === '' ? null : settings.phoneNumber,
        logo_media_id: logoMediaId,
        favicon_media_id: faviconMediaId,
        meta_image_media_id: metaImageMediaId,
        meta_title: settings.metaTitle.trim() === '' ? null : settings.metaTitle,
        meta_description: settings.metaDescription.trim() === '' ? null : settings.metaDescription,
        meta_keywords: settings.keywords.trim() === '' ? null : settings.keywords,
      };
      
      await restaurantSettingsApi.updateSettings(updateData);
      toast.success('Settings saved successfully!');
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreDefaults = async () => {
    if (confirm('Are you sure you want to restore default settings?')) {
      try {
        setIsSaving(true);
        // Reset to default values
        const defaultData: Partial<RestaurantSettings> = {
          primary_color: '#8eb18e',
          background_color: '#ffffff',
          booking_url: null,
          messenger_url: null,
          phone_number: null,
          logo_media_id: null,
          favicon_media_id: null,
          meta_image_media_id: null,
          meta_title: null,
          meta_description: null,
          meta_keywords: null,
        };
        await restaurantSettingsApi.updateSettings(defaultData);
        toast.success('Settings restored to defaults');
        await loadSettings(); // Reload to show defaults
      } catch (error: any) {
        console.error('Failed to restore defaults:', error);
        toast.error(error.response?.data?.detail || 'Failed to restore defaults');
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-600">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Logo & Branding */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Logo & Branding</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Restaurant Logo
            </label>
            <div className="flex items-center gap-4">
              {/* Logo Preview Box */}
              <div className="w-[120px] h-[120px] border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <FontAwesomeIcon icon={faImage} className="text-4xl text-slate-400" />
                )}
              </div>
              
              {/* Upload Controls */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openMediaPicker('logo')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faPhotoFilm} />
                    Select Image
                  </button>
                  {logoUrl && (
                    <button
                      onClick={() => handleRemoveLogo()}
                      className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Recommended: PNG with transparent background, size 400x400px
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Favicon
            </label>
            <div className="flex items-center gap-4">
              {/* Favicon Preview Box */}
              <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="Favicon" className="w-full h-full object-contain p-1" />
                ) : (
                  <FontAwesomeIcon icon={faStar} className="text-2xl text-slate-400" />
                )}
              </div>
              
              {/* Upload Controls */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openMediaPicker('favicon')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faPhotoFilm} />
                    Select Image
                  </button>
                  {faviconUrl && (
                    <button
                      onClick={() => handleRemoveFavicon()}
                      className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Recommended: ICO or PNG, size 32x32px
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                className="w-[60px] h-10 border border-slate-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={settings.primaryColor}
                readOnly
                className="w-[120px] px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-700 font-mono text-sm"
              />
              <span className="text-sm text-slate-500">
                This color will be used for buttons, links, highlights
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Background Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.backgroundColor}
                onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                className="w-[60px] h-10 border border-slate-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={settings.backgroundColor}
                readOnly
                className="w-[120px] px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-700 font-mono text-sm"
              />
              <span className="text-sm text-slate-500">
                This color will be used as the main background color
              </span>
            </div>
          </div>

          {/* Contact & Booking Section */}
          <div className="border-t border-slate-200 pt-6 mt-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Contact & Booking</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Booking URL
                </label>
                <input
                  type="url"
                  value={settings.bookingUrl}
                  onChange={(e) => handleInputChange('bookingUrl', e.target.value)}
                  placeholder="https://booking.example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-slate-500 mt-1">
                  URL to your table reservation system
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Messenger URL
                </label>
                <input
                  type="url"
                  value={settings.messengerUrl}
                  onChange={(e) => handleInputChange('messengerUrl', e.target.value)}
                  placeholder="https://m.me/yourpage"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-slate-500 mt-1">
                  Facebook Messenger link (m.me/yourpage)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Zalo OA ID / Phone Number
                </label>
                <input
                  type="text"
                  value={settings.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  placeholder="+84 123 456 789 or Zalo OA ID"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-slate-500 mt-1">
                  Phone number or Zalo Official Account ID
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEO Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6">SEO Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Meta Title
            </label>
            <input
              type="text"
              value={settings.metaTitle}
              onChange={(e) => handleInputChange('metaTitle', e.target.value)}
              maxLength={60}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              {settings.metaTitle.length}/60 characters - Displayed on Google search results
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Meta Description
            </label>
            <textarea
              value={settings.metaDescription}
              onChange={(e) => handleInputChange('metaDescription', e.target.value)}
              maxLength={160}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              {settings.metaDescription.length}/160 characters - Short description about the amusement park
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Keywords
            </label>
            <input
              type="text"
              value={settings.keywords}
              onChange={(e) => handleInputChange('keywords', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="keyword1, keyword2,..."
            />
            <p className="text-xs text-slate-500 mt-1">
              Keywords separated by commas
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Meta Image (Open Graph / Social Share)
            </label>
            <div className="flex items-start gap-4">
              {/* Meta Image Preview Box */}
              <div className="w-[200px] h-[120px] border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 flex-shrink-0">
                {metaImageUrl ? (
                  <img src={metaImageUrl} alt="Meta Image" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <FontAwesomeIcon icon={faImage} className="text-4xl text-slate-400" />
                )}
              </div>
              
              {/* Upload Controls */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openMediaPicker('meta_image')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faPhotoFilm} />
                    Select Image
                  </button>
                  {metaImageUrl && (
                    <button
                      onClick={() => handleRemoveMetaImage()}
                      className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Recommended: 1200x630px (Facebook, Twitter, LinkedIn)
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  This image will be displayed when sharing your amusement park website on social media platforms
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow p-6">
        <button
          onClick={handleRestoreDefaults}
          disabled={isSaving}
          className="px-6 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Processing...' : 'Restore Defaults'}
        </button>
        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => {
          setMediaPickerOpen(false);
          setCurrentMediaPicker(null);
        }}
        onSelect={handleMediaSelect}
        title={
          currentMediaPicker === 'logo' ? 'Select Logo' :
          currentMediaPicker === 'favicon' ? 'Select Favicon' :
          'Select Meta Image'
        }
        kind="image"
        source="restaurant"
        folder={currentMediaPicker === 'meta_image' ? 'seo' : 'settings'}
        maxFileSize={currentMediaPicker === 'favicon' ? 1 : 5}
      />
    </div>
  );
};

export default RestaurantSettingsPage;






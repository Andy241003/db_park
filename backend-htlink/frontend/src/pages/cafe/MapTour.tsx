import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import VR360SettingsSection from '../../components/VR360SettingsSection';
import { cafeSettingsApi } from '../../services/restaurantApi';

const convertToEmbedUrl = (url: string): string => {
  if (!url) return url;
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;
  const match = url.match(youtubeRegex);
  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : url;
};

const MapTourPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vr360Link, setVr360Link] = useState('');
  const [vrTitle, setVrTitle] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const settings = await cafeSettingsApi.getSettings();
        const settingsJson = settings.settings_json || {};
        setVr360Link(typeof settingsJson.map_tour_vr360_link === 'string' ? settingsJson.map_tour_vr360_link : '');
        setVrTitle(typeof settingsJson.map_tour_vr_title === 'string' ? settingsJson.map_tour_vr_title : '');
      } catch (error: any) {
        toast.error(error.message || 'Failed to load map & tour settings');
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const currentSettings = await cafeSettingsApi.getSettings();
      await cafeSettingsApi.updateSettings({
        settings_json: {
          ...(currentSettings.settings_json || {}),
          map_tour_vr360_link: convertToEmbedUrl(vr360Link),
          map_tour_vr_title: vrTitle,
        },
      });
      setVr360Link(convertToEmbedUrl(vr360Link));
      toast.success('Map & Tour settings saved');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save map & tour settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-slate-600">Loading map & tour...</div>;
  }

  return (
    <div className="space-y-6">
      <VR360SettingsSection
        linkValue={vr360Link}
        titleValue={vrTitle}
        onLinkChange={setVr360Link}
        onTitleChange={setVrTitle}
        disabled={saving}
        title="VR360 Settings"
        linkLabel="VR360 Tour Link"
        linkPlaceholder="https://example.com/vr360-tour or https://youtube.com/watch?v=..."
        helperText="Enter the VR URL for this map & tour item, if available."
        titleLabel="Map & Tour Title"
        titlePlaceholder="Enter map & tour title"
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-md bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default MapTourPage;

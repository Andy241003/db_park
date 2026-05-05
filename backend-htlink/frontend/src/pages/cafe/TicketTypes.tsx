import {
    faGripVertical,
    faImages,
    faMoneyBillWave,
    faPenToSquare,
    faPlus,
    faTrashCan,
    faXmark
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import MediaPickerModal from '../../components/MediaPickerModal';
import VR360SettingsSection from '../../components/VR360SettingsSection';
import {
    cafeLanguagesApi,
    cafeSettingsApi,
    cafeTicketTypesApi,
    type TicketType,
    type TicketTypeCreate,
    type TicketTypeTranslation,
} from '../../services/restaurantApi';
import { getApiBaseUrl } from '../../utils/api';

type TranslationDraft = {
  name: string;
  description: string;
  terms_and_conditions: string;
};

type TicketTypeDraft = {
  code: string;
  ticket_type: string;
  audience_type: string;
  validity_type: string;
  base_price: string;
  sale_price: string;
  currency_code: string;
  valid_from: string;
  valid_to: string;
  start_time: string;
  end_time: string;
  min_height_cm: string;
  max_height_cm: string;
  min_age: string;
  max_age: string;
  max_visits: string;
  is_active: boolean;
  is_featured: boolean;
  display_order: string;
  primary_image_media_id?: number;
  media_ids: number[];
  translations: Record<string, TranslationDraft>;
};

const TICKET_TYPES = ['admission', 'combo', 'fast_pass', 'vip', 'annual_pass', 'add_on'];
const AUDIENCE_TYPES = ['general', 'adult', 'child', 'senior', 'family', 'group', 'student'];
const VALIDITY_TYPES = ['single_day', 'date_range', 'time_slot', 'multi_visit', 'seasonal'];
const LABEL_CLASS = 'mb-2 block text-sm font-medium text-slate-700';
const FIELD_CLASS = 'w-full rounded-md border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500';
const SECTION_CLASS = 'rounded-lg bg-white p-6 shadow';

const createEmptyTranslation = (): TranslationDraft => ({
  name: '',
  description: '',
  terms_and_conditions: '',
});

const createEmptyDraft = (locales: string[]): TicketTypeDraft => ({
  code: '',
  ticket_type: 'admission',
  audience_type: 'general',
  validity_type: 'single_day',
  base_price: '',
  sale_price: '',
  currency_code: 'USD',
  valid_from: '',
  valid_to: '',
  start_time: '',
  end_time: '',
  min_height_cm: '',
  max_height_cm: '',
  min_age: '',
  max_age: '',
  max_visits: '',
  is_active: true,
  is_featured: false,
  display_order: '',
  primary_image_media_id: undefined,
  media_ids: [],
  translations: locales.reduce<Record<string, TranslationDraft>>((acc, locale) => {
    acc[locale] = createEmptyTranslation();
    return acc;
  }, {}),
});

const numberOrUndefined = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const convertToEmbedUrl = (url: string): string => {
  if (!url) return url;
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/;
  const match = url.match(youtubeRegex);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return url;
};

const TicketTypesPage: React.FC = () => {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [locales, setLocales] = useState<string[]>(['en']);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLocale, setActiveLocale] = useState('en');
  const [editingTicketType, setEditingTicketType] = useState<TicketType | null>(null);
  const [draft, setDraft] = useState<TicketTypeDraft>(() => createEmptyDraft(['en']));
  const [isDisplaying, setIsDisplaying] = useState(true);
  const [vr360Link, setVr360Link] = useState('');
  const [vrTitle, setVrTitle] = useState('');
  const [savingDisplayStatus, setSavingDisplayStatus] = useState(false);
  const [savingVR, setSavingVR] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'featured'>('all');
  const [mediaPickerVisible, setMediaPickerVisible] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ticketTypeData, languageCodes, settings] = await Promise.all([
        cafeTicketTypesApi.getTicketTypes().catch(() => []),
        cafeLanguagesApi.getLanguageCodes().catch(() => ['en']),
        cafeSettingsApi.getSettings().catch(() => ({ settings_json: {} })),
      ]);
      const nextLocales = languageCodes.length > 0 ? languageCodes : ['en'];
      setTicketTypes(ticketTypeData);
      setLocales(nextLocales);
      setActiveLocale(prev => nextLocales.includes(prev) ? prev : nextLocales[0]);
      setIsDisplaying(settings.settings_json?.ticket_types_is_displaying ?? true);
      setVr360Link(settings.settings_json?.ticket_types_vr360_link || '');
      setVrTitle(settings.settings_json?.ticket_types_vr_title || '');
    } catch (error) {
      console.error(error);
      toast.error('Failed to load ticket types');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingTicketType(null);
    setDraft(createEmptyDraft(locales));
    setActiveLocale(locales[0] || 'en');
    setIsModalOpen(true);
  };

  const openEdit = (ticketType: TicketType) => {
    const nextDraft = createEmptyDraft(locales);
    nextDraft.code = ticketType.code;
    nextDraft.ticket_type = ticketType.ticket_type || 'admission';
    nextDraft.audience_type = ticketType.audience_type || 'general';
    nextDraft.validity_type = ticketType.validity_type || 'single_day';
    nextDraft.base_price = ticketType.base_price != null ? String(ticketType.base_price) : '';
    nextDraft.sale_price = ticketType.sale_price != null ? String(ticketType.sale_price) : '';
    nextDraft.currency_code = ticketType.currency_code || 'USD';
    nextDraft.valid_from = ticketType.valid_from || '';
    nextDraft.valid_to = ticketType.valid_to || '';
    nextDraft.start_time = ticketType.start_time || '';
    nextDraft.end_time = ticketType.end_time || '';
    nextDraft.min_height_cm = ticketType.min_height_cm != null ? String(ticketType.min_height_cm) : '';
    nextDraft.max_height_cm = ticketType.max_height_cm != null ? String(ticketType.max_height_cm) : '';
    nextDraft.min_age = ticketType.min_age != null ? String(ticketType.min_age) : '';
    nextDraft.max_age = ticketType.max_age != null ? String(ticketType.max_age) : '';
    nextDraft.max_visits = ticketType.max_visits != null ? String(ticketType.max_visits) : '';
    nextDraft.is_active = ticketType.is_active;
    nextDraft.is_featured = ticketType.is_featured;
    nextDraft.display_order = String(ticketType.display_order ?? '');
    nextDraft.primary_image_media_id = ticketType.primary_image_media_id ?? ticketType.media?.[0]?.media_id;
    nextDraft.media_ids = ticketType.media?.map((item) => item.media_id) || [];

    ticketType.translations.forEach((translation) => {
      nextDraft.translations[translation.locale] = {
        name: translation.name || '',
        description: translation.description || '',
        terms_and_conditions: translation.terms_and_conditions || '',
      };
    });

    setEditingTicketType(ticketType);
    setDraft(nextDraft);
    setActiveLocale(locales[0] || 'en');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTicketType(null);
  };

  const updateDraft = <K extends keyof TicketTypeDraft>(key: K, value: TicketTypeDraft[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const updateTranslation = (locale: string, key: keyof TranslationDraft, value: string) => {
    setDraft(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [locale]: {
          ...(prev.translations[locale] || createEmptyTranslation()),
          [key]: value,
        },
      },
    }));
  };

  const handleMediaSelectedMultiple = (mediaIds: number[]) => {
    const dedupedMediaIds = Array.from(new Set(mediaIds));
    setDraft(prev => ({
      ...prev,
      media_ids: dedupedMediaIds,
      primary_image_media_id: prev.primary_image_media_id && dedupedMediaIds.includes(prev.primary_image_media_id)
        ? prev.primary_image_media_id
        : dedupedMediaIds[0],
    }));
    setMediaPickerVisible(false);
  };

  const handleRemoveMedia = (mediaId: number) => {
    setDraft(prev => {
      const nextMediaIds = prev.media_ids.filter((id) => id !== mediaId);
      return {
        ...prev,
        media_ids: nextMediaIds,
        primary_image_media_id: prev.primary_image_media_id === mediaId ? nextMediaIds[0] : prev.primary_image_media_id,
      };
    });
  };

  const handleSetPrimaryMedia = (mediaId: number) => {
    setDraft(prev => ({ ...prev, primary_image_media_id: mediaId }));
  };

  const currentTranslation = draft.translations[activeLocale] || createEmptyTranslation();

  const filteredTicketTypes = ticketTypes.filter((item) => {
    if (statusFilter === 'active') return item.is_active;
    if (statusFilter === 'inactive') return !item.is_active;
    if (statusFilter === 'featured') return item.is_featured;
    return true;
  });

  const primaryName = (ticketType: TicketType) =>
    ticketType.translations.find(translation => translation.locale === 'en')?.name ||
    ticketType.translations[0]?.name ||
    ticketType.code;

  const getPrimaryImageId = (ticketType: TicketType) =>
    ticketType.primary_image_media_id || ticketType.media?.[0]?.media_id;

  const buildPayload = (): TicketTypeCreate | null => {
    const translations: TicketTypeTranslation[] = locales
      .map((locale) => ({
        locale,
        ...draft.translations[locale],
      }))
      .filter((translation) => translation.name.trim().length > 0);

    if (!draft.code.trim()) {
      toast.error('Code is required');
      return null;
    }

    if (translations.length === 0) {
      toast.error('At least one translation name is required');
      return null;
    }

    return {
      code: draft.code.trim(),
      ticket_type: draft.ticket_type,
      audience_type: draft.audience_type || null,
      validity_type: draft.validity_type || null,
      base_price: numberOrUndefined(draft.base_price) ?? null,
      sale_price: numberOrUndefined(draft.sale_price) ?? null,
      currency_code: draft.currency_code.trim() || 'USD',
      valid_from: draft.valid_from || null,
      valid_to: draft.valid_to || null,
      start_time: draft.start_time || null,
      end_time: draft.end_time || null,
      min_height_cm: numberOrUndefined(draft.min_height_cm) ?? null,
      max_height_cm: numberOrUndefined(draft.max_height_cm) ?? null,
      min_age: numberOrUndefined(draft.min_age) ?? null,
      max_age: numberOrUndefined(draft.max_age) ?? null,
      max_visits: numberOrUndefined(draft.max_visits) ?? null,
      is_active: draft.is_active,
      is_featured: draft.is_featured,
      display_order: numberOrUndefined(draft.display_order) ?? 0,
      primary_image_media_id: draft.primary_image_media_id || draft.media_ids[0] || null,
      translations,
      media_ids: draft.media_ids,
    };
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;

    setIsSaving(true);
    try {
      if (editingTicketType) {
        await cafeTicketTypesApi.updateTicketType(editingTicketType.id, payload);
        toast.success('Ticket type updated');
      } else {
        await cafeTicketTypesApi.createTicketType(payload);
        toast.success('Ticket type created');
      }
      closeModal();
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save ticket type');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this ticket type?')) return;
    try {
      await cafeTicketTypesApi.deleteTicketType(id);
      toast.success('Ticket type deleted');
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete ticket type');
    }
  };

  const handleDisplayToggle = async (value: boolean) => {
    try {
      setSavingDisplayStatus(true);
      const currentSettings = await cafeSettingsApi.getSettings();
      await cafeSettingsApi.updateSettings({
        settings_json: {
          ...(currentSettings.settings_json || {}),
          ticket_types_is_displaying: value,
        },
      });
      setIsDisplaying(value);
      toast.success(value ? 'Ticket types section enabled' : 'Ticket types section hidden');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to update display status');
    } finally {
      setSavingDisplayStatus(false);
    }
  };

  const handleVR360Change = async (field: 'link' | 'title', value: string) => {
    try {
      setSavingVR(true);
      const currentSettings = await cafeSettingsApi.getSettings();
      const nextLink = field === 'link' ? convertToEmbedUrl(value) : vr360Link;
      const nextTitle = field === 'title' ? value : vrTitle;
      await cafeSettingsApi.updateSettings({
        settings_json: {
          ...(currentSettings.settings_json || {}),
          ticket_types_vr360_link: nextLink,
          ticket_types_vr_title: nextTitle,
        },
      });
      setVr360Link(nextLink);
      setVrTitle(nextTitle);
      toast.success('VR360 settings saved');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to save VR360 settings');
    } finally {
      setSavingVR(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className={SECTION_CLASS}>
        <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
          <h3 className="text-xl font-bold text-slate-800">Display Status - Ticket Types Section</h3>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${isDisplaying ? 'text-green-600' : 'text-slate-500'}`}>
              {isDisplaying ? 'Displaying' : 'Hidden'}
            </span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={isDisplaying}
                onChange={(event) => void handleDisplayToggle(event.target.checked)}
                disabled={savingDisplayStatus}
              />
              <div className="h-6 w-11 rounded-full bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white disabled:opacity-50 disabled:cursor-not-allowed" />
            </label>
          </div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          When hidden, ticket types and pricing can stay managed in admin while being excluded from the public park experience.
        </div>
      </section>

      <VR360SettingsSection
        linkValue={vr360Link}
        titleValue={vrTitle}
        onLinkChange={(value) => void handleVR360Change('link', value)}
        onTitleChange={(value) => void handleVR360Change('title', value)}
        disabled={savingVR}
        sectionClassName={SECTION_CLASS}
        inputClassName="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        linkPlaceholder="https://example.com/your-panorama.jpg"
      >
          {vr360Link && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-700">VR360 Preview</h4>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <div className="relative h-[360px] w-full">
                  <iframe
                    src={vr360Link}
                    className="absolute left-0 top-0 h-full w-full"
                    allowFullScreen
                    title={vrTitle || 'Ticket Types VR360 Preview'}
                    allow="xr-spatial-tracking; gyroscope; accelerometer"
                  />
                </div>
              </div>
            </div>
          )}
      </VR360SettingsSection>

      <section className={SECTION_CLASS}>
        <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Ticket Types & Pricing Management</h2>
            <p className="mt-1 text-sm text-slate-500">
              Configure admission products, pricing windows, audience rules, and featured passes for your park.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-700"
          >
            <FontAwesomeIcon icon={faPlus} />
            Add New Ticket Type
          </button>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Filter by Status:</label>
          <div className="flex items-center gap-3">
            <select
              className="rounded-md border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'featured')}
            >
              <option value="all">All Ticket Types</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="featured">Featured</option>
            </select>
            <span className="text-sm text-slate-500">{isLoading ? 'Loading...' : `${filteredTicketTypes.length} items`}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500">Loading ticket types...</div>
        ) : filteredTicketTypes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center text-slate-500">
            No ticket types yet. Create your first pricing option.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTicketTypes.map((ticketType) => (
              <div key={ticketType.id} className="rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="cursor-grab rounded-md p-2 text-slate-400 hover:text-slate-600 active:cursor-grabbing">
                    <FontAwesomeIcon icon={faGripVertical} />
                  </div>
                  <div className="flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 lg:w-52">
                    {getPrimaryImageId(ticketType) ? (
                      <img
                        src={`${getApiBaseUrl()}/media/${getPrimaryImageId(ticketType)}/view`}
                        alt={primaryName(ticketType)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-blue-50 text-blue-600">
                        <FontAwesomeIcon icon={faMoneyBillWave} className="text-2xl" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-semibold text-slate-800">{primaryName(ticketType)}</h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{ticketType.ticket_type}</span>
                      {ticketType.is_featured && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">Featured</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                      <span className="font-medium text-blue-600">Order: {ticketType.display_order ?? 0}</span>
                      <span>{ticketType.audience_type || 'General audience'}</span>
                      <span>Status: {ticketType.is_active ? 'active' : 'inactive'}</span>
                      <span>Code: {ticketType.code}</span>
                    </div>
                    <p className="mt-2 line-clamp-1 text-sm text-slate-500">
                      {ticketType.translations.find(translation => translation.locale === 'en')?.description ||
                        ticketType.translations[0]?.description ||
                        'No description available.'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ticketType.base_price != null && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                          Base: {ticketType.base_price} {ticketType.currency_code}
                        </span>
                      )}
                      {ticketType.sale_price != null && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                          Sale: {ticketType.sale_price} {ticketType.currency_code}
                        </span>
                      )}
                      {ticketType.validity_type && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">{ticketType.validity_type}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-3 self-start md:self-auto">
                    <button onClick={() => openEdit(ticketType)} className="flex items-center gap-2 rounded-md border border-slate-600 px-4 py-2 text-slate-600 transition-colors hover:bg-slate-50">
                      <FontAwesomeIcon icon={faPenToSquare} />
                      Edit
                    </button>
                    <button onClick={() => handleDelete(ticketType.id)} className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700">
                      <FontAwesomeIcon icon={faTrashCan} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold text-slate-800">
                {editingTicketType ? 'Edit Ticket Type' : 'Add New Ticket Type'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-10 w-10 items-center justify-center rounded-md text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6 overflow-x-auto border-b border-slate-200 pb-0">
                <div className="flex w-max min-w-full gap-2 whitespace-nowrap pr-2">
                  {locales.map((locale) => (
                    <button
                      key={locale}
                      type="button"
                      onClick={() => setActiveLocale(locale)}
                      className={`shrink-0 border-b-2 px-3 py-1.5 text-sm font-medium uppercase transition-colors ${
                        activeLocale === locale
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {locale}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className={LABEL_CLASS}>Ticket Name *</label>
                  <input
                    value={currentTranslation.name}
                    onChange={(e) => updateTranslation(activeLocale, 'name', e.target.value)}
                    className={FIELD_CLASS}
                    placeholder="Enter ticket name..."
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Description</label>
                  <textarea
                    value={currentTranslation.description}
                    onChange={(e) => updateTranslation(activeLocale, 'description', e.target.value)}
                    rows={4}
                    className={FIELD_CLASS}
                    placeholder="Enter a short description..."
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Terms & Conditions</label>
                  <textarea
                    value={currentTranslation.terms_and_conditions}
                    onChange={(e) => updateTranslation(activeLocale, 'terms_and_conditions', e.target.value)}
                    rows={4}
                    className={FIELD_CLASS}
                    placeholder="Enter ticket terms and conditions..."
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL_CLASS}>Code</label>
                  <input value={draft.code} onChange={(e) => updateDraft('code', e.target.value)} className={FIELD_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Currency</label>
                  <input value={draft.currency_code} onChange={(e) => updateDraft('currency_code', e.target.value.toUpperCase())} className={FIELD_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Ticket Type</label>
                  <select value={draft.ticket_type} onChange={(e) => updateDraft('ticket_type', e.target.value)} className={FIELD_CLASS}>
                    {TICKET_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Audience</label>
                  <select value={draft.audience_type} onChange={(e) => updateDraft('audience_type', e.target.value)} className={FIELD_CLASS}>
                    {AUDIENCE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Validity Type</label>
                  <select value={draft.validity_type} onChange={(e) => updateDraft('validity_type', e.target.value)} className={FIELD_CLASS}>
                    {VALIDITY_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Display Order</label>
                  <input value={draft.display_order} onChange={(e) => updateDraft('display_order', e.target.value)} className={FIELD_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Base Price</label>
                  <input value={draft.base_price} onChange={(e) => updateDraft('base_price', e.target.value)} className={FIELD_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Sale Price</label>
                  <input value={draft.sale_price} onChange={(e) => updateDraft('sale_price', e.target.value)} className={FIELD_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Valid From</label>
                  <input type="date" value={draft.valid_from} onChange={(e) => updateDraft('valid_from', e.target.value)} className={FIELD_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Valid To</label>
                  <input type="date" value={draft.valid_to} onChange={(e) => updateDraft('valid_to', e.target.value)} className={FIELD_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Start Time</label>
                  <input type="time" value={draft.start_time} onChange={(e) => updateDraft('start_time', e.target.value)} className={FIELD_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>End Time</label>
                  <input type="time" value={draft.end_time} onChange={(e) => updateDraft('end_time', e.target.value)} className={FIELD_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Max Visits</label>
                  <input value={draft.max_visits} onChange={(e) => updateDraft('max_visits', e.target.value)} className={FIELD_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Min Age</label>
                  <input value={draft.min_age} onChange={(e) => updateDraft('min_age', e.target.value)} className={FIELD_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Max Age</label>
                  <input value={draft.max_age} onChange={(e) => updateDraft('max_age', e.target.value)} className={FIELD_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Min Height (cm)</label>
                  <input value={draft.min_height_cm} onChange={(e) => updateDraft('min_height_cm', e.target.value)} className={FIELD_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Max Height (cm)</label>
                  <input value={draft.max_height_cm} onChange={(e) => updateDraft('max_height_cm', e.target.value)} className={FIELD_CLASS} />
                </div>
              </div>

              <div className="mt-4">
                <label className={LABEL_CLASS}>Status</label>
                <select
                  value={draft.is_active ? 'active' : 'inactive'}
                  onChange={(e) => updateDraft('is_active', e.target.value === 'active')}
                  className={FIELD_CLASS}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.is_featured}
                    onChange={(e) => updateDraft('is_featured', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Featured Ticket
                </label>
              </div>

              <div className="mt-6">
                <label className={`${LABEL_CLASS} flex items-center gap-2`}>
                  <FontAwesomeIcon icon={faImages} />
                  Ticket Images
                </label>
                <button
                  type="button"
                  onClick={() => setMediaPickerVisible(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  <FontAwesomeIcon icon={faImages} />
                  Select Images
                </button>

                {draft.media_ids.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {draft.media_ids.map((mediaId) => {
                      const isPrimary = draft.primary_image_media_id === mediaId;
                      return (
                        <div key={mediaId} className="group relative overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                          <img
                            src={`${getApiBaseUrl()}/media/${mediaId}/view`}
                            alt={`Ticket media ${mediaId}`}
                            className="h-24 w-full object-cover"
                          />
                          {isPrimary && (
                            <div className="absolute left-2 top-2 rounded bg-green-600 px-2 py-1 text-xs font-medium text-white">
                              Primary
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => handleRemoveMedia(mediaId)}
                              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-4 border-t border-slate-200 bg-slate-50 p-6">
              <button onClick={closeModal} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving} className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {isSaving ? 'Saving...' : editingTicketType ? 'Save changes' : 'Create ticket type'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && mediaPickerVisible && (
        <MediaPickerModal
          isOpen={mediaPickerVisible}
          onClose={() => setMediaPickerVisible(false)}
          title="Select Ticket Images"
          kind="image"
          source="restaurant"
          folder="ticket-types"
          folderAliases={['tickets', 'ticket', 'restaurant/tickets', 'restaurant/ticket-types']}
          allowMultiple
          initialSelectedIds={draft.media_ids}
          onSelectMultiple={handleMediaSelectedMultiple}
        />
      )}
    </div>
  );
};

export default TicketTypesPage;

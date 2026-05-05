import {
    faGripVertical,
    faLocationDot,
    faPenToSquare,
    faPlus,
    faTrashCan,
    faXmark
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import MediaSelectionSection from '../../components/MediaSelectionSection';
import VR360SettingsSection from '../../components/VR360SettingsSection';
import {
    cafeAttractionsApi,
    cafeLanguagesApi,
    cafeSettingsApi,
    type Attraction,
    type AttractionCategory,
    type AttractionCategoryCreate,
    type AttractionCreate,
    type AttractionTranslation
} from '../../services/restaurantApi';

type TranslationDraft = {
  name: string;
  short_description: string;
  description: string;
  safety_notes: string;
  experience_notes: string;
};

type CategoryTranslationDraft = {
  title: string;
  description: string;
};

type CategoryDraft = {
  code: string;
  is_active: boolean;
  display_order: string;
  translations: Record<string, CategoryTranslationDraft>;
};

type AttractionDraft = {
  category_id: number | null;
  code: string;
  attraction_type: string;
  experience_type: string;
  thrill_level: string;
  min_height_cm: string;
  max_height_cm: string;
  min_age: string;
  max_age: string;
  duration_minutes: string;
  operating_hours: string;
  queue_notes: string;
  vr360_link: string;
  primary_image_media_id?: number | null;
  media_ids: number[];
  is_active: boolean;
  is_featured: boolean;
  display_order: string;
  translations: Record<string, TranslationDraft>;
};

const ATTRACTION_TYPES = ['ride', 'show', 'zone', 'photo_spot', 'experience', 'other'];
const EXPERIENCE_TYPES = ['thrill', 'family', 'kids', 'water', 'vr', 'educational', 'relaxing'];
const THRILL_LEVELS = ['low', 'medium', 'high', 'extreme'];
const LABEL_CLASS = 'mb-2 block text-sm font-medium text-slate-700';
const FIELD_CLASS = 'w-full rounded-md border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500';
const SECTION_CLASS = 'rounded-lg bg-white p-6 shadow';

const createEmptyTranslation = (): TranslationDraft => ({
  name: '',
  short_description: '',
  description: '',
  safety_notes: '',
  experience_notes: '',
});

const createEmptyCategoryTranslation = (): CategoryTranslationDraft => ({
  title: '',
  description: '',
});

const createEmptyCategoryDraft = (locales: string[]): CategoryDraft => ({
  code: '',
  is_active: true,
  display_order: '',
  translations: locales.reduce<Record<string, CategoryTranslationDraft>>((acc, locale) => {
    acc[locale] = createEmptyCategoryTranslation();
    return acc;
  }, {}),
});

const createEmptyDraft = (locales: string[]): AttractionDraft => ({
  category_id: null,
  code: '',
  attraction_type: 'ride',
  experience_type: '',
  thrill_level: '',
  min_height_cm: '',
  max_height_cm: '',
  min_age: '',
  max_age: '',
  duration_minutes: '',
  operating_hours: '',
  queue_notes: '',
  vr360_link: '',
  primary_image_media_id: null,
  media_ids: [],
  is_active: true,
  is_featured: false,
  display_order: '',
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

const AttractionsPage: React.FC = () => {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [locales, setLocales] = useState<string[]>(['en']);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeLocale, setActiveLocale] = useState('en');
  const [editingAttraction, setEditingAttraction] = useState<Attraction | null>(null);
  const [draft, setDraft] = useState<AttractionDraft>(() => createEmptyDraft(['en']));
  const [categories, setCategories] = useState<AttractionCategory[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AttractionCategory | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(() => createEmptyCategoryDraft(['en']));
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [isDisplaying, setIsDisplaying] = useState(true);
  const [vr360Link, setVr360Link] = useState('');
  const [vrTitle, setVrTitle] = useState('');
  const [savingDisplayStatus, setSavingDisplayStatus] = useState(false);
  const [savingVR, setSavingVR] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'featured'>('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [attractionData, categoryData, languageCodes, settings] = await Promise.all([
        cafeAttractionsApi.getAttractions().catch(() => []),
        cafeAttractionsApi.getCategories().catch(() => []),
        cafeLanguagesApi.getLanguageCodes().catch(() => ['en']),
        cafeSettingsApi.getSettings().catch(() => ({ settings_json: {} })),
      ]);
      const nextLocales = languageCodes.length > 0 ? languageCodes : ['en'];
      setAttractions(attractionData);
      setCategories(categoryData);
      setLocales(nextLocales);
      setActiveLocale(prev => nextLocales.includes(prev) ? prev : nextLocales[0]);
      setCategoryFilter('all');
      setIsDisplaying(settings.settings_json?.attractions_is_displaying ?? true);
      setVr360Link(settings.settings_json?.attractions_vr360_link || '');
      setVrTitle(settings.settings_json?.attractions_vr_title || '');
    } catch (error) {
      console.error(error);
      toast.error('Failed to load attractions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    const nextDraft = createEmptyDraft(locales);
    setEditingAttraction(null);
    setDraft(nextDraft);
    setActiveLocale(locales[0] || 'en');
    setIsModalOpen(true);
  };

  const openEdit = (attraction: Attraction) => {
    const nextDraft = createEmptyDraft(locales);
    nextDraft.code = attraction.code;
    nextDraft.attraction_type = attraction.attraction_type || 'ride';
    nextDraft.experience_type = attraction.experience_type || '';
    nextDraft.thrill_level = attraction.thrill_level || '';
    nextDraft.min_height_cm = attraction.min_height_cm != null ? String(attraction.min_height_cm) : '';
    nextDraft.max_height_cm = attraction.max_height_cm != null ? String(attraction.max_height_cm) : '';
    nextDraft.min_age = attraction.min_age != null ? String(attraction.min_age) : '';
    nextDraft.max_age = attraction.max_age != null ? String(attraction.max_age) : '';
    nextDraft.duration_minutes = attraction.duration_minutes != null ? String(attraction.duration_minutes) : '';
    nextDraft.operating_hours = attraction.operating_hours || '';
    nextDraft.category_id = attraction.category_id ?? null;
    nextDraft.queue_notes = attraction.queue_notes || '';
    nextDraft.vr360_link = attraction.vr360_link || '';
    nextDraft.is_active = attraction.is_active;
    nextDraft.is_featured = attraction.is_featured;
    nextDraft.display_order = String(attraction.display_order ?? '');
    nextDraft.primary_image_media_id = attraction.primary_image_media_id ?? null;
    nextDraft.media_ids = attraction.media?.map(item => item.media_id) || (attraction.primary_image_media_id ? [attraction.primary_image_media_id] : []);

    attraction.translations.forEach((translation) => {
      nextDraft.translations[translation.locale] = {
        name: translation.name || '',
        short_description: translation.short_description || '',
        description: translation.description || '',
        safety_notes: translation.safety_notes || '',
        experience_notes: translation.experience_notes || '',
      };
    });

    setEditingAttraction(attraction);
    setDraft(nextDraft);
    setActiveLocale(locales[0] || 'en');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAttraction(null);
  };

  const openCreateCategory = () => {
    const nextDraft = createEmptyCategoryDraft(locales);
    setEditingCategory(null);
    setCategoryDraft(nextDraft);
    setActiveLocale(locales[0] || 'en');
    setIsCategoryModalOpen(true);
  };

  const openEditCategory = (category: AttractionCategory) => {
    const nextDraft = createEmptyCategoryDraft(locales);
    nextDraft.code = category.code;
    nextDraft.is_active = category.is_active;
    nextDraft.display_order = String(category.display_order ?? '');

    category.translations.forEach((translation) => {
      nextDraft.translations[translation.locale] = {
        title: translation.title || '',
        description: translation.description || '',
      };
    });

    setEditingCategory(category);
    setCategoryDraft(nextDraft);
    setActiveLocale(locales[0] || 'en');
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  const updateDraft = <K extends keyof AttractionDraft>(key: K, value: AttractionDraft[K]) => {
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

  const updateCategoryDraft = <K extends keyof CategoryDraft>(key: K, value: CategoryDraft[K]) => {
    setCategoryDraft(prev => ({ ...prev, [key]: value }));
  };

  const updateCategoryTranslation = (locale: string, key: keyof CategoryTranslationDraft, value: string) => {
    setCategoryDraft(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [locale]: {
          ...(prev.translations[locale] || createEmptyCategoryTranslation()),
          [key]: value,
        },
      },
    }));
  };

  const currentTranslation = draft.translations[activeLocale] || createEmptyTranslation();

  const primaryName = (attraction: Attraction) =>
    attraction.translations.find(t => t.locale === 'en')?.name ||
    attraction.translations[0]?.name ||
    attraction.code;

  const filteredAttractions = useMemo(() => {
    let next = attractions;
    if (statusFilter === 'active') next = next.filter((item) => item.is_active);
    if (statusFilter === 'inactive') next = next.filter((item) => !item.is_active);
    if (statusFilter === 'featured') next = next.filter((item) => item.is_featured);
    if (categoryFilter !== 'all') next = next.filter((item) => item.category_id === categoryFilter);
    return next;
  }, [attractions, statusFilter, categoryFilter]);

  const buildPayload = (): AttractionCreate | null => {
    const translations: AttractionTranslation[] = locales
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
      space_id: null,
      category_id: draft.category_id ?? null,
      attraction_type: draft.attraction_type,
      experience_type: draft.experience_type || null,
      thrill_level: draft.thrill_level || null,
      min_height_cm: numberOrUndefined(draft.min_height_cm) ?? null,
      max_height_cm: numberOrUndefined(draft.max_height_cm) ?? null,
      min_age: numberOrUndefined(draft.min_age) ?? null,
      max_age: numberOrUndefined(draft.max_age) ?? null,
      duration_minutes: numberOrUndefined(draft.duration_minutes) ?? null,
      operating_hours: draft.operating_hours.trim() || null,
      queue_notes: draft.queue_notes.trim() || null,
      vr360_link: draft.vr360_link.trim() || null,
      primary_image_media_id: draft.primary_image_media_id ?? null,
      media_ids: draft.media_ids,
      is_active: draft.is_active,
      is_featured: draft.is_featured,
      display_order: numberOrUndefined(draft.display_order) ?? 0,
      translations,
    };
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;

    setIsSaving(true);
    try {
      if (editingAttraction) {
        await cafeAttractionsApi.updateAttraction(editingAttraction.id, payload);
        toast.success('Attraction updated');
      } else {
        await cafeAttractionsApi.createAttraction(payload);
        toast.success('Attraction created');
      }
      closeModal();
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save attraction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this attraction?')) return;
    try {
      await cafeAttractionsApi.deleteAttraction(id);
      toast.success('Attraction deleted');
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete attraction');
    }
  };

  const buildCategoryPayload = (): AttractionCategoryCreate | null => {
    const translations = locales
      .map((locale) => ({
        locale,
        ...categoryDraft.translations[locale],
      }))
      .filter((translation) => translation.title.trim().length > 0);

    if (!categoryDraft.code.trim()) {
      toast.error('Category code is required');
      return null;
    }

    if (translations.length === 0) {
      toast.error('At least one category title is required');
      return null;
    }

    return {
      code: categoryDraft.code.trim(),
      is_active: categoryDraft.is_active,
      display_order: numberOrUndefined(categoryDraft.display_order) ?? 0,
      translations,
    };
  };

  const handleCategorySave = async () => {
    const payload = buildCategoryPayload();
    if (!payload) return;

    try {
      if (editingCategory) {
        await cafeAttractionsApi.updateCategory(editingCategory.id, payload);
        toast.success('Category updated');
      } else {
        await cafeAttractionsApi.createCategory(payload);
        toast.success('Category created');
      }
      closeCategoryModal();
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await cafeAttractionsApi.deleteCategory(id);
      toast.success('Category deleted');
      await loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to delete category');
    }
  };

  const handleDisplayToggle = async (value: boolean) => {
    try {
      setSavingDisplayStatus(true);
      const currentSettings = await cafeSettingsApi.getSettings();
      await cafeSettingsApi.updateSettings({
        settings_json: {
          ...(currentSettings.settings_json || {}),
          attractions_is_displaying: value,
        },
      });
      setIsDisplaying(value);
      toast.success(value ? 'Points of interest section enabled' : 'Points of interest section hidden');
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
          attractions_vr360_link: nextLink,
          attractions_vr_title: nextTitle,
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
          <h3 className="text-xl font-bold text-slate-800">Display Status - Points of Interest Section</h3>
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
          When hidden, the points of interest section will stay editable in admin but can be excluded from the public experience.
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
                    title={vrTitle || 'Points of Interest VR360 Preview'}
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
            <h2 className="text-xl font-bold text-slate-800">Point of Interest Categories</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create and manage categories for points of interest so items can be grouped clearly in the park experience.
            </p>
          </div>
          <button
            onClick={openCreateCategory}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-700"
          >
            <FontAwesomeIcon icon={faPlus} />
            Add Category
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center text-slate-500">
            No categories yet. Add a category to organize your points of interest.
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => {
              const categoryName = category.translations.find((t) => t.locale === 'en')?.title || category.code;
              const categoryDescription = category.translations.find((t) => t.locale === 'en')?.description;
              return (
                <div key={category.id} className="rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">{categoryName}</h3>
                      {categoryDescription && (
                        <p className="mt-1 text-sm text-slate-500 line-clamp-1">{categoryDescription}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          category.is_active
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {category.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="font-medium text-blue-600">Order: {category.display_order}</span>
                        <span>{category.translations.length} translations</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEditCategory(category)}
                        className="rounded-md border border-slate-600 px-4 py-2 text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <FontAwesomeIcon icon={faPenToSquare} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                      >
                        <FontAwesomeIcon icon={faTrashCan} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className={SECTION_CLASS}>
        <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Points of Interest Management</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage rides, interactive zones, shows, and featured landmarks for your adventure park.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-700"
          >
            <FontAwesomeIcon icon={faPlus} />
            Add New Point of Interest
          </button>
        </div>

        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Filter by Status:</label>
            <select
              className="rounded-md border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'featured')}
            >
              <option value="all">All Items</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="featured">Featured</option>
            </select>
            <label className="text-sm font-medium text-slate-700">Filter by Category:</label>
            <select
              className="rounded-md border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.translations.find((t) => t.locale === 'en')?.title || category.code}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-slate-500">{isLoading ? 'Loading...' : `${filteredAttractions.length} items`}</span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500">Loading attractions...</div>
        ) : filteredAttractions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center text-slate-500">
            No attractions yet. Create your first point of interest.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAttractions.map((attraction) => (
              <div key={attraction.id} className="rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="cursor-grab rounded-md p-2 text-slate-400 hover:text-slate-600 active:cursor-grabbing">
                    <FontAwesomeIcon icon={faGripVertical} />
                  </div>
                  <div className="flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 lg:w-52">
                    <div className="flex h-full w-full items-center justify-center bg-blue-50 text-blue-600">
                      <FontAwesomeIcon icon={faLocationDot} className="text-2xl" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-semibold text-slate-800">{primaryName(attraction)}</h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{attraction.attraction_type}</span>
                      {attraction.is_featured && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">Featured</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                      <span className="font-medium text-blue-600">Order: {attraction.display_order ?? 0}</span>
                      <span>{attraction.experience_type || 'General experience'}</span>
                      {attraction.category_id ? (
                        <span>
                          Category: {categories.find((category) => category.id === attraction.category_id)?.translations.find((t) => t.locale === 'en')?.title || 'Unknown'}
                        </span>
                      ) : null}
                      <span>Status: {attraction.is_active ? 'active' : 'inactive'}</span>
                      <span>Code: {attraction.code}</span>
                    </div>
                    <p className="mt-2 line-clamp-1 text-sm text-slate-500">
                      {attraction.translations.find(t => t.locale === 'en')?.short_description ||
                        attraction.translations[0]?.short_description ||
                        'No description available.'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                        {attraction.attraction_type || 'Point of interest'}
                      </span>
                      {attraction.duration_minutes ? (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">{attraction.duration_minutes} min</span>
                      ) : null}
                      {attraction.thrill_level ? (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">{attraction.thrill_level}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-3 self-start md:self-auto">
                    <button onClick={() => openEdit(attraction)} className="flex items-center gap-2 rounded-md border border-slate-600 px-4 py-2 text-slate-600 transition-colors hover:bg-slate-50">
                      <FontAwesomeIcon icon={faPenToSquare} />
                      Edit
                    </button>
                    <button onClick={() => handleDelete(attraction.id)} className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700">
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
                {editingAttraction ? 'Edit Point of Interest' : 'Add New Point of Interest'}
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
                  <label className={LABEL_CLASS}>Point of Interest Name *</label>
                  <input
                    value={currentTranslation.name}
                    onChange={(e) => updateTranslation(activeLocale, 'name', e.target.value)}
                    className={FIELD_CLASS}
                    placeholder="Enter point of interest name..."
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Short Description</label>
                  <textarea
                    value={currentTranslation.short_description}
                    onChange={(e) => updateTranslation(activeLocale, 'short_description', e.target.value)}
                    rows={2}
                    className={FIELD_CLASS}
                    placeholder="Enter a short summary..."
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Description</label>
                  <textarea
                    value={currentTranslation.description}
                    onChange={(e) => updateTranslation(activeLocale, 'description', e.target.value)}
                    rows={4}
                    className={FIELD_CLASS}
                    placeholder="Enter a detailed description..."
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Safety Notes</label>
                  <textarea
                    value={currentTranslation.safety_notes}
                    onChange={(e) => updateTranslation(activeLocale, 'safety_notes', e.target.value)}
                    rows={2}
                    className={FIELD_CLASS}
                    placeholder="Enter safety guidance..."
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Experience Notes</label>
                  <textarea
                    value={currentTranslation.experience_notes}
                    onChange={(e) => updateTranslation(activeLocale, 'experience_notes', e.target.value)}
                    rows={2}
                    className={FIELD_CLASS}
                    placeholder="Enter visitor experience notes..."
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={LABEL_CLASS}>Code</label>
                  <input value={draft.code} onChange={(e) => updateDraft('code', e.target.value)} className={FIELD_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Category</label>
                  <select
                    value={draft.category_id ?? 'none'}
                    onChange={(e) => updateDraft('category_id', e.target.value === 'none' ? null : Number(e.target.value))}
                    className={FIELD_CLASS}
                  >
                    <option value="none">No category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.translations.find((t) => t.locale === 'en')?.title || category.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Attraction Type</label>
                  <select value={draft.attraction_type} onChange={(e) => updateDraft('attraction_type', e.target.value)} className={FIELD_CLASS}>
                    {ATTRACTION_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Experience Type</label>
                  <select value={draft.experience_type} onChange={(e) => updateDraft('experience_type', e.target.value)} className={FIELD_CLASS}>
                    <option value="">Select type</option>
                    {EXPERIENCE_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Thrill Level</label>
                  <select value={draft.thrill_level} onChange={(e) => updateDraft('thrill_level', e.target.value)} className={FIELD_CLASS}>
                    <option value="">Select level</option>
                    {THRILL_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLASS}>Display Order</label>
                  <input value={draft.display_order} onChange={(e) => updateDraft('display_order', e.target.value)} className={FIELD_CLASS} />
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
                <div>
                  <label className={LABEL_CLASS}>Duration (min)</label>
                  <input value={draft.duration_minutes} onChange={(e) => updateDraft('duration_minutes', e.target.value)} className={FIELD_CLASS} />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Operating Hours</label>
                  <input value={draft.operating_hours} onChange={(e) => updateDraft('operating_hours', e.target.value)} placeholder="09:00 - 21:00" className={FIELD_CLASS} />
                </div>
              </div>

              <div className="mt-4">
                <label className={LABEL_CLASS}>Queue Notes</label>
                <textarea value={draft.queue_notes} onChange={(e) => updateDraft('queue_notes', e.target.value)} rows={3} className={FIELD_CLASS} />
              </div>

              <div className="mt-4">
                <label className={LABEL_CLASS}>VR360 Tour Link</label>
                <input
                  type="url"
                  value={draft.vr360_link}
                  onChange={(e) => updateDraft('vr360_link', e.target.value)}
                  placeholder="https://example.com/vr360-tour or https://youtube.com/watch?v=..."
                  className={FIELD_CLASS}
                />
                <p className="mt-1 text-xs text-slate-500">Enter the VR URL for this attraction item, if available.</p>
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

              <div className="mt-6">
                <MediaSelectionSection
                  label="Point of Interest Images"
                  mediaIds={draft.media_ids}
                  primaryImageMediaId={draft.primary_image_media_id}
                  onRemove={(mediaId) => setDraft((prev) => {
                    const nextMediaIds = prev.media_ids.filter((id) => id !== mediaId);
                    return {
                      ...prev,
                      media_ids: nextMediaIds,
                      primary_image_media_id: prev.primary_image_media_id === mediaId ? nextMediaIds[0] ?? null : prev.primary_image_media_id,
                    };
                  })}
                  onSetPrimary={(mediaId) => setDraft((prev) => ({
                    ...prev,
                    primary_image_media_id: mediaId,
                  }))}
                  onSelectMultiple={(mediaIds) => setDraft((prev) => {
                    const nextMediaIds = Array.from(new Set(mediaIds));
                    return {
                      ...prev,
                      media_ids: nextMediaIds,
                      primary_image_media_id: prev.primary_image_media_id && nextMediaIds.includes(prev.primary_image_media_id)
                        ? prev.primary_image_media_id
                        : nextMediaIds[0] ?? null,
                    };
                  })}
                  pickerTitle="Select Point of Interest Images"
                  pickerKind="image"
                  pickerSource="restaurant"
                  pickerFolder="attractions"
                  buttonText="Select Images"
                  buttonClassName="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                  gridColumns={4}
                  gridItemHeight={112}
                />
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={draft.is_featured}
                    onChange={(e) => updateDraft('is_featured', e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Featured Item
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-4 border-t border-slate-200 bg-slate-50 p-6">
              <button onClick={closeModal} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving} className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                {isSaving ? 'Saving...' : editingAttraction ? 'Save changes' : 'Create attraction'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold text-slate-800">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                type="button"
                onClick={closeCategoryModal}
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
                  <label className={LABEL_CLASS}>Category Code *</label>
                  <input
                    value={categoryDraft.code}
                    onChange={(e) => updateCategoryDraft('code', e.target.value)}
                    className={FIELD_CLASS}
                    placeholder="Enter category code..."
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Display Order</label>
                  <input
                    value={categoryDraft.display_order}
                    onChange={(e) => updateCategoryDraft('display_order', e.target.value)}
                    className={FIELD_CLASS}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={categoryDraft.is_active}
                        onChange={(e) => updateCategoryDraft('is_active', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      Active category
                    </label>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <h4 className="text-base font-semibold text-slate-800">Translations</h4>
                  <div>
                    <label className={LABEL_CLASS}>Title *</label>
                    <input
                      value={categoryDraft.translations[activeLocale]?.title || ''}
                      onChange={(e) => updateCategoryTranslation(activeLocale, 'title', e.target.value)}
                      className={FIELD_CLASS}
                      placeholder="Enter category title..."
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Description</label>
                    <textarea
                      value={categoryDraft.translations[activeLocale]?.description || ''}
                      onChange={(e) => updateCategoryTranslation(activeLocale, 'description', e.target.value)}
                      rows={3}
                      className={FIELD_CLASS}
                      placeholder="Enter a category description..."
                    />
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 flex justify-end gap-4 border-t border-slate-200 bg-slate-50 p-6">
                <button
                  onClick={closeCategoryModal}
                  className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCategorySave}
                  className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  {editingCategory ? 'Save category' : 'Create category'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttractionsPage;

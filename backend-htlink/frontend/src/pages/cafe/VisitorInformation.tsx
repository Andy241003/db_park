import {
  faArrowRotateLeft,
  faClock,
  faCircleCheck,
  faCircleInfo,
  faFloppyDisk,
  faImages,
  faPenToSquare,
  faPlus,
  faQuestionCircle,
  faRoute,
  faTimes,
  faTrashCan,
  faVrCardboard,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import MediaPickerModal from '../../components/MediaPickerModal';
import VR360SettingsSection from '../../components/VR360SettingsSection';
import type {
  RestaurantPageSettings,
  VisitorInfoCategory,
  VisitorInfoCategoryTranslation,
} from '../../services/restaurantApi';
import {
  cafeLanguagesApi,
  cafeVisitorInformationApi,
  restaurantPageSettingsApi,
} from '../../services/restaurantApi';
import { getApiBaseUrl } from '../../utils/api';

const INPUT_CLASS =
  'w-full rounded-md border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100';
const SECTION_CLASS = 'rounded-lg bg-white p-6 shadow';

type CategoryTranslationDraft = {
  title: string;
  description: string;
};

type ItemTranslationDraft = {
  title: string;
  subtitle: string;
  description: string;
};

type CategoryDraft = {
  category_code: string;
  item_layout: string;
  is_active: boolean;
  display_order: string;
  image_media_id: number | null;
  translations: Record<string, CategoryTranslationDraft>;
};

type ItemDraft = {
  is_active: boolean;
  translations: Record<string, ItemTranslationDraft>;
};

type PageSettingsFormState = {
  page_code: 'visitor_info';
  is_displaying: boolean;
  vr360_link: string;
  vr_title: string;
};

const buildPageSettingsState = (pageSettings?: RestaurantPageSettings): PageSettingsFormState => ({
  page_code: 'visitor_info',
  is_displaying: pageSettings?.is_displaying ?? true,
  vr360_link: pageSettings?.vr360_link || '',
  vr_title: pageSettings?.vr_title || '',
});

const createEmptyCategoryTranslation = (): CategoryTranslationDraft => ({
  title: '',
  description: '',
});

const createEmptyItemTranslation = (): ItemTranslationDraft => ({
  title: '',
  subtitle: '',
  description: '',
});

const createEmptyCategoryDraft = (locales: string[]): CategoryDraft => ({
  category_code: '',
  item_layout: 'list',
  is_active: true,
  display_order: '',
  image_media_id: null,
  translations: locales.reduce<Record<string, CategoryTranslationDraft>>((acc, locale) => {
    acc[locale] = createEmptyCategoryTranslation();
    return acc;
  }, {}),
});

const createEmptyItemDraft = (locales: string[]): ItemDraft => ({
  is_active: true,
  translations: locales.reduce<Record<string, ItemTranslationDraft>>((acc, locale) => {
    acc[locale] = createEmptyItemTranslation();
    return acc;
  }, {}),
});

const getPreferredCategoryTranslation = (
  category: VisitorInfoCategory,
  preferredLocale = 'en',
): VisitorInfoCategoryTranslation | undefined =>
  category.translations.find((translation) => translation.locale === preferredLocale) ||
  category.translations[0];

const getCategoryLayoutVariant = (category: VisitorInfoCategory) => {
  const signature = `${category.category_code} ${category.item_layout || ''}`.toLowerCase();

  if (signature.includes('hour') || signature.includes('opening')) return 'hours';
  if (signature.includes('rule')) return 'rules';
  if (signature.includes('direction') || signature.includes('transport') || signature.includes('move')) return 'directions';
  if (signature.includes('faq') || signature.includes('question')) return 'faq';
  return 'generic';
};

const getCategoryImageUrl = (category: VisitorInfoCategory) => {
  const mediaId = Number(category.attributes_json?.image_media_id);
  return mediaId ? `${getApiBaseUrl()}/media/${mediaId}/view` : null;
};

const getCategoryTheme = (category: VisitorInfoCategory) => {
  const layoutVariant = getCategoryLayoutVariant(category);

  switch (layoutVariant) {
    case 'hours':
      return {
        icon: faClock,
        iconWrap: 'bg-amber-100 text-amber-600',
        badge: 'bg-amber-100 text-amber-700',
        panel: 'from-amber-50 via-white to-white',
      };
    case 'rules':
      return {
        icon: faCircleCheck,
        iconWrap: 'bg-emerald-100 text-emerald-600',
        badge: 'bg-emerald-100 text-emerald-700',
        panel: 'from-emerald-50 via-white to-white',
      };
    case 'directions':
      return {
        icon: faRoute,
        iconWrap: 'bg-sky-100 text-sky-600',
        badge: 'bg-sky-100 text-sky-700',
        panel: 'from-sky-50 via-white to-white',
      };
    case 'faq':
      return {
        icon: faQuestionCircle,
        iconWrap: 'bg-violet-100 text-violet-600',
        badge: 'bg-violet-100 text-violet-700',
        panel: 'from-violet-50 via-white to-white',
      };
    default:
      return {
        icon: faCircleInfo,
        iconWrap: 'bg-blue-100 text-blue-600',
        badge: 'bg-blue-100 text-blue-700',
        panel: 'from-blue-50 via-white to-white',
      };
  }
};

const VisitorInformationPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locales, setLocales] = useState<string[]>(['en']);
  const [pageSettings, setPageSettings] = useState<PageSettingsFormState>(() => buildPageSettingsState());
  const [initialPageSettings, setInitialPageSettings] = useState<PageSettingsFormState>(() => buildPageSettingsState());
  const [categories, setCategories] = useState<VisitorInfoCategory[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<VisitorInfoCategory | null>(null);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft>(() => createEmptyCategoryDraft(['en']));
  const [itemDraft, setItemDraft] = useState<ItemDraft>(() => createEmptyItemDraft(['en']));
  const [activeCategoryLocale, setActiveCategoryLocale] = useState('en');
  const [activeItemLocale, setActiveItemLocale] = useState('en');
  const [modalSaving, setModalSaving] = useState(false);
  const [isCategoryMediaPickerOpen, setIsCategoryMediaPickerOpen] = useState(false);

  const loadPageData = useCallback(async () => {
    try {
      setLoading(true);
      const [pageSetting, categoryData, languageCodes] = await Promise.all([
        restaurantPageSettingsApi.getPageSetting('visitor_info').catch((error) => {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            return null;
          }
          throw error;
        }),
        cafeVisitorInformationApi.getCategories().catch(() => []),
        cafeLanguagesApi.getLanguageCodes().catch(() => ['en']),
      ]);

      const nextLocales = languageCodes.length > 0 ? languageCodes : ['en'];
      const nextPageSettings = buildPageSettingsState(pageSetting || undefined);

      setLocales(nextLocales);
      setActiveCategoryLocale((previous) => (nextLocales.includes(previous) ? previous : nextLocales[0]));
      setActiveItemLocale((previous) => (nextLocales.includes(previous) ? previous : nextLocales[0]));
      setPageSettings(nextPageSettings);
      setInitialPageSettings(JSON.parse(JSON.stringify(nextPageSettings)));
      setCategories(categoryData);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to load visitor information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const currentCategoryTranslation =
    categoryDraft.translations[activeCategoryLocale] || createEmptyCategoryTranslation();
  const currentItemTranslation = itemDraft.translations[activeItemLocale] || createEmptyItemTranslation();
  const activeItemCategory = categories.find((category) => category.id === activeCategoryId) || null;

  const filteredCategories = useMemo(
    () =>
      categories.filter((category) => {
        if (statusFilter === 'active') return category.is_active;
        if (statusFilter === 'inactive') return !category.is_active;
        return true;
      }),
    [categories, statusFilter],
  );

  const renderVisitorInfoItem = (category: VisitorInfoCategory, item: VisitorInfoCategory['items'][number]) => {
    const english = item.translations.find((translation) => translation.locale === 'en') || item.translations[0];
    const layoutVariant = getCategoryLayoutVariant(category);
    const rowBaseClass =
      'rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md';

    if (layoutVariant === 'hours') {
      return (
        <div key={item.id} className={`${rowBaseClass} flex items-center gap-4`}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <FontAwesomeIcon icon={faClock} className="w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:gap-4">
              <span className="font-medium text-slate-500">{english?.title || 'Schedule label'}</span>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                {english?.subtitle || '00:00 - 00:00'}
              </span>
            </div>
            {english?.description && (
              <p className="mt-1 text-sm text-slate-500">{english.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openEditItemModal(category, item.id)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-500 transition-colors hover:bg-slate-300 hover:text-slate-700"
              aria-label="Edit item"
            >
              <FontAwesomeIcon icon={faPenToSquare} className="w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteItem(category, item.id)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-500 transition-colors hover:bg-red-100 hover:text-red-600"
              aria-label="Delete item"
            >
              <FontAwesomeIcon icon={faTrashCan} className="w-4" />
            </button>
          </div>
        </div>
      );
    }

    const iconMap = {
      rules: faCircleCheck,
      directions: faRoute,
      faq: faQuestionCircle,
      generic: faCircleInfo,
    } as const;

    return (
      <div key={item.id} className={`${rowBaseClass} flex items-start gap-4`}>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            layoutVariant === 'directions'
              ? 'bg-sky-100 text-sky-600'
              : layoutVariant === 'faq'
                ? 'bg-violet-100 text-violet-600'
                : layoutVariant === 'generic'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-emerald-100 text-emerald-600'
          }`}
        >
          <FontAwesomeIcon icon={iconMap[layoutVariant]} className="w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="text-base font-semibold text-slate-900">{english?.title || 'Untitled item'}</h4>
          {(english?.description || english?.subtitle) && (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {english?.description || english?.subtitle}
            </p>
          )}
          {layoutVariant === 'directions' && english?.subtitle && english?.description && (
            <p className="mt-1 text-sm text-slate-500">{english.subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEditItemModal(category, item.id)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-500 transition-colors hover:bg-slate-300 hover:text-slate-700"
            aria-label="Edit item"
          >
            <FontAwesomeIcon icon={faPenToSquare} className="w-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteItem(category, item.id)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-500 transition-colors hover:bg-red-100 hover:text-red-600"
            aria-label="Delete item"
          >
            <FontAwesomeIcon icon={faTrashCan} className="w-4" />
          </button>
        </div>
      </div>
    );
  };

  const handleDisplayToggle = (checked: boolean) => {
    setPageSettings((prev) => ({ ...prev, is_displaying: checked }));
  };

  const handlePageSettingChange = (
    field: keyof Omit<PageSettingsFormState, 'page_code' | 'is_displaying'>,
    value: string,
  ) => {
    setPageSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    setPageSettings(JSON.parse(JSON.stringify(initialPageSettings)));
    toast.success('Changes reverted');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await restaurantPageSettingsApi.createOrUpdatePageSetting({
        page_code: 'visitor_info',
        is_displaying: pageSettings.is_displaying,
        vr360_link: pageSettings.vr360_link || null,
        vr_title: pageSettings.vr_title || null,
      });
      const nextPageSettings = { ...pageSettings };
      setInitialPageSettings(JSON.parse(JSON.stringify(nextPageSettings)));
      toast.success('Visitor information settings saved successfully');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || 'Failed to save visitor information');
    } finally {
      setSaving(false);
    }
  };

  const updateCategoryDraft = <K extends keyof CategoryDraft>(key: K, value: CategoryDraft[K]) => {
    setCategoryDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateItemDraft = <K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) => {
    setItemDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateCategoryTranslation = (
    locale: string,
    key: keyof CategoryTranslationDraft,
    value: string,
  ) => {
    setCategoryDraft((prev) => ({
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

  const updateItemTranslation = (
    locale: string,
    key: keyof ItemTranslationDraft,
    value: string,
  ) => {
    setItemDraft((prev) => ({
      ...prev,
      translations: {
        ...prev.translations,
        [locale]: {
          ...(prev.translations[locale] || createEmptyItemTranslation()),
          [key]: value,
        },
      },
    }));
  };

  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setCategoryDraft(createEmptyCategoryDraft(locales));
    setActiveCategoryLocale(locales[0] || 'en');
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: VisitorInfoCategory) => {
    const nextDraft = createEmptyCategoryDraft(locales);
    nextDraft.category_code = category.category_code;
    nextDraft.item_layout = category.item_layout || 'list';
    nextDraft.is_active = category.is_active;
    nextDraft.display_order = String(category.display_order ?? '');
    nextDraft.image_media_id = Number(category.attributes_json?.image_media_id) || null;

    category.translations.forEach((translation) => {
      nextDraft.translations[translation.locale] = {
        title: translation.title || '',
        description: translation.description || '',
      };
    });

    setEditingCategory(category);
    setCategoryDraft(nextDraft);
    setActiveCategoryLocale(locales[0] || 'en');
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = async (category: VisitorInfoCategory) => {
    const categoryTitle = getPreferredCategoryTranslation(category)?.title || category.title || 'this category';
    if (!window.confirm(`Delete category "${categoryTitle}"?`)) return;
    try {
      await cafeVisitorInformationApi.deleteCategory(category.id);
      toast.success('Category deleted');
      await loadPageData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete category');
    }
  };

  const openCreateItemModal = (category: VisitorInfoCategory) => {
    setActiveCategoryId(category.id);
    setEditingItemId(null);
    setItemDraft(createEmptyItemDraft(locales));
    setActiveItemLocale(locales[0] || 'en');
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (category: VisitorInfoCategory, itemId: number) => {
    const item = category.items.find((entry) => entry.id === itemId);
    if (!item) return;

    const nextDraft = createEmptyItemDraft(locales);
    nextDraft.is_active = item.is_active;

    item.translations.forEach((translation) => {
      nextDraft.translations[translation.locale] = {
        title: translation.title || '',
        subtitle: translation.subtitle || '',
        description: translation.description || '',
      };
    });

    setActiveCategoryId(category.id);
    setEditingItemId(itemId);
    setItemDraft(nextDraft);
    setActiveItemLocale(locales[0] || 'en');
    setIsItemModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryDraft.category_code.trim()) {
      toast.error('Category code is required');
      return;
    }

    const translations = locales
      .map((locale) => ({
        locale,
        title: categoryDraft.translations[locale]?.title.trim() || '',
        description: categoryDraft.translations[locale]?.description.trim() || null,
      }))
      .filter((translation) => translation.title.length > 0);

    if (translations.length === 0) {
      toast.error('At least one category translation title is required');
      return;
    }

    try {
      setModalSaving(true);
      const payload = {
        category_code: categoryDraft.category_code.trim(),
        item_layout: categoryDraft.item_layout.trim() || 'list',
        is_active: categoryDraft.is_active,
        display_order: categoryDraft.display_order.trim()
          ? Number(categoryDraft.display_order)
          : editingCategory
            ? editingCategory.display_order
            : categories.length,
        title: translations[0].title,
        attributes_json: {
          ...(editingCategory?.attributes_json || {}),
          ...(categoryDraft.image_media_id ? { image_media_id: categoryDraft.image_media_id } : {}),
        },
        translations,
      };

      if (editingCategory) {
        await cafeVisitorInformationApi.updateCategory(editingCategory.id, payload);
        toast.success('Category updated');
      } else {
        await cafeVisitorInformationApi.createCategory(payload);
        toast.success('Category created');
      }

      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      await loadPageData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save category');
    } finally {
      setModalSaving(false);
    }
  };

  const handleSaveItem = async () => {
    if (!activeCategoryId) {
      toast.error('Please select a category first');
      return;
    }

    const activeCategory = categories.find((category) => category.id === activeCategoryId);
    if (!activeCategory) {
      toast.error('Category not found');
      return;
    }

    const translations = locales
      .map((locale) => ({
        locale,
        title: itemDraft.translations[locale]?.title.trim() || '',
        subtitle: itemDraft.translations[locale]?.subtitle.trim() || null,
        description: itemDraft.translations[locale]?.description.trim() || null,
        content: null,
      }))
      .filter((translation) => translation.title.length > 0);

    if (translations.length === 0) {
      toast.error('At least one item translation title is required');
      return;
    }

    try {
      setModalSaving(true);
      const payload = {
        item_type: editingItemId
          ? activeCategory.items.find((item) => item.id === editingItemId)?.item_type || activeCategory.category_code || 'text'
          : activeCategory.category_code || 'text',
        is_active: itemDraft.is_active,
        display_order: editingItemId
          ? activeCategory.items.find((item) => item.id === editingItemId)?.display_order || 0
          : activeCategory.items.length,
        translations,
      };

      if (editingItemId) {
        await cafeVisitorInformationApi.updateItem(editingItemId, payload);
        toast.success('Item updated');
      } else {
        await cafeVisitorInformationApi.createItem(activeCategoryId, payload);
        toast.success('Item created');
      }

      setIsItemModalOpen(false);
      setEditingItemId(null);
      setActiveCategoryId(null);
      setItemDraft(createEmptyItemDraft(locales));
      await loadPageData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save item');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeleteItem = async (category: VisitorInfoCategory, itemId: number) => {
    const item = category.items.find((entry) => entry.id === itemId);
    const itemTitle =
      item?.translations.find((translation) => translation.locale === 'en')?.title ||
      item?.translations[0]?.title ||
      'this item';
    if (!window.confirm(`Delete "${itemTitle}"?`)) return;
    try {
      await cafeVisitorInformationApi.deleteItem(itemId);
      toast.success('Item deleted');
      await loadPageData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete item');
    }
  };

  const categoryImagePreviewUrl = categoryDraft.image_media_id
    ? `${getApiBaseUrl()}/media/${categoryDraft.image_media_id}/view`
    : null;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-slate-600">Loading visitor information...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={SECTION_CLASS}>
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
          <h2 className="text-xl font-bold text-slate-800">Display Status - Visitor Information Section</h2>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${pageSettings.is_displaying ? 'text-green-600' : 'text-slate-500'}`}>
              {pageSettings.is_displaying ? 'Displaying' : 'Hidden'}
            </span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={pageSettings.is_displaying}
                onChange={(event) => handleDisplayToggle(event.target.checked)}
                disabled={saving}
              />
              <div className="h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full" />
            </label>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 text-blue-600" />
          <span className="text-sm text-blue-800">
            Build this page with flexible categories and multiple multilingual items inside each category.
          </span>
        </div>
      </div>

      <VR360SettingsSection
        linkValue={pageSettings.vr360_link}
        titleValue={pageSettings.vr_title}
        onLinkChange={(value) => handlePageSettingChange('vr360_link', value)}
        onTitleChange={(value) => handlePageSettingChange('vr_title', value)}
        disabled={saving}
        sectionClassName={SECTION_CLASS}
        inputClassName={INPUT_CLASS}
        linkPlaceholder="https://example.com/your-panorama.jpg"
      />

      <div className={SECTION_CLASS}>
        <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Visitor Information Management</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create multilingual categories, then add multilingual visitor information items inside each one.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateCategoryModal}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <FontAwesomeIcon icon={faPlus} />
            Add New Category
          </button>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {filteredCategories.map((category) => {
            const primaryCategoryTranslation = getPreferredCategoryTranslation(category);
            const categoryTheme = getCategoryTheme(category);
            const categoryImageUrl = getCategoryImageUrl(category);

            return (
              <section
                key={category.id}
                className={`overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br ${categoryTheme.panel} shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg`}
              >
                <div className="border-b border-slate-200/80 px-5 py-5">
                  <div className="flex items-start gap-4">
                    <div className="cursor-grab p-2 text-slate-400 transition-colors hover:text-slate-600">
                      <div className="grid grid-cols-2 gap-1">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <span key={index} className="h-1.5 w-1.5 rounded-full bg-current" />
                        ))}
                      </div>
                    </div>

                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm">
                      {categoryImageUrl ? (
                        <img
                          src={categoryImageUrl}
                          alt={primaryCategoryTranslation?.title || category.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className={`flex h-full w-full items-center justify-center ${categoryTheme.iconWrap}`}>
                          <FontAwesomeIcon icon={categoryTheme.icon} className="h-5 w-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-semibold leading-tight text-slate-800">
                          {primaryCategoryTranslation?.title || category.title}
                        </h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${categoryTheme.badge}`}>
                          {getCategoryLayoutVariant(category)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            category.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {category.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="rounded-full bg-white/80 px-2.5 py-1 font-medium text-slate-600">
                          {category.items.length} items
                        </span>
                        <span className="rounded-full bg-white/80 px-2.5 py-1 font-medium text-slate-600">
                          Code: {category.category_code}
                        </span>
                        <span className="rounded-full bg-white/80 px-2.5 py-1 font-medium text-slate-600">
                          Order: {category.display_order ?? 0}
                        </span>
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">
                        {primaryCategoryTranslation?.description || 'Use this block to organize visitor-facing information.'}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openEditCategoryModal(category)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <FontAwesomeIcon icon={faPenToSquare} className="w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-medium text-white transition-colors hover:bg-red-700"
                      >
                        <FontAwesomeIcon icon={faTrashCan} className="w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/80 px-5 py-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Information Items</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Add schedules, rules, directions, FAQs, or quick visitor notes here.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openCreateItemModal(category)}
                      className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                      Add Item
                    </button>
                  </div>

                  {category.items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                      No items yet. Add the first item for this category.
                    </div>
                  ) : (
                    <div className="space-y-3">{category.items.map((item) => renderVisitorInfoItem(category, item))}</div>
                  )}
                </div>
              </section>
            );
          })}

          {filteredCategories.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              No categories match the current filter.
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          <FontAwesomeIcon icon={faFloppyDisk} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="flex items-center gap-2 rounded-md border border-slate-600 px-6 py-2 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faArrowRotateLeft} />
          Cancel
        </button>
      </div>

      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {editingCategory ? 'Edit Category' : 'Create Category'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-md text-2xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6 overflow-x-auto border-b border-slate-200">
                <div className="flex w-max min-w-full gap-2 whitespace-nowrap pr-2">
                  {locales.map((locale) => (
                    <button
                      key={locale}
                      type="button"
                      onClick={() => setActiveCategoryLocale(locale)}
                      className={`shrink-0 border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
                        activeCategoryLocale === locale
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {locale.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={currentCategoryTranslation.title}
                    onChange={(event) => updateCategoryTranslation(activeCategoryLocale, 'title', event.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Ex: Opening Hours, Park Rules, Directions"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Description (Optional)</label>
                  <textarea
                    value={currentCategoryTranslation.description}
                    onChange={(event) =>
                      updateCategoryTranslation(activeCategoryLocale, 'description', event.target.value)
                    }
                    rows={3}
                    className={INPUT_CLASS}
                    placeholder="Enter a brief description..."
                  />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Code (Internal) <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={categoryDraft.category_code}
                    onChange={(event) => updateCategoryDraft('category_code', event.target.value)}
                    className={INPUT_CLASS}
                    placeholder="e.g., opening_hours"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Layout Type</label>
                  <select
                    value={categoryDraft.item_layout}
                    onChange={(event) => updateCategoryDraft('item_layout', event.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="list">List</option>
                    <option value="grid">Grid</option>
                    <option value="faq">FAQ</option>
                    <option value="timeline">Timeline</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Display Order</label>
                  <input
                    value={categoryDraft.display_order}
                    onChange={(event) => updateCategoryDraft('display_order', event.target.value)}
                    className={INPUT_CLASS}
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={categoryDraft.is_active ? 'active' : 'inactive'}
                    onChange={(event) => updateCategoryDraft('is_active', event.target.value === 'active')}
                    className={INPUT_CLASS}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <FontAwesomeIcon icon={faImages} />
                  Category Image
                </label>

                <div className="mb-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCategoryMediaPickerOpen(true)}
                    className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                  >
                    <FontAwesomeIcon icon={faImages} />
                    {categoryDraft.image_media_id ? 'Change Image' : 'Select Image'}
                  </button>
                  {categoryDraft.image_media_id && (
                    <button
                      type="button"
                      onClick={() => updateCategoryDraft('image_media_id', null)}
                      className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {categoryImagePreviewUrl && (
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <img
                      src={categoryImagePreviewUrl}
                      alt="Category preview"
                      className="h-40 w-40 rounded-md object-cover"
                    />
                  </div>
                )}

                <p className="flex items-start gap-2 text-sm text-slate-500">
                  <span>Info</span>
                  <span>Recommended: Square image (1:1 ratio) for best display</span>
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-4 border-t border-slate-200 bg-slate-50 p-6">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="rounded-md border border-slate-600 px-6 py-2 text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCategory}
                disabled={modalSaving}
                className="rounded-md bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {modalSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MediaPickerModal
        isOpen={isCategoryMediaPickerOpen}
        onClose={() => setIsCategoryMediaPickerOpen(false)}
        onSelect={(mediaId) => {
          updateCategoryDraft('image_media_id', mediaId);
          setIsCategoryMediaPickerOpen(false);
        }}
        title="Select Category Image"
        kind="image"
        source="restaurant"
        folder="visitor-information"
      />

      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {editingItemId ? 'Edit Item' : 'Create Item'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-md text-2xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6 overflow-x-auto border-b border-slate-200">
                <div className="flex w-max min-w-full gap-2 whitespace-nowrap pr-2">
                  {locales.map((locale) => (
                    <button
                      key={locale}
                      type="button"
                      onClick={() => setActiveItemLocale(locale)}
                      className={`shrink-0 border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
                        activeItemLocale === locale
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      {locale.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {activeItemCategory && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    Adding item to <span className="font-semibold">{getPreferredCategoryTranslation(activeItemCategory)?.title || activeItemCategory.title}</span>
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Item Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={currentItemTranslation.title}
                    onChange={(event) => updateItemTranslation(activeItemLocale, 'title', event.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Enter item title"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Subtitle / Value</label>
                  <input
                    value={currentItemTranslation.subtitle}
                    onChange={(event) => updateItemTranslation(activeItemLocale, 'subtitle', event.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Optional short value or supporting text"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Description (Optional)</label>
                  <textarea
                    value={currentItemTranslation.description}
                    onChange={(event) => updateItemTranslation(activeItemLocale, 'description', event.target.value)}
                    rows={4}
                    className={INPUT_CLASS}
                    placeholder="Enter a brief description..."
                  />
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-sm font-semibold text-slate-800">Publishing</p>
                <div className="grid gap-3">
                  <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={itemDraft.is_active}
                      onChange={(event) => updateItemDraft('is_active', event.target.checked)}
                    />
                    Active item
                  </label>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex justify-end gap-4 border-t border-slate-200 bg-slate-50 p-6">
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="rounded-md border border-slate-600 px-6 py-2 text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItem}
                disabled={modalSaving}
                className="rounded-md bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {modalSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorInformationPage;

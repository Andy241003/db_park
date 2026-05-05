import { Form, Input, Popconfirm } from 'antd';
import { Edit, Eye, GripVertical, Plus, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import MediaSelectionSection from '../../components/MediaSelectionSection';
import VR360SettingsSection from '../../components/VR360SettingsSection';
import { cafeDiningApi, cafeLanguagesApi, cafeServicesApi, cafeSettingsApi, type Service, type ServiceCreate, type ServiceTranslation } from '../../services/restaurantApi';
import { getApiBaseUrl } from '../../utils/api';

const { TextArea } = Input;

const SUPPORT_SERVICE_TYPES = [
  { value: 'room_service', label: 'Room Service' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'concierge', label: 'Concierge' },
  { value: 'airport_transfer', label: 'Airport Transfer' },
  { value: 'spa_service', label: 'Spa Service' },
  { value: 'tour_booking', label: 'Tour Booking' },
  { value: 'car_rental', label: 'Car Rental' },
  { value: 'babysitting', label: 'Babysitting' },
  { value: 'other', label: 'Other' },
];

const DINING_SERVICE_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'food_court', label: 'Food Court' },
  { value: 'snack_bar', label: 'Snack Bar' },
  { value: 'beverage_kiosk', label: 'Beverage Kiosk' },
  { value: 'dessert_shop', label: 'Dessert Shop' },
  { value: 'other', label: 'Other' },
];

const LANGUAGE_CONFIG: Record<string, { name: string; flag: string; shortLabel: string }> = {
  vi: { name: 'Vietnamese', flag: 'VN', shortLabel: 'VI' },
  en: { name: 'English', flag: 'GB', shortLabel: 'EN' },
  zh: { name: 'Chinese', flag: 'CN', shortLabel: 'ZH' },
  'zh-TW': { name: 'Traditional Chinese', flag: 'TW', shortLabel: 'ZH-TW' },
  yue: { name: 'Cantonese', flag: 'HK', shortLabel: 'YUE' },
};

const getLanguageDisplay = (locale: string) => {
  return LANGUAGE_CONFIG[locale] || { name: locale.toUpperCase(), flag: locale.toUpperCase(), shortLabel: locale.toUpperCase() };
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

type ServicesPageMode = 'services' | 'dining';

interface CafeServicesProps {
  pageMode?: ServicesPageMode;
}

interface ServiceFormValues {
  code: string;
  service_type: string;
  availability: string;
  price_information: string;
  vr360_tour_url: string;
  booking_url: string;
  is_active: boolean;
  display_order: number;
}

const getEmptyServiceFormValues = (defaultServiceType = ''): ServiceFormValues => ({
  code: '',
  service_type: defaultServiceType,
  availability: '',
  price_information: '',
  vr360_tour_url: '',
  booking_url: '',
  is_active: true,
  display_order: 0,
});

const CafeServices: React.FC<CafeServicesProps> = ({ pageMode = 'services' }) => {
  const isDiningPage = pageMode === 'dining';
  const pageTitle = isDiningPage ? 'Dining Management' : 'Services Management';
  const addButtonLabel = isDiningPage ? 'Add New Dining' : 'Add New Service';
  const itemNameLabel = isDiningPage ? 'Dining Name' : 'Service Name';
  const emptyLabel = isDiningPage ? 'No dining items found' : 'No services found';
  const emptyHint = isDiningPage ? 'Try another filter or add a new dining item.' : 'Try another filter or add a new service.';
  const filterAllLabel = isDiningPage ? 'All Dining Items' : 'All Services';
  const settingsPrefix = isDiningPage ? 'dining' : 'services';
  const typeOptions = isDiningPage ? DINING_SERVICE_TYPES : SUPPORT_SERVICE_TYPES;
  const dataApi = isDiningPage ? cafeDiningApi : cafeServicesApi;
  const allowedTypeValues = new Set(typeOptions.map((item) => item.value));
  // Services state
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm] = Form.useForm();
  const [serviceFormValues, setServiceFormValues] = useState<ServiceFormValues>(() =>
    getEmptyServiceFormValues(typeOptions[0]?.value)
  );
  const [isSavingService, setIsSavingService] = useState(false);

  // Language state
  const [supportedLanguages, setSupportedLanguages] = useState<string[]>(['vi', 'en']);
  const [currentServiceLocale, setCurrentServiceLocale] = useState('vi');
  const [serviceTranslations, setServiceTranslations] = useState<Record<string, ServiceTranslation>>({});

  // Media state
  const [selectedImageIds, setSelectedImageIds] = useState<number[]>([]);
  const [isDisplaying, setIsDisplaying] = useState(true);
  const [vr360Link, setVr360Link] = useState('');
  const [vrTitle, setVrTitle] = useState('');
  const [savingDisplayStatus, setSavingDisplayStatus] = useState(false);
  const [savingVR, setSavingVR] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Load initial data
  useEffect(() => {
    loadLanguages();
    loadServices();
    loadSectionSettings();
  }, []);

  useEffect(() => {
    const handleLanguagesUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ supportedLanguages?: string[] }>;
      const nextLanguages = customEvent.detail?.supportedLanguages;
      if (nextLanguages && nextLanguages.length > 0) {
        setSupportedLanguages(nextLanguages);
        setCurrentServiceLocale((prev) => nextLanguages.includes(prev) ? prev : nextLanguages[0]);
      }
    };

    window.addEventListener('restaurant-languages-updated', handleLanguagesUpdated as EventListener);
    return () => window.removeEventListener('restaurant-languages-updated', handleLanguagesUpdated as EventListener);
  }, []);

  const loadLanguages = async () => {
    try {
      const langs = await cafeLanguagesApi.getLanguageCodes();
      if (langs && langs.length > 0) {
        setSupportedLanguages(langs);
        setCurrentServiceLocale(langs[0]);
      }
    } catch (error) {
      console.error('Failed to load languages:', error);
    }
  };

  const loadServices = async () => {
    setServicesLoading(true);
    try {
      const data = await dataApi.getServices();
      setServices(data.filter((item) => allowedTypeValues.has(item.service_type)));
    } catch (error) {
      toast.error('Failed to load services');
      console.error(error);
    } finally {
      setServicesLoading(false);
    }
  };

  const updateServiceFormValue = <K extends keyof ServiceFormValues>(
    field: K,
    value: ServiceFormValues[K],
  ) => {
    setServiceFormValues((prev) => ({ ...prev, [field]: value }));
    serviceForm.setFieldValue(field, value);
  };

  const handleAddService = () => {
    setEditingService(null);
    setServiceTranslations({});
    setSelectedImageIds([]);
    setCurrentServiceLocale(supportedLanguages[0] || 'vi');
    const nextFormValues = getEmptyServiceFormValues(typeOptions[0]?.value);
    setServiceFormValues(nextFormValues);
    serviceForm.setFieldsValue(nextFormValues);
    setModalVisible(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setSelectedImageIds(service.primary_image_media_id ? [service.primary_image_media_id] : []);
    
    const translationMap: Record<string, ServiceTranslation> = {};
    service.translations.forEach(t => {
      translationMap[t.locale] = t;
    });
    setServiceTranslations(translationMap);
    setCurrentServiceLocale(supportedLanguages[0] || 'vi');

    const nextFormValues: ServiceFormValues = {
      code: service.code,
      service_type: service.service_type,
      availability: service.availability || '',
      price_information: service.price_information || '',
      vr360_tour_url: service.vr360_tour_url || '',
      booking_url: service.booking_url || '',
      is_active: service.is_active,
      display_order: service.display_order || 0,
    };
    setServiceFormValues(nextFormValues);
    serviceForm.setFieldsValue(nextFormValues);

    setModalVisible(true);
  };

  const handleServiceSubmit = async () => {
    if (isSavingService) {
      return;
    }

    try {
      setIsSavingService(true);
      const formValues = serviceFormValues;

      const code = typeof formValues.code === 'string' ? formValues.code.trim() : '';
      const serviceType = typeof formValues.service_type === 'string' ? formValues.service_type.trim() : '';

      if (!code) {
        toast.error('Service code is required');
        return;
      }

      if (!serviceType) {
        toast.error('Service type is required');
        return;
      }

      const translations: ServiceTranslation[] = Object.values(serviceTranslations)
        .map((translation) => ({
          locale: translation.locale,
          name: typeof translation.name === 'string' ? translation.name.trim() : '',
          description: typeof translation.description === 'string' ? translation.description.trim() : '',
        }))
        .filter((translation) => translation.locale && translation.name);

      if (translations.length === 0) {
        toast.error('Please add at least one translation with a service name');
        return;
      }

      const payload: ServiceCreate = {
        code,
        service_type: serviceType,
        availability: formValues.availability.trim() || undefined,
        price_information: formValues.price_information.trim() || undefined,
        vr360_tour_url: formValues.vr360_tour_url.trim() || undefined,
        booking_url: formValues.booking_url.trim() || undefined,
        primary_image_media_id: selectedImageIds[0] || undefined,
        is_active: formValues.is_active,
        display_order: Number(formValues.display_order) || 0,
        translations,
      };

      if (editingService) {
        await dataApi.updateService(editingService.id, payload);
        toast.success(isDiningPage ? 'Dining updated successfully' : 'Service updated successfully');
      } else {
        await dataApi.createService(payload);
        toast.success(isDiningPage ? 'Dining created successfully' : 'Service created successfully');
      }

      setModalVisible(false);
      loadServices();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const message =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((item) => item?.msg || JSON.stringify(item)).join(', ')
            : error instanceof Error
              ? error.message
              : 'Failed to save service';

      toast.error(message);
      console.error('Service save failed:', error?.response?.data || error);
    } finally {
      setIsSavingService(false);
    }
  };

  const loadSectionSettings = async () => {
    try {
      const settings = await cafeSettingsApi.getSettings();
      setIsDisplaying(settings.settings_json?.[`${settingsPrefix}_is_displaying`] ?? true);
      setVr360Link(settings.settings_json?.[`${settingsPrefix}_vr360_link`] || '');
      setVrTitle(settings.settings_json?.[`${settingsPrefix}_vr_title`] || '');
    } catch (error) {
      console.error(`Failed to load ${settingsPrefix} section settings:`, error);
    }
  };

  const handleDeleteService = async (serviceId: number) => {
    try {
      await dataApi.deleteService(serviceId);
      toast.success(isDiningPage ? 'Dining deleted successfully' : 'Service deleted successfully');
      loadServices();
    } catch (error) {
      toast.error('Failed to delete service');
      console.error(error);
    }
  };

  const handleSelectedImages = (mediaIds: number[]) => {
    setSelectedImageIds(mediaIds.length > 0 ? [mediaIds[0]] : []);
    toast.success('Image selected successfully');
  };

  const handleDisplayToggle = async (value: boolean) => {
    try {
      setSavingDisplayStatus(true);
      const currentSettings = await cafeSettingsApi.getSettings();
      await cafeSettingsApi.updateSettings({
        settings_json: {
          ...(currentSettings.settings_json || {}),
          [`${settingsPrefix}_is_displaying`]: value,
        },
      });
      setIsDisplaying(value);
      toast.success(value ? `${isDiningPage ? 'Dining' : 'Services'} section enabled` : `${isDiningPage ? 'Dining' : 'Services'} section hidden`);
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
          [`${settingsPrefix}_vr360_link`]: nextLink,
          [`${settingsPrefix}_vr_title`]: nextTitle,
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

  const filteredServices = services.filter((service) => {
    if (statusFilter === 'active') return service.is_active;
    if (statusFilter === 'inactive') return !service.is_active;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
          <h2 className="text-xl font-bold text-slate-800">Display Status - {isDiningPage ? 'Dining' : 'Services'} Section</h2>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${isDisplaying ? 'text-green-600' : 'text-slate-500'}`}>
              {isDisplaying ? 'Displaying' : 'Hidden'}
            </span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={isDisplaying}
                onChange={(e) => void handleDisplayToggle(e.target.checked)}
                disabled={savingDisplayStatus}
              />
              <div className="h-6 w-11 rounded-full bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white disabled:opacity-50 disabled:cursor-not-allowed" />
            </label>
          </div>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          When hidden, the {isDiningPage ? 'dining' : 'services'} section can remain manageable in admin without appearing in the public park experience.
        </div>
      </div>

      <VR360SettingsSection
        linkValue={vr360Link}
        titleValue={vrTitle}
        onLinkChange={(value) => void handleVR360Change('link', value)}
        onTitleChange={(value) => void handleVR360Change('title', value)}
        disabled={savingVR}
        sectionClassName="rounded-xl bg-white p-6 shadow-md"
        inputClassName="w-full rounded-md border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
        linkPlaceholder="https://example.com/your-panorama.jpg"
      >
          {vr360Link && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-slate-700">VR360 Preview</h3>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <div className="relative h-[360px] w-full">
                  <iframe
                    src={vr360Link}
                    className="absolute left-0 top-0 h-full w-full"
                    allowFullScreen
                    title={vrTitle || 'Services VR360 Preview'}
                    allow="xr-spatial-tracking; gyroscope; accelerometer"
                  />
                </div>
              </div>
            </div>
          )}
      </VR360SettingsSection>

      <div className="rounded-xl bg-white p-6 shadow-md">
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{pageTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isDiningPage ? 'Manage your dining entries with multi-language support' : 'Manage your amusement park services with multi-language support'}
            </p>
          </div>
          <button
            onClick={handleAddService}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {addButtonLabel}
          </button>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="rounded-md border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{filterAllLabel}</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {servicesLoading ? (
          <div className="p-8 text-center text-slate-600">Loading {isDiningPage ? 'dining items' : 'services'}...</div>
        ) : filteredServices.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mb-2 text-slate-400">{emptyLabel}</div>
            <p className="mb-4 text-sm text-slate-500">{emptyHint}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredServices.map((service) => {
              const serviceName =
                service.translations.find((t) => t.locale === 'vi')?.name ||
                service.translations.find((t) => t.locale === 'en')?.name ||
                'Untitled';
              const serviceDescription =
                service.translations.find((t) => t.locale === 'vi')?.description ||
                service.translations.find((t) => t.locale === 'en')?.description ||
                'No description yet';
              const serviceTypeLabel =
                typeOptions.find((t) => t.value === service.service_type)?.label || service.service_type;

              return (
                <div
                  key={service.id}
                  className="cursor-grab rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md active:cursor-grabbing"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="rounded-md p-2 text-slate-400 hover:text-slate-600">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    <div className="flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 lg:w-52">
                      {service.primary_image_media_id ? (
                        <img
                          src={`${getApiBaseUrl()}/media/${service.primary_image_media_id}/view`}
                          alt={serviceName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-400">
                          <Eye className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <h3 className="truncate text-lg font-semibold text-slate-800">{serviceName}</h3>
                      </div>

                      <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                        <span className="font-medium text-blue-600">Order: {service.display_order}</span>
                        <span>{serviceTypeLabel}</span>
                        <span>Status: {service.is_active ? 'active' : 'inactive'}</span>
                        <span>Code: {service.code}</span>
                      </div>

                      <p className="mt-2 line-clamp-1 text-sm text-slate-500">{serviceDescription}</p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                          {serviceTypeLabel}
                        </span>
                        {service.availability && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                            {service.availability}
                          </span>
                        )}
                        {service.price_information && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                            {service.price_information}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-3 self-start md:self-auto">
                      <button
                        type="button"
                        title="Edit service"
                        onClick={() => handleEditService(service)}
                        className="flex items-center gap-2 rounded-md border border-slate-600 px-4 py-2 text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <Popconfirm
                        title="Delete Service"
                        description="Are you sure you want to delete this service?"
                        onConfirm={() => handleDeleteService(service.id)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <button
                          type="button"
                          title="Delete service"
                          className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </Popconfirm>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Service Modal - VR Hotel Style */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${
          modalVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setModalVisible(false)}
      />

      {modalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-6">
              <h3 className="text-xl font-bold text-slate-800">
                {editingService ? (isDiningPage ? 'Edit Dining' : 'Edit Service') : (isDiningPage ? 'Add New Dining' : 'Add New Service')}
              </h3>
              <button
                type="button"
                onClick={() => setModalVisible(false)}
                className="flex h-10 w-10 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <Form
                form={serviceForm}
                onFinish={handleServiceSubmit}
              >
                {/* Language Tabs */}
                <div className="mb-6 overflow-x-auto border-b border-slate-200 pb-0">
                  <div className="flex w-max min-w-full gap-2 whitespace-nowrap pr-2">
                    {supportedLanguages.map((locale) => {
                      const languageDisplay = getLanguageDisplay(locale);

                      return (
                        <button
                          key={locale}
                          type="button"
                          onClick={() => setCurrentServiceLocale(locale)}
                          className={`shrink-0 border-b-2 px-3 py-1.5 text-sm font-medium transition-colors ${
                            currentServiceLocale === locale
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          {languageDisplay.shortLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Translations Section */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {itemNameLabel} {currentServiceLocale === 'vi' && <span className="text-red-500">*</span>}
                    </label>
                    <Input
                      placeholder="e.g., MAIA SPA"
                      value={serviceTranslations[currentServiceLocale]?.name || ''}
                      onChange={(e) => {
                        setServiceTranslations(prev => ({
                          ...prev,
                          [currentServiceLocale]: {
                            ...prev[currentServiceLocale],
                            locale: currentServiceLocale,
                            name: e.target.value
                          }
                        }));
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description (Optional)
                    </label>
                    <TextArea
                      rows={3}
                      placeholder="Enter a detailed service description..."
                      value={serviceTranslations[currentServiceLocale]?.description || ''}
                      onChange={(e) => {
                        setServiceTranslations(prev => ({
                          ...prev,
                          [currentServiceLocale]: {
                            ...prev[currentServiceLocale],
                            locale: currentServiceLocale,
                            description: e.target.value
                          }
                        }));
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Settings Section */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Code *</label>
                    <input
                      value={serviceFormValues.code ?? ''}
                      onChange={(e) => updateServiceFormValue('code', e.target.value)}
                      placeholder={isDiningPage ? 'e.g., DIN01' : 'e.g., SV01'}
                      className="w-full rounded-md border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Service Type *</label>
                    <select
                      value={serviceFormValues.service_type ?? ''}
                      onChange={(e) => updateServiceFormValue('service_type', e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select service type</option>
                      {typeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Availability</label>
                    <input
                      value={serviceFormValues.availability ?? ''}
                      onChange={(e) => updateServiceFormValue('availability', e.target.value)}
                      placeholder="e.g., 24/7, 9:00 AM - 10:00 PM"
                      className="w-full rounded-md border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Price Information</label>
                    <input
                      value={serviceFormValues.price_information ?? ''}
                      onChange={(e) => updateServiceFormValue('price_information', e.target.value)}
                      placeholder="e.g., Starting from $50, Free, Upon request"
                      className="w-full rounded-md border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">VR360 Tour Link</label>
                    <input
                      type="url"
                      value={serviceFormValues.vr360_tour_url ?? ''}
                      onChange={(e) => updateServiceFormValue('vr360_tour_url', e.target.value)}
                      placeholder="https://example.com/vr360-tour or https://youtube.com/watch?v=..."
                      className="w-full rounded-md border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">Enter the VR URL for this service item, if available.</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Booking URL</label>
                    <input
                      type="url"
                      value={serviceFormValues.booking_url ?? ''}
                      onChange={(e) => updateServiceFormValue('booking_url', e.target.value)}
                      placeholder="https://booking.example.com/service-reservation"
                      className="w-full rounded-md border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">Enter the direct booking/reservation URL for this service</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Display Order</label>
                    <input
                      type="number"
                      min={0}
                      value={serviceFormValues.display_order ?? 0}
                      onChange={(e) => updateServiceFormValue('display_order', Number(e.target.value))}
                      className="w-full rounded-md border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={serviceFormValues.is_active === false ? 'inactive' : 'active'}
                    onChange={(e) => updateServiceFormValue('is_active', e.target.value === 'active')}
                    className="w-full rounded-md border border-slate-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Image Section */}
                <div className="mt-6">
                  <MediaSelectionSection
                    label={isDiningPage ? 'Dining Image' : 'Service Image'}
                    mediaIds={selectedImageIds}
                    primaryImageMediaId={selectedImageIds[0]}
                    onRemove={(mediaId) => setSelectedImageIds((prev) => prev.filter((id) => id !== mediaId))}
                    onSetPrimary={(mediaId) => setSelectedImageIds((prev) => prev.includes(mediaId) ? [mediaId, ...prev.filter((id) => id !== mediaId)] : [mediaId, ...prev])}
                    onSelectMultiple={handleSelectedImages}
                    pickerTitle={isDiningPage ? 'Select Dining Image' : 'Select Service Image'}
                    pickerKind="image"
                    pickerSource="restaurant"
                    pickerFolder={isDiningPage ? 'dining' : 'services'}
                    buttonText={isDiningPage ? 'Select Dining Image' : 'Select Service Image'}
                    buttonClassName="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    gridColumns={4}
                    gridItemHeight={112}
                  />
                  <p className="mt-4 text-sm text-slate-500">
                    {isDiningPage
                      ? 'Use a quality dining photo for better presentation in the dining section.'
                      : 'Use a quality service photo for better presentation in the services section.'}
                  </p>
                </div>
              </Form>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 flex justify-end gap-4 border-t border-slate-200 bg-slate-50 p-6">
              <button
                type="button"
                onClick={() => setModalVisible(false)}
                disabled={isSavingService}
                className="rounded-md border border-slate-600 px-6 py-2 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => serviceForm.submit()}
                disabled={isSavingService}
                className="rounded-md bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
              >
                {isSavingService ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CafeServices;




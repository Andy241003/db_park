import { faCircleInfo, faVrCardboard } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

type VR360SettingsSectionProps = {
  linkValue: string;
  titleValue: string;
  onLinkChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  disabled?: boolean;
  sectionClassName?: string;
  inputClassName?: string;
  title?: string;
  linkLabel?: string;
  titleLabel?: string;
  linkPlaceholder?: string;
  titlePlaceholder?: string;
  helperText?: string;
  children?: React.ReactNode;
};

const DEFAULT_INPUT_CLASS =
  'w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed';

const VR360SettingsSection: React.FC<VR360SettingsSectionProps> = ({
  linkValue,
  titleValue,
  onLinkChange,
  onTitleChange,
  disabled = false,
  sectionClassName = 'bg-white rounded-lg shadow p-6',
  inputClassName = DEFAULT_INPUT_CLASS,
  title = 'VR360 Settings',
  linkLabel = 'Link VR360 Panorama / YouTube Video',
  titleLabel = 'VR Tour Title',
  linkPlaceholder = 'https://example.com/your-panorama.jpg',
  titlePlaceholder = 'Enter VR tour title',
  helperText = 'Enter the URL to a 360 panorama image (recommended: equirectangular JPG, minimum 4096x2048px)',
  children,
}) => {
  return (
    <div className={sectionClassName}>
      <div className="mb-6 flex items-center gap-3 border-b border-slate-200 pb-4">
        <FontAwesomeIcon icon={faVrCardboard} className="text-xl text-purple-600" />
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{linkLabel}</label>
          <input
            type="url"
            placeholder={linkPlaceholder}
            className={inputClassName}
            value={linkValue}
            onChange={(event) => onLinkChange(event.target.value)}
            disabled={disabled}
          />
          <p className="mt-2 flex items-start gap-2 text-sm text-slate-500">
            <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5" />
            <span>{helperText}</span>
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">{titleLabel}</label>
          <input
            type="text"
            placeholder={titlePlaceholder}
            className={inputClassName}
            value={titleValue}
            onChange={(event) => onTitleChange(event.target.value)}
            disabled={disabled}
          />
        </div>

        {children}
      </div>
    </div>
  );
};

export default VR360SettingsSection;

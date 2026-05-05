import { message, Popconfirm } from 'antd';
import {
    AlertCircle,
    Car,
    Check,
    CheckSquare,
    Download,
    Eye,
    File,
    FileText,
    Grid,
    Image,
    List,
    Loader2,
    Play,
    Search,
    Sparkles,
    Trash2,
    Upload,
    Utensils,
    Video,
    Waves,
    Wifi,
    X
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { mediaApi, type MediaFile as ApiMediaFile } from '../services/mediaApi';
import { getApiBaseUrl } from '../utils/api';

interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document';
  size: string;
  sizeBytes: number;
  folder: string;
  preview?: string;
  dimensions?: string;
  uploadDate: string;
  modifiedDate: string;
  url?: string;
  contentType?: string;
}

interface MediaStats {
  total_files: number;
  total_size: number;
  images_count: number;
  videos_count: number;
  documents_count: number;
  storage_used_mb: number;
}

interface IconFile {
  id: string;
  name: string;
  preview: string;
}

interface MediaLibraryProps {
  defaultSource?: 'travel' | 'vr_hotel' | 'restaurant' | '';
}

export default function MediaLibrary({ defaultSource = '' }: MediaLibraryProps) {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState<'all' | 'image' | 'video' | 'document'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [folderFilter, setFolderFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState(defaultSource); // Initialize with defaultSource
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [currentMediaFile, setCurrentMediaFile] = useState<MediaFile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<MediaFile | null>(null);
  const [editForm, setEditForm] = useState<{filename: string; altText: string; kind: 'image' | 'video' | 'document'}>({
    filename: '',
    altText: '',
    kind: 'image'
  });
  const [icons, setIcons] = useState<IconFile[]>([
    { id: '1', name: 'wifi.png', preview: 'wifi' },
    { id: '2', name: 'pool.svg', preview: 'waves' },
    { id: '3', name: 'restaurant.png', preview: 'utensils' },
    { id: '4', name: 'spa.png', preview: 'sparkles' },
    { id: '5', name: 'parking.svg', preview: 'car' }
  ]);
  const [folders, setFolders] = useState<string[]>(['rooms', 'facilities', 'food', 'documents']);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  // Convert API response to frontend format
  const convertApiMediaFile = (apiFile: ApiMediaFile): MediaFile => {
    const getFileType = (kind: string): 'image' | 'video' | 'document' => {
      switch (kind.toLowerCase()) {
        case 'image': return 'image';
        case 'video': return 'video';
        case 'file':
        case 'document':
        case 'audio':
        default: return 'document';
      }
    };

    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getFolder = (fileKey: string): string => {
      if (fileKey.toLowerCase().includes('room')) return 'rooms';
      if (fileKey.toLowerCase().includes('pool') || fileKey.toLowerCase().includes('spa')) return 'facilities';
      if (fileKey.toLowerCase().includes('food') || fileKey.toLowerCase().includes('restaurant')) return 'food';
      return 'documents';
    };

    // Generate file URL using the API endpoint with media ID
    const API_BASE_URL = getApiBaseUrl();
    const fileUrl = `${API_BASE_URL}/media/${apiFile.id}/download`;
    const viewUrl = `${API_BASE_URL}/media/${apiFile.id}/view`; // Public endpoint for viewing
    
    // For videos, we don't want to use the file URL as preview to avoid loading full video
    const fileType = getFileType(apiFile.kind);
    const preview = fileType === 'image' ? viewUrl : undefined; // Use view endpoint for preview

    return {
      id: apiFile.id.toString(),
      name: apiFile.original_filename || apiFile.file_key.split('/').pop() || apiFile.file_key, // Use original_filename if available
      type: fileType,
      size: formatFileSize(apiFile.size_bytes),
      sizeBytes: apiFile.size_bytes / 1024 / 1024, // Convert to MB
      folder: getFolder(apiFile.file_key),
      preview: preview,
      url: fileUrl,
      contentType: apiFile.mime_type,
      uploadDate: new Date(apiFile.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      modifiedDate: apiFile.updated_at ? new Date(apiFile.updated_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }) : 'N/A'
    };
  };

  // Load media files from API
  const loadMediaFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      // Pass sourceFilter to API to get filtered results from backend
      const apiFiles = await mediaApi.getMediaFiles(undefined, 0, 100, sourceFilter);
      const convertedFiles = apiFiles.map(convertApiMediaFile);
      setMedia(convertedFiles);
    } catch (err: any) {
      setError('Failed to load media files: ' + (err.message || 'Unknown error'));
      console.error('Error loading media files:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load media stats
  const loadMediaStats = async () => {
    try {
      // For now, calculate stats from loaded media
      // In the future, this could be a separate API call
      const totalFiles = media.length;
      const totalSize = media.reduce((sum, file) => sum + file.sizeBytes, 0);
      const imagesCount = media.filter(f => f.type === 'image').length;
      const videosCount = media.filter(f => f.type === 'video').length;
      const documentsCount = media.filter(f => f.type === 'document').length;

      setStats({
        total_files: totalFiles,
        total_size: totalSize * 1024 * 1024, // Convert back to bytes
        images_count: imagesCount,
        videos_count: videosCount,
        documents_count: documentsCount,
        storage_used_mb: totalSize
      });
    } catch (err) {
      console.error('Error calculating stats:', err);
    }
  };

  // Load data on component mount and when sourceFilter changes
  useEffect(() => {
    loadMediaFiles();
  }, [sourceFilter]);

  // Update stats when media changes
  useEffect(() => {
    loadMediaStats();
  }, [media]);

  const getFilteredMedia = useCallback(() => {
    return media.filter(file => {
      const matchesType = activeFilter === 'all' || file.type === activeFilter;
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFolder = !folderFilter || file.folder === folderFilter;
      
      let matchesSize = true;
      if (sizeFilter === 'small') matchesSize = file.sizeBytes < 1;
      else if (sizeFilter === 'medium') matchesSize = file.sizeBytes >= 1 && file.sizeBytes <= 5;
      else if (sizeFilter === 'large') matchesSize = file.sizeBytes > 5;
      
      return matchesType && matchesSearch && matchesFolder && matchesSize;
    });
  }, [media, activeFilter, searchQuery, folderFilter, sizeFilter]);

  const filteredMedia = getFilteredMedia();

  const getFileIcon = (type: MediaFile['type'], size: 'sm' | 'lg' = 'sm') => {
    const iconSize = size === 'sm' ? 'w-8 h-8' : 'w-12 h-12';
    const iconClass = `${iconSize} text-white`;
    
    switch (type) {
      case 'image':
        return (
          <div className={`${iconSize} bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center`}>
            <Image className={iconClass} />
          </div>
        );
      case 'video':
        return (
          <div className={`${iconSize} bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center`}>
            <Video className={iconClass} />
          </div>
        );
      case 'document':
        return (
          <div className={`${iconSize} bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center`}>
            <FileText className={iconClass} />
          </div>
        );
      default:
        return (
          <div className={`${iconSize} bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center`}>
            <File className={iconClass} />
          </div>
        );
    }
  };

  const getIconComponent = (iconType: string) => {
    switch (iconType) {
      case 'wifi': return <Wifi className="w-8 h-8 text-blue-500" />;
      case 'waves': return <Waves className="w-8 h-8 text-cyan-500" />;
      case 'utensils': return <Utensils className="w-8 h-8 text-red-500" />;
      case 'sparkles': return <Sparkles className="w-8 h-8 text-green-500" />;
      case 'car': return <Car className="w-8 h-8 text-amber-500" />;
      default: return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Check file size limit (100MB per file)
    const maxSize = 100 * 1024 * 1024; // 100MB in bytes
    const fileArray = Array.from(files);
    const oversizedFiles = fileArray.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      const oversizedFileNames = oversizedFiles.map(file => 
        `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`
      ).join('\n');
      const errorMessage = `Following files exceed 100MB limit:\n${oversizedFileNames}`;
      setError(errorMessage);
      message.error(errorMessage);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadPromises = fileArray.map(async (file) => {
        // Determine file kind based on mime type - use lowercase to match backend
        let kind: 'image' | 'video' | 'file' = 'file';
        if (file.type.startsWith('image/')) kind = 'image';
        else if (file.type.startsWith('video/')) kind = 'video';
        // All other files use 'file' kind

        // Pass source from current filter context
        return await mediaApi.uploadFile(file, kind, undefined, sourceFilter);
      });

      const uploadResults = await Promise.all(uploadPromises);
      
      // Reload media files to show the new uploads
      await loadMediaFiles();
      
      // Show success message
      const successMessage = `Successfully uploaded ${uploadResults.length} file(s)`;
      message.success(successMessage);
      
    } catch (err: any) {
      const errorMessage = `Failed to upload files: ${err.message || 'Unknown error'}`;
      setError(errorMessage);
      message.error(errorMessage);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleIconUpload = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    if (icons.length + fileArray.length > 10) {
      alert("You can only upload up to 10 icons.");
      return;
    }

    fileArray.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newIcon: IconFile = {
            id: Date.now() + Math.random().toString(),
            name: file.name,
            preview: e.target?.result as string
          };
          setIcons(prev => [...prev, newIcon]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleDrop = useCallback((e: React.DragEvent, type: 'media' | 'icon' = 'media') => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (type === 'media') {
      handleFileUpload(files);
    } else {
      handleIconUpload(files);
    }
  }, [icons.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const selectAllFiles = () => {
    if (selectedFiles.size === filteredMedia.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredMedia.map(file => file.id)));
    }
  };

  const viewMedia = (file: MediaFile) => {
    setCurrentMediaFile(file);
    setIsModalOpen(true);
  };

  const downloadMedia = async (file: MediaFile) => {
    try {
      // Always use API download for better control
      if (file.id && !isNaN(Number(file.id))) {
        await mediaApi.downloadMediaFile(Number(file.id), file.name);
        message.success(`Started downloading ${file.name}`);
      } else {
        // Fallback: show alert for mock files
        message.info(`${file.name} is a demo file - download not available`);
      }
    } catch (error) {
      alert(`Failed to download ${file.name}. Please try again.`);
    }
  };

  const deleteMedia = async (fileId: string, fileName: string) => {
    try {
      setLoading(true);
      // Call API to delete file
      await mediaApi.deleteMediaFile(parseInt(fileId));
      
      // Update UI after successful deletion
      setMedia(prev => prev.filter(file => file.id !== fileId));
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
      
      message.success(`${fileName} deleted successfully!`);
    } catch (error) {
      console.error('Error deleting media:', error);
      message.error(`Failed to delete ${fileName}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const deleteIcon = (iconId: string, iconName: string) => {
    if (window.confirm(`Do you want to delete "${iconName}"?`)) {
      setIcons(prev => prev.filter(icon => icon.id !== iconId));
      alert(`"${iconName}" has been deleted.`);
    }
  };

  const bulkDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const deletePromises = Array.from(selectedFiles).map(async (fileId) => {
        return await mediaApi.deleteMediaFile(parseInt(fileId));
      });

      await Promise.all(deletePromises);
      
      // Reload media files to reflect deletions
      await loadMediaFiles();
      
      const deletedCount = selectedFiles.size;
      setSelectedFiles(new Set());
      message.success(`${deletedCount} files deleted successfully!`);
      
    } catch (err: any) {
      const errorMessage = `Failed to delete files: ${err.message || 'Unknown error'}`;
      setError(errorMessage);
      message.error(errorMessage);
      console.error('Delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Single file delete function (for future use)
  // const deleteFile = async (fileId: string) => {
  //   if (!window.confirm('Permanently delete this file? This action cannot be undone.')) {
  //     return;
  //   }

  //   setLoading(true);
  //   setError(null);

  //   try {
  //     await mediaApi.deleteMediaFile(parseInt(fileId));
  //     await loadMediaFiles();
  //     alert('File deleted successfully!');
  //   } catch (err: any) {
  //     const errorMessage = `Failed to delete file: ${err.message || 'Unknown error'}`;
  //     setError(errorMessage);
  //     alert(errorMessage);
  //     console.error('Delete error:', err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const bulkDownload = async () => {
    if (!window.confirm(`Download ${selectedFiles.size} selected files?`)) {
      return;
    }

    const selectedFilesArray = media.filter(file => selectedFiles.has(file.id));
    
    try {
      // Download each file individually
      for (const file of selectedFilesArray) {
        await downloadMedia(file);
        // Small delay between downloads to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setSelectedFiles(new Set());
      alert(`Successfully started download of ${selectedFilesArray.length} files.`);
    } catch (error) {
      console.error('Bulk download error:', error);
      alert('Some files failed to download. Please try again.');
    }
  };

  const createFolder = () => {
    const folderName = window.prompt('Enter folder name:');
    if (folderName && folderName.trim()) {
      const cleanFolderName = folderName.trim().toLowerCase().replace(/\s+/g, '-');
      if (folders.includes(cleanFolderName)) {
        message.error(`Folder "${cleanFolderName}" already exists!`);
        return;
      }
      setFolders(prev => [...prev, cleanFolderName]);
      message.success(`Folder "${cleanFolderName}" created successfully!`);
    }
  };

  const deleteFolder = (folderName: string) => {
    // Check if folder has files
    const filesInFolder = media.filter(file => file.folder === folderName);
    if (filesInFolder.length > 0) {
      message.error(`Cannot delete folder "${folderName}" - it contains ${filesInFolder.length} file(s). Please delete or move the files first.`);
      return;
    }

    // Remove folder from list
    setFolders(prev => prev.filter(f => f !== folderName));
    
    // Reset folder filter if we deleted the currently selected folder
    if (folderFilter === folderName) {
      setFolderFilter('');
    }
    
    message.success(`Folder "${folderName}" deleted successfully!`);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentMediaFile(null);
  };

  const openEditModal = (file: MediaFile) => {
    setEditingFile(file);
    setEditForm({
      filename: file.name,
      altText: file.contentType || '', // Use contentType as alt text initially
      kind: file.type
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingFile(null);
    setEditForm({ filename: '', altText: '', kind: 'image' });
  };

  const handleUpdateFile = async () => {
    if (!editingFile) return;
    
    try {
      setLoading(true);
      
      // Convert frontend kind to backend format
      const backendKind = editForm.kind === 'document' ? 'file' : editForm.kind;
      
      await mediaApi.updateMediaFile(Number(editingFile.id), {
        original_filename: editForm.filename,
        alt_text: editForm.altText,
        kind: backendKind as 'image' | 'video' | 'file'
      });

      // Reload media files to reflect changes
      await loadMediaFiles();
      
      message.success('File details updated successfully!');
      closeEditModal();
      
    } catch (error) {
      console.error('Error updating file:', error);
      message.error('Failed to update file details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}


      {/* Main Content */}
      <div className="p-6">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading Overlay */}
        {(loading || uploading) && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
            <p className="text-blue-700">
              {uploading ? 'Uploading files...' : 'Loading media files...'}
            </p>
          </div>
        )}

        {/* Title and Description */}
        <div className="mb-6 flex items-center justify-between">
          {/* Text bên trái */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Media Library</h2>
            <p className="text-sm text-gray-600 mt-1">
              Store and organize images, videos, documents for your hotel content
            </p>
          </div>

          {/* Button bên phải */}
          <div className="flex items-center gap-3">
        
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats?.total_files || media.length}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Total Files</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">
              {stats ? `${(stats.storage_used_mb).toFixed(1)} MB` : '0 MB'}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Storage Used</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats?.images_count || media.filter(f => f.type === 'image').length}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Images</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats?.videos_count || media.filter(f => f.type === 'video').length}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Videos</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats?.documents_count || media.filter(f => f.type === 'document').length}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Documents</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-white rounded-xl border border-gray-200 overflow-x-auto">
          {[
            { key: 'all', label: 'All Files', icon: null, count: media.length },
            { key: 'image', label: 'Images', icon: Image, count: media.filter(f => f.type === 'image').length },
            { key: 'video', label: 'Videos', icon: Video, count: media.filter(f => f.type === 'video').length },
            { key: 'document', label: 'Documents', icon: FileText, count: media.filter(f => f.type === 'document').length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeFilter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon && <tab.icon className="w-4 h-4" />}
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs min-w-[20px] text-center ${
                activeFilter === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Upload Area */}
        <div
          className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-10 text-center mb-6 cursor-pointer transition-all hover:border-blue-400 hover:bg-gray-50"
          onClick={() => fileInputRef.current?.click()}
          onDrop={(e) => handleDrop(e, 'media')}
          onDragOver={handleDragOver}
        >
          <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <Upload className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-base font-medium text-gray-900 mb-2">Drag and drop files here</div>
          <div className="text-sm text-gray-600 mb-4">or click to browse your computer</div>
          <div className="text-xs text-gray-500">Supported formats: JPG, PNG, GIF, MP4, MOV, PDF, DOC, DOCX (max 10MB per file)</div>
        </div>

        {/* Media Controls */}
        <div className="bg-white rounded-xl p-5 border border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search media files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

           

            <div className="flex items-center gap-2">
               {/* Select All Button */}
              <button
                onClick={selectAllFiles}
                disabled={filteredMedia.length === 0}
                className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedFiles.size === filteredMedia.length && filteredMedia.length > 0
                    ? 'bg-blue-50 border-blue-500 text-blue-700 hover:bg-blue-100'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                title={selectedFiles.size === filteredMedia.length && filteredMedia.length > 0 ? 'Deselect All' : 'Select All'}
              >
                <CheckSquare className="w-4 h-4" />
                <span>
                  {selectedFiles.size === filteredMedia.length && filteredMedia.length > 0 ? 'Deselect All' : 'Select All'}
                  {filteredMedia.length > 0 && (
                    <span className="ml-1 text-xs opacity-75">
                      ({selectedFiles.size}/{filteredMedia.length})
                    </span>
                  )}
                </span>
              </button>
              
              {folderFilter && (
                <Popconfirm
                  title="Delete Folder"
                  description={`Are you sure you want to delete folder "${folderFilter}"? This will only work if the folder is empty.`}
                  onConfirm={() => deleteFolder(folderFilter)}
                  okText="Yes, Delete"
                  cancelText="Cancel"
                  okType="danger"
                >
                  <button
                    className="p-2.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                    title={`Delete folder "${folderFilter}"`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Popconfirm>
              )}
            </div>

            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white min-w-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sizes</option>
              <option value="small">Small (&lt; 1MB)</option>
              <option value="medium">Medium (1-5MB)</option>
              <option value="large">Large (&gt; 5MB)</option>
            </select>

            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedFiles.size > 0 && (
          <div className="bg-blue-600 text-white px-5 py-3 rounded-lg flex items-center justify-between mb-5">
            <span className="font-medium">
              {selectedFiles.size} file{selectedFiles.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={bulkDownload}
                className="px-3 py-1.5 bg-white/20 border border-white/30 rounded-md text-xs font-medium hover:bg-white/30 transition-colors"
              >
                <Download className="w-3 h-3 inline mr-1" />
                Download
              </button>
              <Popconfirm
                title="Delete Multiple Files"
                description={`Are you sure you want to permanently delete ${selectedFiles.size} selected files? This action cannot be undone.`}
                onConfirm={bulkDelete}
                okText="Yes, Delete All"
                cancelText="Cancel"
                okType="danger"
              >
                <button
                  className="px-3 py-1.5 bg-white/20 border border-white/30 rounded-md text-xs font-medium hover:bg-white/30 transition-colors"
                >
                  <Trash2 className="w-3 h-3 inline mr-1" />
                  Delete
                </button>
              </Popconfirm>
            </div>
          </div>
        )}

        {/* Media Grid/List */}
        {filteredMedia.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-15 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Image className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No media files found</h3>
            <p className="text-gray-600 mb-5">Upload your first files to get started</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Files
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {filteredMedia.map(file => (
              <div
                key={file.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer relative"
              >
                {/* Checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={() => toggleFileSelection(file.id)}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                {/* Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded-md p-1 flex gap-1">
                  <button
                    onClick={() => viewMedia(file)}
                    className="p-1 text-white hover:bg-white/20 rounded"
                    title="View"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => downloadMedia(file)}
                    className="p-1 text-white hover:bg-white/20 rounded"
                    title="Download"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <Popconfirm
                    title="Delete File"
                    description={`Are you sure you want to delete "${file.name}"? This action cannot be undone.`}
                    onConfirm={() => deleteMedia(file.id, file.name)}
                    okText="Yes, Delete"
                    cancelText="Cancel"
                    okType="danger"
                  >
                    <button
                      className="p-1 text-white hover:bg-white/20 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Popconfirm>
                </div>

                {/* Preview */}
                <div className="w-full h-40 bg-gray-50 flex items-center justify-center overflow-hidden">
                  {file.type === 'image' && file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : file.type === 'video' && file.preview ? (
                    <div className="relative w-full h-full">
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  ) : (
                    getFileIcon(file.type, 'lg')
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="font-medium text-sm text-gray-900 truncate" title={file.name}>
                    {file.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {file.type.toUpperCase()} • {file.dimensions}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{file.size}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* List Header */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 grid grid-cols-6 gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <div>
                <input
                  type="checkbox"
                  checked={selectedFiles.size === filteredMedia.length}
                  onChange={selectAllFiles}
                  className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">Name</div>
              <div>Type</div>
              <div>Size</div>
              <div>Actions</div>
            </div>

            {/* List Rows */}
            {filteredMedia.map(file => (
              <div
                key={file.id}
                className="px-6 py-4 border-b border-gray-100 last:border-b-0 grid grid-cols-6 gap-4 items-center hover:bg-gray-50 transition-colors"
              >
                <div>
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={() => toggleFileSelection(file.id)}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center overflow-hidden">
                    {file.type === 'image' && file.preview ? (
                      <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                    ) : file.type === 'video' && file.preview ? (
                      <div className="relative w-full h-full">
                        <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-2 h-2 text-white" />
                        </div>
                      </div>
                    ) : (
                      getFileIcon(file.type, 'sm')
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900 truncate" title={file.name}>
                      {file.name}
                    </div>
                    <div className="text-xs text-gray-500">{file.folder}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-600">{file.type.toUpperCase()}</div>
                <div className="text-sm text-gray-600">{file.size}</div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => viewMedia(file)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => downloadMedia(file)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Media Preview Modal */}
      {isModalOpen && currentMediaFile && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{currentMediaFile.name}</h3>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Preview */}
            <div className="text-center mb-5">
              {currentMediaFile.type === 'image' && currentMediaFile.preview ? (
                <img
                  src={currentMediaFile.preview}
                  alt={currentMediaFile.name}
                  className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                />
              ) : currentMediaFile.type === 'video' && currentMediaFile.url ? (
                <video
                  controls
                  className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                  preload="metadata"
                >
                  <source src={currentMediaFile.url} type={currentMediaFile.contentType || 'video/mp4'} />
                  <div className="bg-gray-100 p-10 rounded-lg">
                    <Play className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">Your browser does not support video playback</p>
                  </div>
                </video>
              ) : currentMediaFile.type === 'video' ? (
                <div className="bg-gray-100 p-10 rounded-lg">
                  <Play className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Video preview not available</p>
                </div>
              ) : (
                <div className="bg-gray-100 p-10 rounded-lg">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Document preview not available</p>
                </div>
              )}
            </div>

            {/* Modal Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">File Name</div>
                  <div className="text-sm text-gray-900">{currentMediaFile.name}</div>
                </div>
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">File Type</div>
                  <div className="text-sm text-gray-900">{currentMediaFile.type.charAt(0).toUpperCase() + currentMediaFile.type.slice(1)}</div>
                </div>
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">File Size</div>
                  <div className="text-sm text-gray-900">{currentMediaFile.size}</div>
                </div>
              </div>
              <div>
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Dimensions</div>
                  <div className="text-sm text-gray-900">{currentMediaFile.dimensions}</div>
                </div>
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Upload Date</div>
                  <div className="text-sm text-gray-900">{currentMediaFile.uploadDate}</div>
                </div>
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Last Modified</div>
                  <div className="text-sm text-gray-900">{currentMediaFile.modifiedDate}</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
              <button
                onClick={() => downloadMedia(currentMediaFile)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => openEditModal(currentMediaFile)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Edit Details
              </button>
              <button
                onClick={() => {
                  alert(`Using ${currentMediaFile.name} in content...\n\nThis would insert the media file into the current post or content editor.`);
                  closeModal();
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Check className="w-4 h-4" />
                Use in Content
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingFile && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeEditModal();
            }
          }}
        >
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Edit File Details</h3>
              <button
                onClick={closeEditModal}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  value={editForm.filename}
                  onChange={(e) => setEditForm(prev => ({ ...prev, filename: e.target.value }))}
                  placeholder="Enter file name (e.g., my-photo.png)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Display name for this file (must include extension)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alt Text / Description
                </label>
                <textarea
                  value={editForm.altText}
                  onChange={(e) => setEditForm(prev => ({ ...prev, altText: e.target.value }))}
                  placeholder="Enter alt text or description for this file..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Type
                </label>
                <select
                  value={editForm.kind}
                  onChange={(e) => setEditForm(prev => ({ ...prev, kind: e.target.value as 'image' | 'video' | 'document' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateFile}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

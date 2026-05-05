import { Popconfirm, message } from 'antd';
import {
  CheckSquare,
  Download,
  Eye,
  FileText,
  Grid,
  Image as ImageIcon,
  List as ListView,
  Loader2,
  Search,
  Trash2,
  Upload,
  Video,
  X
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { mediaApi, type MediaFile } from '../../services/mediaApi';
import { getApiBaseUrl } from '../../utils/api';

interface MediaStats {
  total_files: number;
  total_size: number;
  images_count: number;
  videos_count: number;
  documents_count: number;
  storage_used_mb: number;
}

const RestaurantGallery: React.FC = () => {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<MediaStats | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeFilter, setActiveFilter] = useState<'all' | 'image' | 'video' | 'document'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    filename: '',
    altText: '',
    kind: 'image' as 'image' | 'video' | 'file'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_BASE_URL = getApiBaseUrl();

  useEffect(() => {
    loadGallery();
  }, []);

  useEffect(() => {
    loadMediaStats();
  }, [media]);

  const loadGallery = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Load all media from restaurant source
      const data = await mediaApi.getMediaFiles({
        skip: 0,
        limit: 200,
        source: 'restaurant',
      });
      setMedia(data);
    } catch (err: any) {
      console.error('Failed to load gallery:', err);
      setError('Failed to load media files: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadMediaStats = async () => {
    try {
      const totalFiles = media.length;
      const totalSize = media.reduce((sum, file) => sum + (file.size_bytes / 1024 / 1024), 0);
      const imagesCount = media.filter(f => f.kind === 'image').length;
      const videosCount = media.filter(f => f.kind === 'video').length;
      const documentsCount = media.filter(f => f.kind !== 'image' && f.kind !== 'video').length;

      setStats({
        total_files: totalFiles,
        total_size: totalSize * 1024 * 1024,
        images_count: imagesCount,
        videos_count: videosCount,
        documents_count: documentsCount,
        storage_used_mb: totalSize
      });
    } catch (err) {
      console.error('Error calculating stats:', err);
    }
  };

  const getFilteredMedia = useCallback(() => {
    return media.filter(file => {
      const matchesType = activeFilter === 'all' || 
        (activeFilter === 'document' ? (file.kind !== 'image' && file.kind !== 'video') : file.kind === activeFilter);
      const matchesSearch = file.original_filename?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        file.file_key.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesSize = true;
      const fileSizeMB = file.size_bytes / 1024 / 1024;
      if (sizeFilter === 'small') matchesSize = fileSizeMB < 1;
      else if (sizeFilter === 'medium') matchesSize = fileSizeMB >= 1 && fileSizeMB <= 5;
      else if (sizeFilter === 'large') matchesSize = fileSizeMB > 5;
      
      return matchesType && matchesSearch && matchesSize;
    });
  }, [media, activeFilter, searchQuery, sizeFilter]);

  const filteredMedia = getFilteredMedia();

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const maxSize = 100 * 1024 * 1024; // 100MB
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
        let kind: 'image' | 'video' | 'file' = 'file';
        if (file.type.startsWith('image/')) kind = 'image';
        else if (file.type.startsWith('video/')) kind = 'video';
        return await mediaApi.uploadFile(file, kind, undefined, 'restaurant', undefined, undefined, 'gallery');
      });

      const uploadResults = await Promise.all(uploadPromises);
      await loadGallery();
      message.success(`Successfully uploaded ${uploadResults.length} file(s)`);
      
    } catch (err: any) {
      const errorMessage = `Failed to upload files: ${err.message || 'Unknown error'}`;
      setError(errorMessage);
      message.error(errorMessage);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileUpload(e.dataTransfer.files);
  }, []);

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
      setSelectedFiles(new Set(filteredMedia.map(file => file.id.toString())));
    }
  };

  const viewMedia = (file: MediaFile) => {
    setSelectedFile(file);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedFile(null);
  };

  const openEditModal = (file: MediaFile) => {
    setSelectedFile(file);
    setEditForm({
      filename: file.original_filename || file.file_key,
      altText: file.alt_text || '',
      kind: file.kind as 'image' | 'video' | 'file'
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditForm({
      filename: '',
      altText: '',
      kind: 'image'
    });
  };

  const handleUpdateFile = async () => {
    if (!selectedFile) return;

    try {
      setIsLoading(true);
      await mediaApi.updateMediaFile(selectedFile.id, {
        original_filename: editForm.filename.trim(),
        alt_text: editForm.altText.trim(),
        kind: editForm.kind
      });
      
      message.success('File updated successfully');
      closeEditModal();
      await loadGallery();
    } catch (error: any) {
      message.error(error.response?.data?.detail || 'Failed to update file');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDimensions = (file: MediaFile) => {
    if (file.width && file.height) {
      return `${file.width} × ${file.height} px`;
    }
    return 'N/A';
  };

  const downloadMedia = async (file: MediaFile) => {
    try {
      await mediaApi.downloadMediaFile(file.id, file.original_filename || file.file_key);
      message.success(`Started downloading ${file.original_filename || file.file_key}`);
    } catch (error) {
      message.error(`Failed to download ${file.original_filename || file.file_key}`);
    }
  };

  const deleteMedia = async (fileId: number, fileName: string) => {
    try {
      setIsLoading(true);
      await mediaApi.deleteMediaFile(fileId);
      setMedia(prev => prev.filter(file => file.id !== fileId));
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId.toString());
        return newSet;
      });
      message.success(`${fileName} deleted successfully!`);
    } catch (error) {
      console.error('Error deleting media:', error);
      message.error(`Failed to delete ${fileName}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const bulkDelete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const deletePromises = Array.from(selectedFiles).map(async (fileId) => {
        return await mediaApi.deleteMediaFile(parseInt(fileId));
      });

      await Promise.all(deletePromises);
      await loadGallery();
      
      const deletedCount = selectedFiles.size;
      setSelectedFiles(new Set());
      message.success(`${deletedCount} files deleted successfully!`);
      
    } catch (err: any) {
      const errorMessage = `Failed to delete files: ${err.message || 'Unknown error'}`;
      setError(errorMessage);
      message.error(errorMessage);
      console.error('Delete error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const bulkDownload = async () => {
    const selectedFilesArray = media.filter(file => selectedFiles.has(file.id.toString()));
    
    try {
      for (const file of selectedFilesArray) {
        await downloadMedia(file);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setSelectedFiles(new Set());
      message.success(`Successfully started download of ${selectedFilesArray.length} files.`);
    } catch (error) {
      console.error('Bulk download error:', error);
      message.error('Some files failed to download. Please try again.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <X className="w-5 h-5 text-red-500 flex-shrink-0" />
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
        {(isLoading || uploading) && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
            <p className="text-blue-700">
              {uploading ? 'Uploading files...' : 'Loading media files...'}
            </p>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Media Library</h2>
            <p className="text-sm text-gray-600 mt-1">
              Store and organize images, videos, and documents for your amusement park content
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || isLoading}
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
            <div className="text-2xl font-bold text-gray-900">{stats?.images_count || 0}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Images</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats?.videos_count || 0}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Videos</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats?.documents_count || 0}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Documents</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-white rounded-xl border border-gray-200 overflow-x-auto">
          {[
            { key: 'all', label: 'All Files', icon: null, count: media.length },
            { key: 'image', label: 'Images', icon: ImageIcon, count: media.filter(f => f.kind === 'image').length },
            { key: 'video', label: 'Videos', icon: Video, count: media.filter(f => f.kind === 'video').length },
            { key: 'document', label: 'Documents', icon: FileText, count: media.filter(f => f.kind !== 'image' && f.kind !== 'video').length }
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
          onDrop={handleDrop}
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
                <ListView className="w-4 h-4" />
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

        {/* Media Grid */}
        {filteredMedia.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-15 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-gray-400" />
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
        ) : (
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
                    checked={selectedFiles.has(file.id.toString())}
                    onChange={() => toggleFileSelection(file.id.toString())}
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
                    description={`Are you sure you want to delete "${file.original_filename || file.file_key}"? This action cannot be undone.`}
                    onConfirm={() => deleteMedia(file.id, file.original_filename || file.file_key)}
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
                  {file.kind === 'image' ? (
                    <img
                      src={`${API_BASE_URL}/media/${file.id}/view`}
                      alt={file.alt_text || file.original_filename || 'Image'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="font-medium text-sm text-gray-900 truncate" title={file.original_filename || file.file_key}>
                    {file.original_filename || file.file_key}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {file.kind.toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatFileSize(file.size_bytes)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedFile && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeDetailModal();
              }
            }}
          >
            <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedFile.original_filename || selectedFile.file_key}
                </h3>
                <button
                  onClick={closeDetailModal}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Preview */}
              <div className="text-center mb-5">
                {selectedFile.kind === 'image' ? (
                  <img
                    src={`${API_BASE_URL}/media/${selectedFile.id}/view`}
                    alt={selectedFile.alt_text || selectedFile.original_filename || 'Image'}
                    className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                  />
                ) : selectedFile.kind === 'video' ? (
                  <video
                    controls
                    className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                    preload="metadata"
                  >
                    <source src={`${API_BASE_URL}/media/${selectedFile.id}/view`} type={selectedFile.mime_type || 'video/mp4'} />
                    <div className="bg-gray-100 p-10 rounded-lg">
                      <Video className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">Your browser does not support video playback</p>
                    </div>
                  </video>
                ) : (
                  <div className="bg-gray-100 p-10 rounded-lg">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">File preview not available</p>
                  </div>
                )}
              </div>

              {/* Modal Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      File Name
                    </div>
                    <div className="text-sm text-gray-900">
                      {selectedFile.original_filename || selectedFile.file_key}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      File Type
                    </div>
                    <div className="text-sm text-gray-900">
                      {selectedFile.kind.charAt(0).toUpperCase() + selectedFile.kind.slice(1)}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      File Size
                    </div>
                    <div className="text-sm text-gray-900">
                      {formatFileSize(selectedFile.size_bytes)}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Dimensions
                    </div>
                    <div className="text-sm text-gray-900">
                      {formatDimensions(selectedFile)}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Upload Date
                    </div>
                    <div className="text-sm text-gray-900">
                      {formatDate(selectedFile.created_at)}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                      Last Modified
                    </div>
                    <div className="text-sm text-gray-900">
                      N/A
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
                <button
                  onClick={() => downloadMedia(selectedFile)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={() => {
                    openEditModal(selectedFile);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Edit Details
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement use in content functionality
                    closeDetailModal();
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <CheckSquare className="w-4 h-4" />
                  Use in Content
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedFile && (
          <div
            className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
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
                    onChange={(e) => setEditForm(prev => ({ ...prev, kind: e.target.value as 'image' | 'video' | 'file' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="file">Document</option>
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
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantGallery;



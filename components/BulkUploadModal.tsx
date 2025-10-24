'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { generateSimplePlantCSVTemplate } from '@/app/actions/csv-templates';
import { bulkUploadPlants } from '@/app/actions/bulk-plants';
import type { BulkUploadResult } from '@/app/actions/bulk-plants';
import { Button } from '@/components/ui/button';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type UploadStep = 'idle' | 'uploading' | 'success' | 'error' | 'partial';

export function BulkUploadModal({ isOpen, onClose }: BulkUploadModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStep, setUploadStep] = useState<UploadStep>('idle');
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  if (!isOpen) return null;

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const result = await generateSimplePlantCSVTemplate();

      if (result.success && result.data) {
        // Create blob and download
        const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = result.filename || 'plant-upload-template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert(result.error || 'Failed to download template');
      }
    } catch (error) {
      console.error('Template download error:', error);
      alert('Failed to download template');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStep('idle');
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a CSV file first');
      return;
    }

    setUploadStep('uploading');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const result = await bulkUploadPlants(formData);
      setUploadResult(result);

      if (result.success) {
        if (result.errors && result.errors.length > 0) {
          setUploadStep('partial');
        } else {
          setUploadStep('success');
        }
      } else {
        setUploadStep('error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStep('error');
      setUploadResult({
        success: false,
        errors: [{ row: 0, message: 'An unexpected error occurred' }],
      });
    }
  };

  const handleDownloadErrors = () => {
    if (!uploadResult?.errorCSV) return;

    const blob = new Blob([uploadResult.errorCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plant-upload-errors-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    if (uploadStep === 'success' || uploadStep === 'partial') {
      router.refresh();
    }
    setSelectedFile(null);
    setUploadStep('idle');
    setUploadResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg border-2 border-sage bg-cream p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-moss-dark">Bulk Upload Plants</h2>
          <button
            onClick={handleClose}
            className="text-2xl text-soil hover:text-moss-dark"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {uploadStep === 'idle' && (
          <>
            <div className="mb-6 space-y-4">
              <div className="rounded-lg border-2 border-sage/50 bg-sage/10 p-4">
                <h3 className="mb-2 font-semibold text-moss-dark">Instructions:</h3>
                <ol className="list-decimal space-y-2 pl-5 text-sm text-soil">
                  <li>Download the CSV template below</li>
                  <li>Fill in your plant data (you can use Excel, Google Sheets, or any spreadsheet app)</li>
                  <li>Save the file as CSV format</li>
                  <li>Upload the completed CSV file</li>
                  <li>Photos can be added manually later for each plant</li>
                </ol>
              </div>

              <div>
                <Button
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate}
                  className="w-full"
                  variant="default"
                >
                  {isDownloadingTemplate ? 'Downloading...' : '📥 Download CSV Template'}
                </Button>
              </div>

              <div className="border-t-2 border-sage/30 pt-4">
                <label className="mb-2 block font-semibold text-moss-dark">
                  Upload Your CSV File:
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="mb-3 w-full rounded-lg border-2 border-sage bg-card-bg p-2 text-soil"
                />
                {selectedFile && (
                  <p className="mb-3 text-sm text-soil">
                    Selected: <span className="font-medium">{selectedFile.name}</span> (
                    {(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile}
                className="flex-1"
                variant="default"
              >
                Upload Plants
              </Button>
              <Button onClick={handleClose} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </>
        )}

        {uploadStep === 'uploading' && (
          <div className="py-12 text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-sage border-t-moss"></div>
            <p className="text-lg font-semibold text-moss-dark">Processing your plants...</p>
            <p className="mt-2 text-sm text-soil">This may take a moment</p>
          </div>
        )}

        {uploadStep === 'success' && uploadResult && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-green-500 bg-green-50 p-6 text-center">
              <div className="mb-4 text-5xl">✅</div>
              <h3 className="mb-2 text-xl font-bold text-green-800">Upload Successful!</h3>
              <div className="space-y-2 text-green-700">
                {(uploadResult.stats?.successfulInserts || 0) > 0 && (
                  <p>
                    <span className="text-2xl font-bold">{uploadResult.stats?.successfulInserts || 0}</span> plant
                    {(uploadResult.stats?.successfulInserts || 0) !== 1 ? 's' : ''} added
                  </p>
                )}
                {(uploadResult.stats?.updatedPlants || 0) > 0 && (
                  <p>
                    <span className="text-2xl font-bold">{uploadResult.stats?.updatedPlants || 0}</span> plant
                    {(uploadResult.stats?.updatedPlants || 0) !== 1 ? 's' : ''} updated
                  </p>
                )}
                {(uploadResult.stats?.duplicatesSkipped || 0) > 0 && (
                  <p className="text-sm">
                    ({uploadResult.stats?.duplicatesSkipped || 0} duplicate
                    {(uploadResult.stats?.duplicatesSkipped || 0) !== 1 ? 's' : ''} skipped)
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => router.push('/plants')} className="flex-1" variant="default">
                View Plants
              </Button>
              <Button onClick={handleClose} variant="outline" className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}

        {uploadStep === 'partial' && uploadResult && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-yellow-500 bg-yellow-50 p-6">
              <div className="mb-4 text-center text-4xl">⚠️</div>
              <h3 className="mb-3 text-center text-xl font-bold text-yellow-800">
                Partial Upload
              </h3>
              <div className="space-y-2 text-center text-yellow-700">
                {(uploadResult.stats?.successfulInserts || 0) > 0 && (
                  <p>
                    <span className="text-lg font-bold">
                      {uploadResult.stats?.successfulInserts || 0}
                    </span>{' '}
                    plant{(uploadResult.stats?.successfulInserts || 0) !== 1 ? 's' : ''} added
                  </p>
                )}
                {(uploadResult.stats?.updatedPlants || 0) > 0 && (
                  <p>
                    <span className="text-lg font-bold">
                      {uploadResult.stats?.updatedPlants || 0}
                    </span>{' '}
                    plant{(uploadResult.stats?.updatedPlants || 0) !== 1 ? 's' : ''} updated
                  </p>
                )}
                {(uploadResult.stats?.duplicatesSkipped || 0) > 0 && (
                  <p className="text-sm">
                    {uploadResult.stats?.duplicatesSkipped || 0} duplicate
                    {(uploadResult.stats?.duplicatesSkipped || 0) !== 1 ? 's' : ''} skipped
                  </p>
                )}
                <p>
                  <span className="text-lg font-bold">{uploadResult.stats?.failedRows || 0}</span> row
                  {(uploadResult.stats?.failedRows || 0) !== 1 ? 's' : ''} failed
                </p>
              </div>
            </div>

            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-lg border-2 border-red-200 bg-red-50 p-4">
                <h4 className="mb-3 font-semibold text-red-800">Errors:</h4>
                <div className="space-y-2 text-sm">
                  {uploadResult.errors.slice(0, 10).map((error, index) => (
                    <div key={index} className="border-b border-red-200 pb-2 last:border-0">
                      <span className="font-medium text-red-700">Row {error.row}:</span>{' '}
                      {error.field && <span className="text-red-600">({error.field}) </span>}
                      <span className="text-red-800">{error.message}</span>
                    </div>
                  ))}
                  {uploadResult.errors.length > 10 && (
                    <p className="pt-2 text-red-600">
                      ... and {uploadResult.errors.length - 10} more errors
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleDownloadErrors} variant="outline" className="flex-1">
                📥 Download Error Report
              </Button>
              <Button onClick={handleClose} variant="default" className="flex-1">
                Done
              </Button>
            </div>
          </div>
        )}

        {uploadStep === 'error' && uploadResult && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-red-500 bg-red-50 p-6">
              <div className="mb-4 text-center text-4xl">❌</div>
              <h3 className="mb-3 text-center text-xl font-bold text-red-800">Upload Failed</h3>

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="max-h-64 space-y-2 overflow-y-auto text-sm">
                  {uploadResult.errors.slice(0, 10).map((error, index) => (
                    <div
                      key={index}
                      className="rounded border border-red-300 bg-white p-2 text-red-800"
                    >
                      {error.row > 0 && (
                        <span className="font-medium">Row {error.row}: </span>
                      )}
                      {error.field && <span className="text-red-600">({error.field}) </span>}
                      {error.message}
                    </div>
                  ))}
                  {uploadResult.errors.length > 10 && (
                    <p className="pt-2 text-center text-red-600">
                      ... and {uploadResult.errors.length - 10} more errors
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {uploadResult.errorCSV && (
                <Button onClick={handleDownloadErrors} variant="outline" className="flex-1">
                  📥 Download Error Report
                </Button>
              )}
              <Button
                onClick={() => {
                  setUploadStep('idle');
                  setUploadResult(null);
                  setSelectedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                variant="default"
                className="flex-1"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

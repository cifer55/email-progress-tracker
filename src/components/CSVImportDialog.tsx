import { useState, useRef, useMemo } from 'react';
import {
  CSVParserService,
  CSVValidationService,
  CSVImportService,
  ParsedCSVData,
  ImportSummary,
  RoadmapManager
} from '../services';
import { useRoadmap } from '../contexts';
import { ValidationError } from '../services/CSVValidationService';
import './CSVImportDialog.css';

export interface CSVImportDialogProps {
  onClose: () => void;
  onImportComplete: (count: number) => void;
}

type DialogStep = 'upload' | 'preview' | 'importing' | 'complete';

export function CSVImportDialog({ onClose, onImportComplete }: CSVImportDialogProps) {
  const { roadmap, setRoadmap } = useRoadmap();
  const [step, setStep] = useState<DialogStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSVData | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roadmapManager = useMemo(() => new RoadmapManager(roadmap), [roadmap]);
  const parserService = new CSVParserService();
  const validationService = new CSVValidationService();
  const importService = new CSVImportService(roadmapManager);

  const handleFileSelect = async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('File is too large. Maximum size is 5MB.');
      return;
    }

    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file.');
      return;
    }

    try {
      // Parse CSV
      const data = await parserService.parseCSV(selectedFile);
      setParsedData(data);

      // Validate data
      const validation = validationService.validateCSVData(data);

      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        setStep('preview');
        return;
      }

      // Analyze import
      const summary = importService.analyzeImport(data, roadmap);
      setImportSummary(summary);
      setStep('preview');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse CSV file';
      setError(errorMessage);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDownloadTemplate = () => {
    const template = parserService.generateTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'roadmap-features-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setStep('importing');
    setImportProgress(0);

    try {
      const result = await importService.executeImport(
        parsedData,
        roadmap,
        (progress) => setImportProgress(progress)
      );

      if (result.success) {
        // Update the roadmap in context with the modified version
        setRoadmap(roadmapManager.getRoadmap());
        setStep('complete');
        setTimeout(() => {
          onImportComplete(result.featuresCreated);
          onClose();
        }, 1500);
      } else {
        setError(`Import failed: ${result.errors.join(', ')}`);
        setStep('preview');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed';
      setError(errorMessage);
      setStep('preview');
    }
  };

  const handleCancel = () => {
    if (step === 'preview' && validationErrors.length > 0) {
      // Reset to upload step to allow fixing the CSV
      setStep('upload');
      setFile(null);
      setParsedData(null);
      setValidationErrors([]);
      setError(null);
    } else {
      onClose();
    }
  };

  return (
    <div className="csv-import-dialog-overlay" onClick={onClose}>
      <div className="csv-import-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="csv-import-dialog-header">
          <h2>Import Features from CSV</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="csv-import-dialog-content">
          {step === 'upload' && (
            <>
              <div className="csv-import-step">
                <h3>Step 1: Upload CSV File</h3>
                <div
                  className={`file-upload-area ${isDragging ? 'dragging' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="upload-icon">📁</div>
                  <p>Drag and drop CSV file here</p>
                  <p className="upload-subtext">or click to browse</p>
                  {file && <p className="selected-file">Selected: {file.name}</p>}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                />
                <button className="template-button" onClick={handleDownloadTemplate}>
                  Download CSV Template
                </button>
                {error && <div className="error-message">{error}</div>}
              </div>
            </>
          )}

          {step === 'preview' && parsedData && (
            <>
              {validationErrors.length > 0 ? (
                <div className="validation-errors">
                  <h3>⚠ Validation Errors</h3>
                  <p>Found {validationErrors.length} error(s) in CSV file:</p>
                  <div className="error-list">
                    {validationErrors.map((err, index) => (
                      <div key={index} className="error-item">
                        <strong>Row {err.rowNumber}:</strong> {err.field} - {err.message}
                      </div>
                    ))}
                  </div>
                  <p className="error-help">Please fix these errors and try again.</p>
                </div>
              ) : (
                <>
                  <div className="csv-preview">
                    <h3>Step 2: Preview and Confirm</h3>
                    <div className="preview-table-container">
                      <table className="preview-table">
                        <thead>
                          <tr>
                            <th>Feature Name</th>
                            <th>Product</th>
                            <th>Theme</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.rows.slice(0, 10).map((row) => (
                            <tr key={row.rowNumber}>
                              <td>{row.featureName}</td>
                              <td>{row.productName}</td>
                              <td>{row.themeName}</td>
                              <td>{row.startDate}</td>
                              <td>{row.endDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parsedData.rows.length > 10 && (
                        <p className="preview-note">
                          Showing first 10 of {parsedData.totalRows} rows
                        </p>
                      )}
                    </div>
                  </div>

                  {importSummary && (
                    <div className="import-summary">
                      <h4>Import Summary:</h4>
                      <ul>
                        <li>• {importSummary.featuresToCreate} features to import</li>
                        <li>• {importSummary.themesToCreate} new themes to create</li>
                        <li>• {importSummary.productsToCreate} new products to create</li>
                        {importSummary.existingProducts > 0 && (
                          <li>
                            • {importSummary.existingProducts} existing products will receive
                            features
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {step === 'importing' && (
            <div className="importing-state">
              <h3>Importing Features...</h3>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${importProgress}%` }} />
              </div>
              <p className="progress-text">{Math.round(importProgress)}% complete</p>
            </div>
          )}

          {step === 'complete' && (
            <div className="complete-state">
              <div className="success-icon">✓</div>
              <h3>Import Complete!</h3>
              <p>Features have been successfully imported.</p>
            </div>
          )}
        </div>

        <div className="csv-import-dialog-footer">
          {step === 'upload' && (
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
          )}
          {step === 'preview' && (
            <>
              <button className="cancel-button" onClick={handleCancel}>
                {validationErrors.length > 0 ? 'Back' : 'Cancel'}
              </button>
              {validationErrors.length === 0 && (
                <button className="import-button" onClick={handleImport}>
                  Import Features
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

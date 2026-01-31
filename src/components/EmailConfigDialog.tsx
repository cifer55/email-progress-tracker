/**
 * EmailConfigDialog Component
 * Dialog for configuring email account settings
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { useState, useEffect } from 'react';
import { EmailConfig, EmailConfigUpdate } from '../services/EmailConfigService';
import { Icon } from './Icon';
import './EmailConfigDialog.css';

export interface EmailConfigDialogProps {
  isOpen: boolean;
  config: EmailConfig | null;
  onSave: (config: EmailConfigUpdate) => Promise<void>;
  onTest: (config: EmailConfigUpdate) => Promise<{ success: boolean; message: string }>;
  onClose: () => void;
}

type Provider = 'gmail' | 'outlook' | 'imap' | 'pop3';

export function EmailConfigDialog({
  isOpen,
  config,
  onSave,
  onTest,
  onClose,
}: EmailConfigDialogProps) {
  const [provider, setProvider] = useState<Provider>('gmail');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(993);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [ssl, setSsl] = useState(true);
  const [pollInterval, setPollInterval] = useState(300000); // 5 minutes
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(
    null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load config when dialog opens
  useEffect(() => {
    if (isOpen && config) {
      setProvider(config.provider);
      setHost(config.host);
      setPort(config.port);
      setUsername(config.username);
      setPassword(''); // Don't populate password for security
      setSsl(config.ssl);
      setPollInterval(config.pollInterval);
      setEnabled(config.enabled);
    } else if (isOpen && !config) {
      // Set defaults for new config
      applyProviderDefaults('gmail');
    }
  }, [isOpen, config]);

  const applyProviderDefaults = (selectedProvider: Provider) => {
    setProvider(selectedProvider);
    switch (selectedProvider) {
      case 'gmail':
        setHost('imap.gmail.com');
        setPort(993);
        setSsl(true);
        break;
      case 'outlook':
        setHost('outlook.office365.com');
        setPort(993);
        setSsl(true);
        break;
      case 'imap':
        setHost('');
        setPort(993);
        setSsl(true);
        break;
      case 'pop3':
        setHost('');
        setPort(995);
        setSsl(true);
        break;
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!host.trim()) {
      newErrors.host = 'Host is required';
    }

    if (!port || port < 1 || port > 65535) {
      newErrors.port = 'Port must be between 1 and 65535';
    }

    if (!username.trim()) {
      newErrors.username = 'Username/email is required';
    }

    if (!config && !password.trim()) {
      newErrors.password = 'Password is required for new configuration';
    }

    if (pollInterval < 60000) {
      newErrors.pollInterval = 'Poll interval must be at least 1 minute';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!validate()) return;

    setTesting(true);
    setTestResult(null);

    try {
      const testConfig: EmailConfigUpdate = {
        provider,
        host,
        port,
        username,
        ssl,
        pollInterval,
      };

      if (password) {
        testConfig.password = password;
      }

      const result = await onTest(testConfig);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);

    try {
      const updateConfig: EmailConfigUpdate = {
        provider,
        host,
        port,
        username,
        ssl,
        pollInterval,
        enabled,
      };

      if (password) {
        updateConfig.password = password;
      }

      await onSave(updateConfig);
      onClose();
    } catch (error) {
      setErrors({
        ...errors,
        submit: error instanceof Error ? error.message : 'Failed to save configuration',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="email-config-dialog-overlay" onClick={onClose}>
      <div className="email-config-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="email-config-header">
          <h2>Email Configuration</h2>
          <button className="email-config-close" onClick={onClose}>
            <Icon name="close" size="medium" />
          </button>
        </div>

        {/* Content */}
        <div className="email-config-content">
          {/* Provider Selection */}
          <div className="form-group">
            <label htmlFor="provider">
              Email Provider <span className="required">*</span>
            </label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => applyProviderDefaults(e.target.value as Provider)}
            >
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook / Office 365</option>
              <option value="imap">IMAP (Custom)</option>
              <option value="pop3">POP3 (Custom)</option>
            </select>
          </div>

          {/* Host */}
          <div className="form-group">
            <label htmlFor="host">
              Host <span className="required">*</span>
            </label>
            <input
              id="host"
              type="text"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="imap.gmail.com"
              className={errors.host ? 'input-error' : ''}
            />
            {errors.host && <div className="validation-error">{errors.host}</div>}
          </div>

          {/* Port and SSL */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="port">
                Port <span className="required">*</span>
              </label>
              <input
                id="port"
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value))}
                min="1"
                max="65535"
                className={errors.port ? 'input-error' : ''}
              />
              {errors.port && <div className="validation-error">{errors.port}</div>}
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={ssl}
                  onChange={(e) => setSsl(e.target.checked)}
                />
                <span>Use SSL/TLS</span>
              </label>
            </div>
          </div>

          {/* Username */}
          <div className="form-group">
            <label htmlFor="username">
              Email Address <span className="required">*</span>
            </label>
            <input
              id="username"
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your-email@example.com"
              className={errors.username ? 'input-error' : ''}
            />
            {errors.username && <div className="validation-error">{errors.username}</div>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">
              Password {!config && <span className="required">*</span>}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={config ? 'Leave blank to keep current password' : 'Enter password'}
              className={errors.password ? 'input-error' : ''}
            />
            {errors.password && <div className="validation-error">{errors.password}</div>}
            {provider === 'gmail' && (
              <div className="form-hint">
                For Gmail, use an App Password. Learn more at{' '}
                <a
                  href="https://support.google.com/accounts/answer/185833"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Support
                </a>
              </div>
            )}
          </div>

          {/* Poll Interval */}
          <div className="form-group">
            <label htmlFor="pollInterval">
              Poll Interval (minutes) <span className="required">*</span>
            </label>
            <input
              id="pollInterval"
              type="number"
              value={pollInterval / 60000}
              onChange={(e) => setPollInterval(parseInt(e.target.value) * 60000)}
              min="1"
              className={errors.pollInterval ? 'input-error' : ''}
            />
            {errors.pollInterval && (
              <div className="validation-error">{errors.pollInterval}</div>
            )}
            <div className="form-hint">How often to check for new emails</div>
          </div>

          {/* Enabled */}
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span>Enable email polling</span>
            </label>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`email-config-test-result ${
                testResult.success ? 'test-success' : 'test-error'
              }`}
            >
              <Icon name={testResult.success ? 'success' : 'error'} size="small" />
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className="email-config-error">
              <Icon name="error" size="small" />
              <span>{errors.submit}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="email-config-footer">
          <button className="button-secondary" onClick={onClose} disabled={saving || testing}>
            Cancel
          </button>
          <button
            className="button-secondary"
            onClick={handleTest}
            disabled={saving || testing}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <button className="button-primary" onClick={handleSave} disabled={saving || testing}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}

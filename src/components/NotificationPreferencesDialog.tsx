import React, { useState, useEffect } from 'react';
import './NotificationPreferencesDialog.css';

export interface NotificationPreferences {
  email: {
    enabled: boolean;
    recipients: string[];
  };
  inApp: {
    enabled: boolean;
  };
}

interface NotificationPreferencesDialogProps {
  isOpen: boolean;
  preferences?: NotificationPreferences;
  onSave: (preferences: NotificationPreferences) => void;
  onClose: () => void;
}

export const NotificationPreferencesDialog: React.FC<NotificationPreferencesDialogProps> = ({
  isOpen,
  preferences,
  onSave,
  onClose,
}) => {
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (preferences) {
      setEmailEnabled(preferences.email.enabled);
      setRecipients(preferences.email.recipients);
      setInAppEnabled(preferences.inApp.enabled);
    }
  }, [preferences]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddRecipient = () => {
    const email = recipientInput.trim();
    
    if (!email) {
      return;
    }

    if (!validateEmail(email)) {
      setErrors(['Invalid email address']);
      return;
    }

    if (recipients.includes(email)) {
      setErrors(['Email already added']);
      return;
    }

    setRecipients([...recipients, email]);
    setRecipientInput('');
    setErrors([]);
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const handleSave = () => {
    const newErrors: string[] = [];

    if (emailEnabled && recipients.length === 0) {
      newErrors.push('At least one email recipient is required when email notifications are enabled');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const newPreferences: NotificationPreferences = {
      email: {
        enabled: emailEnabled,
        recipients,
      },
      inApp: {
        enabled: inAppEnabled,
      },
    };

    onSave(newPreferences);
    setErrors([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddRecipient();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="notification-preferences-dialog-overlay" onClick={onClose}>
      <div className="notification-preferences-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="notification-preferences-dialog-header">
          <h2>Notification Preferences</h2>
          <button
            className="notification-preferences-dialog-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <div className="notification-preferences-dialog-content">
          {errors.length > 0 && (
            <div className="notification-preferences-errors">
              {errors.map((error, index) => (
                <div key={index} className="notification-preferences-error">
                  {error}
                </div>
              ))}
            </div>
          )}

          <div className="notification-preferences-section">
            <h3>In-App Notifications</h3>
            <label className="notification-preferences-checkbox">
              <input
                type="checkbox"
                checked={inAppEnabled}
                onChange={(e) => setInAppEnabled(e.target.checked)}
              />
              <span>Enable in-app notifications</span>
            </label>
            <p className="notification-preferences-help">
              Show notifications in the application when features are blocked or delayed
            </p>
          </div>

          <div className="notification-preferences-section">
            <h3>Email Notifications</h3>
            <label className="notification-preferences-checkbox">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
              />
              <span>Enable email notifications</span>
            </label>
            <p className="notification-preferences-help">
              Send email alerts when features are blocked or delayed
            </p>

            {emailEnabled && (
              <div className="notification-preferences-recipients">
                <label htmlFor="recipient-input">Email Recipients</label>
                <div className="notification-preferences-recipient-input">
                  <input
                    id="recipient-input"
                    type="email"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter email address"
                  />
                  <button
                    type="button"
                    onClick={handleAddRecipient}
                    className="notification-preferences-add-button"
                  >
                    Add
                  </button>
                </div>

                {recipients.length > 0 && (
                  <div className="notification-preferences-recipient-list">
                    {recipients.map((email) => (
                      <div key={email} className="notification-preferences-recipient-item">
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(email)}
                          className="notification-preferences-remove-button"
                          aria-label={`Remove ${email}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="notification-preferences-info">
            <h4>Notification Types</h4>
            <ul>
              <li><strong>Blocked:</strong> When a feature status changes to "Blocked"</li>
              <li><strong>Delayed:</strong> When a feature is past its expected completion date</li>
              <li><strong>Status Change:</strong> When a feature status changes</li>
              <li><strong>Manual Review:</strong> When an email needs manual review</li>
            </ul>
          </div>
        </div>

        <div className="notification-preferences-dialog-footer">
          <button
            className="notification-preferences-cancel-button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="notification-preferences-save-button"
            onClick={handleSave}
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

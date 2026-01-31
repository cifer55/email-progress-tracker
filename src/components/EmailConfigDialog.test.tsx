/**
 * EmailConfigDialog Component Tests
 * Tests for email configuration dialog
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmailConfigDialog } from './EmailConfigDialog';
import { EmailConfig } from '../services/EmailConfigService';

describe('EmailConfigDialog', () => {
  const mockOnSave = vi.fn();
  const mockOnTest = vi.fn();
  const mockOnClose = vi.fn();

  const mockConfig: EmailConfig = {
    provider: 'gmail',
    host: 'imap.gmail.com',
    port: 993,
    username: 'test@gmail.com',
    ssl: true,
    pollInterval: 300000,
    enabled: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Visibility', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <EmailConfigDialog
          isOpen={false}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Email Configuration')).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: '' });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when overlay is clicked', () => {
      const { container } = render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const overlay = container.querySelector('.email-config-dialog-overlay');
      fireEvent.click(overlay!);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when dialog content is clicked', () => {
      const { container } = render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const dialog = container.querySelector('.email-config-dialog');
      fireEvent.click(dialog!);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onClose when Cancel button is clicked', () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Provider Selection', () => {
    it('should apply Gmail defaults when Gmail is selected', () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const providerSelect = screen.getByLabelText(/email provider/i);
      fireEvent.change(providerSelect, { target: { value: 'gmail' } });

      expect(screen.getByLabelText(/^host/i)).toHaveValue('imap.gmail.com');
      expect(screen.getByLabelText(/^port/i)).toHaveValue(993);
      expect(screen.getByLabelText(/use ssl\/tls/i)).toBeChecked();
    });

    it('should apply Outlook defaults when Outlook is selected', () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const providerSelect = screen.getByLabelText(/email provider/i);
      fireEvent.change(providerSelect, { target: { value: 'outlook' } });

      expect(screen.getByLabelText(/^host/i)).toHaveValue('outlook.office365.com');
      expect(screen.getByLabelText(/^port/i)).toHaveValue(993);
      expect(screen.getByLabelText(/use ssl\/tls/i)).toBeChecked();
    });

    it('should apply IMAP defaults when IMAP is selected', () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const providerSelect = screen.getByLabelText(/email provider/i);
      fireEvent.change(providerSelect, { target: { value: 'imap' } });

      expect(screen.getByLabelText(/^host/i)).toHaveValue('');
      expect(screen.getByLabelText(/^port/i)).toHaveValue(993);
      expect(screen.getByLabelText(/use ssl\/tls/i)).toBeChecked();
    });

    it('should apply POP3 defaults when POP3 is selected', () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const providerSelect = screen.getByLabelText(/email provider/i);
      fireEvent.change(providerSelect, { target: { value: 'pop3' } });

      expect(screen.getByLabelText(/^host/i)).toHaveValue('');
      expect(screen.getByLabelText(/^port/i)).toHaveValue(995);
      expect(screen.getByLabelText(/use ssl\/tls/i)).toBeChecked();
    });

    it('should show Gmail app password hint when Gmail is selected', () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const providerSelect = screen.getByLabelText(/email provider/i);
      fireEvent.change(providerSelect, { target: { value: 'gmail' } });

      expect(screen.getByText(/for gmail, use an app password/i)).toBeInTheDocument();
    });
  });

  describe('Form Loading', () => {
    it('should load existing config when provided', () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={mockConfig}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByLabelText(/email provider/i)).toHaveValue('gmail');
      expect(screen.getByLabelText(/^host/i)).toHaveValue('imap.gmail.com');
      expect(screen.getByLabelText(/^port/i)).toHaveValue(993);
      expect(screen.getByLabelText(/email address/i)).toHaveValue('test@gmail.com');
      expect(screen.getByLabelText(/use ssl\/tls/i)).toBeChecked();
      expect(screen.getByLabelText(/poll interval/i)).toHaveValue(5); // 300000ms = 5 minutes
      expect(screen.getByLabelText(/enable email polling/i)).toBeChecked();
    });

    it('should not populate password when loading existing config', () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={mockConfig}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByLabelText(/^password/i)).toHaveValue('');
    });

    it('should apply Gmail defaults when no config is provided', () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByLabelText(/^host/i)).toHaveValue('imap.gmail.com');
      expect(screen.getByLabelText(/^port/i)).toHaveValue(993);
    });
  });

  describe('Form Validation', () => {
    it('should show error when host is empty', async () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const hostInput = screen.getByLabelText(/^host/i);
      fireEvent.change(hostInput, { target: { value: '' } });

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Host is required')).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show error when port is invalid', async () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const portInput = screen.getByLabelText(/^port/i);
      fireEvent.change(portInput, { target: { value: '0' } });

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Port must be between 1 and 65535')).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show error when username is empty', async () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const usernameInput = screen.getByLabelText(/email address/i);
      fireEvent.change(usernameInput, { target: { value: '' } });

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Username/email is required')).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show error when password is empty for new config', async () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const usernameInput = screen.getByLabelText(/email address/i);
      fireEvent.change(usernameInput, { target: { value: 'test@example.com' } });

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText('Password is required for new configuration')
        ).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should not require password for existing config', async () => {
      mockOnSave.mockResolvedValue(undefined);

      render(
        <EmailConfigDialog
          isOpen={true}
          config={mockConfig}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    it('should show error when poll interval is too short', async () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const pollIntervalInput = screen.getByLabelText(/poll interval/i);
      fireEvent.change(pollIntervalInput, { target: { value: '0' } });

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Poll interval must be at least 1 minute')).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Test Connection', () => {
    it('should call onTest with correct config', async () => {
      mockOnTest.mockResolvedValue({ success: true, message: 'Connection successful' });

      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      // Fill in form
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'test@gmail.com' },
      });
      fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: 'password123' },
      });

      const testButton = screen.getByRole('button', { name: /test connection/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(mockOnTest).toHaveBeenCalledWith({
          provider: 'gmail',
          host: 'imap.gmail.com',
          port: 993,
          username: 'test@gmail.com',
          password: 'password123',
          ssl: true,
          pollInterval: 300000,
        });
      });
    });

    it('should show success message when test succeeds', async () => {
      mockOnTest.mockResolvedValue({ success: true, message: 'Connection successful' });

      render(
        <EmailConfigDialog
          isOpen={true}
          config={mockConfig}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const testButton = screen.getByRole('button', { name: /test connection/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Connection successful')).toBeInTheDocument();
      });
    });

    it('should show error message when test fails', async () => {
      mockOnTest.mockResolvedValue({ success: false, message: 'Connection failed' });

      render(
        <EmailConfigDialog
          isOpen={true}
          config={mockConfig}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const testButton = screen.getByRole('button', { name: /test connection/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Connection failed')).toBeInTheDocument();
      });
    });

    it('should show Testing... while test is in progress', async () => {
      mockOnTest.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true, message: '' }), 100))
      );

      render(
        <EmailConfigDialog
          isOpen={true}
          config={mockConfig}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const testButton = screen.getByRole('button', { name: /test connection/i });
      fireEvent.click(testButton);

      expect(screen.getByRole('button', { name: /testing\.\.\./i })).toBeInTheDocument();
    });

    it('should disable buttons while testing', async () => {
      mockOnTest.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true, message: '' }), 100))
      );

      render(
        <EmailConfigDialog
          isOpen={true}
          config={mockConfig}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const testButton = screen.getByRole('button', { name: /test connection/i });
      fireEvent.click(testButton);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /save configuration/i })).toBeDisabled();
    });

    it('should not test if validation fails', async () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      // Clear host to make validation fail
      fireEvent.change(screen.getByLabelText(/^host/i), { target: { value: '' } });

      const testButton = screen.getByRole('button', { name: /test connection/i });
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Host is required')).toBeInTheDocument();
      });

      expect(mockOnTest).not.toHaveBeenCalled();
    });
  });

  describe('Save Configuration', () => {
    it('should call onSave with correct config for new configuration', async () => {
      mockOnSave.mockResolvedValue(undefined);

      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      // Fill in form
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'test@gmail.com' },
      });
      fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: 'password123' },
      });

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          provider: 'gmail',
          host: 'imap.gmail.com',
          port: 993,
          username: 'test@gmail.com',
          password: 'password123',
          ssl: true,
          pollInterval: 300000,
          enabled: true,
        });
      });
    });

    it('should call onSave without password if not changed', async () => {
      mockOnSave.mockResolvedValue(undefined);

      render(
        <EmailConfigDialog
          isOpen={true}
          config={mockConfig}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          provider: 'gmail',
          host: 'imap.gmail.com',
          port: 993,
          username: 'test@gmail.com',
          ssl: true,
          pollInterval: 300000,
          enabled: true,
        });
      });
    });

    it('should close dialog after successful save', async () => {
      mockOnSave.mockResolvedValue(undefined);

      render(
        <EmailConfigDialog
          isOpen={true}
          config={mockConfig}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should show error message when save fails', async () => {
      mockOnSave.mockRejectedValue(new Error('Save failed'));

      render(
        <EmailConfigDialog
          isOpen={true}
          config={mockConfig}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should show Saving... while save is in progress', async () => {
      mockOnSave.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );

      render(
        <EmailConfigDialog
          isOpen={true}
          config={mockConfig}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      fireEvent.click(saveButton);

      expect(screen.getByRole('button', { name: /saving\.\.\./i })).toBeInTheDocument();
    });

    it('should disable buttons while saving', async () => {
      mockOnSave.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );

      render(
        <EmailConfigDialog
          isOpen={true}
          config={mockConfig}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      fireEvent.click(saveButton);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /test connection/i })).toBeDisabled();
    });

    it('should not save if validation fails', async () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      // Clear host to make validation fail
      fireEvent.change(screen.getByLabelText(/^host/i), { target: { value: '' } });

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Host is required')).toBeInTheDocument();
      });

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Form Interactions', () => {
    it('should update host when input changes', () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const hostInput = screen.getByLabelText(/^host/i);
      fireEvent.change(hostInput, { target: { value: 'custom.imap.com' } });

      expect(hostInput).toHaveValue('custom.imap.com');
    });

    it('should update port when input changes', () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const portInput = screen.getByLabelText(/^port/i);
      fireEvent.change(portInput, { target: { value: '587' } });

      expect(portInput).toHaveValue(587);
    });

    it('should toggle SSL checkbox', () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const sslCheckbox = screen.getByLabelText(/use ssl\/tls/i);
      expect(sslCheckbox).toBeChecked();

      fireEvent.click(sslCheckbox);
      expect(sslCheckbox).not.toBeChecked();

      fireEvent.click(sslCheckbox);
      expect(sslCheckbox).toBeChecked();
    });

    it('should toggle enabled checkbox', () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const enabledCheckbox = screen.getByLabelText(/enable email polling/i);
      expect(enabledCheckbox).toBeChecked();

      fireEvent.click(enabledCheckbox);
      expect(enabledCheckbox).not.toBeChecked();

      fireEvent.click(enabledCheckbox);
      expect(enabledCheckbox).toBeChecked();
    });

    it('should convert poll interval between minutes and milliseconds', () => {
      render(
        <EmailConfigDialog
          isOpen={true}
          config={null}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onClose={mockOnClose}
        />
      );

      const pollIntervalInput = screen.getByLabelText(/poll interval/i);
      expect(pollIntervalInput).toHaveValue(5); // Default 300000ms = 5 minutes

      fireEvent.change(pollIntervalInput, { target: { value: '10' } });
      expect(pollIntervalInput).toHaveValue(10);
    });
  });
});

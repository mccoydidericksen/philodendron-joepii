'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  getUserNotificationPreferences,
  updateNotificationPreferences,
  requestPhoneVerification,
  verifyPhoneNumber,
  enableSmsNotifications,
  disableSmsNotifications,
} from '@/app/actions/notification-preferences';
import { Button } from '@/components/ui/button';
import type { UserNotificationPreferences } from '@/lib/db/types';

export function NotificationSettings() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Phone verification state
  const [showPhoneSetup, setShowPhoneSetup] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Form state
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailDigestFrequency, setEmailDigestFrequency] = useState<'daily' | 'weekly' | 'never'>('daily');
  const [quietHoursStart, setQuietHoursStart] = useState(21);
  const [quietHoursEnd, setQuietHoursEnd] = useState(9);
  const [notifyTaskDue, setNotifyTaskDue] = useState(true);
  const [notifyTaskOverdue, setNotifyTaskOverdue] = useState(true);
  const [notifyTaskCompleted, setNotifyTaskCompleted] = useState(false);
  const [advanceNoticeHours, setAdvanceNoticeHours] = useState(24);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    setIsLoading(true);
    const result = await getUserNotificationPreferences();
    if (result.success && result.data) {
      const prefs = result.data;
      setPreferences(prefs);
      setEmailEnabled(prefs.emailEnabled);
      setEmailDigestFrequency((prefs.emailDigestFrequency as any) || 'daily');
      setQuietHoursStart(prefs.quietHoursStart || 21);
      setQuietHoursEnd(prefs.quietHoursEnd || 9);
      setNotifyTaskDue(prefs.notifyTaskDue);
      setNotifyTaskOverdue(prefs.notifyTaskOverdue);
      setNotifyTaskCompleted(prefs.notifyTaskCompleted);
      setAdvanceNoticeHours(prefs.advanceNoticeHours);
      if (prefs.phoneNumber) {
        setPhoneNumber(prefs.phoneNumber);
      }
    }
    setIsLoading(false);
  }

  async function handleSavePreferences() {
    setIsSaving(true);
    const result = await updateNotificationPreferences({
      emailEnabled,
      emailDigestFrequency,
      quietHoursStart,
      quietHoursEnd,
      notifyTaskDue,
      notifyTaskOverdue,
      notifyTaskCompleted,
      advanceNoticeHours,
    });

    setIsSaving(false);

    if (result.success) {
      toast.success('Preferences saved!');
      router.refresh();
    } else {
      toast.error('Failed to save preferences', {
        description: result.error,
      });
    }
  }

  async function handleRequestVerification() {
    if (!phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    setIsVerifying(true);
    const result = await requestPhoneVerification(phoneNumber);
    setIsVerifying(false);

    if (result.success) {
      setShowVerificationInput(true);
      toast.success('Verification code sent!', {
        description: 'Check your phone for the code (currently logged to console)',
      });
    } else {
      toast.error('Failed to send verification code', {
        description: result.error,
      });
    }
  }

  async function handleVerifyCode() {
    if (!verificationCode) {
      toast.error('Please enter the verification code');
      return;
    }

    setIsVerifying(true);
    const result = await verifyPhoneNumber(verificationCode);
    setIsVerifying(false);

    if (result.success) {
      toast.success('Phone verified!', {
        description: 'You can now enable SMS notifications',
      });
      await loadPreferences();
      setShowVerificationInput(false);
      setVerificationCode('');
    } else {
      toast.error('Verification failed', {
        description: result.error,
      });
    }
  }

  async function handleToggleSms(enable: boolean) {
    setIsSaving(true);
    const result = enable ? await enableSmsNotifications() : await disableSmsNotifications();
    setIsSaving(false);

    if (result.success) {
      toast.success(enable ? 'SMS notifications enabled!' : 'SMS notifications disabled');
      await loadPreferences();
      router.refresh();
    } else {
      toast.error(`Failed to ${enable ? 'enable' : 'disable'} SMS`, {
        description: result.error,
      });
    }
  }

  function formatTime(hour: number): string {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${ampm}`;
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border-2 border-sage bg-card-bg p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-moss mx-auto"></div>
        <p className="mt-2 text-soil">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* In-App Notifications */}
      <div className="rounded-lg border-2 border-sage bg-card-bg p-6">
        <h3 className="text-xl font-semibold text-moss-dark mb-4">📱 In-App Notifications</h3>
        <p className="text-sm text-soil mb-4">
          Toast notifications and notification bell alerts are always enabled
        </p>
      </div>

      {/* SMS Notifications */}
      <div className="rounded-lg border-2 border-sage bg-card-bg p-6">
        <h3 className="text-xl font-semibold text-moss-dark mb-4">💬 SMS Notifications</h3>

        {!preferences?.phoneVerified ? (
          <div className="space-y-4">
            <p className="text-sm text-soil">
              Receive text message reminders for your plant care tasks
            </p>

            {!showPhoneSetup ? (
              <Button
                onClick={() => setShowPhoneSetup(true)}
                className="bg-moss hover:bg-moss-light text-white"
              >
                Set Up SMS Notifications
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-soil mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+12345678900"
                    disabled={showVerificationInput}
                    className="w-full max-w-md rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
                  />
                  <p className="text-xs text-soil mt-1">
                    Use E.164 format: +[country code][number] (e.g., +12125551234)
                  </p>
                </div>

                {!showVerificationInput ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleRequestVerification}
                      disabled={isVerifying || !phoneNumber}
                      className="bg-moss hover:bg-moss-light text-white"
                    >
                      {isVerifying ? 'Sending...' : 'Send Verification Code'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPhoneSetup(false);
                        setPhoneNumber('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 bg-sage/20 rounded-lg p-4 border-2 border-sage">
                    <p className="text-sm text-moss-dark font-medium">
                      Check your phone for a verification code
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-soil mb-2">
                        Verification Code
                      </label>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        maxLength={6}
                        className="w-full max-w-xs rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark font-mono text-lg tracking-widest text-center focus:border-moss focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleVerifyCode}
                        disabled={isVerifying || verificationCode.length !== 6}
                        className="bg-moss hover:bg-moss-light text-white"
                      >
                        {isVerifying ? 'Verifying...' : 'Verify Code'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRequestVerification}
                        disabled={isVerifying}
                      >
                        Resend Code
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-sage/20 rounded-lg border-2 border-sage">
              <div>
                <p className="font-medium text-moss-dark">✅ Phone Verified</p>
                <p className="text-sm text-soil">{preferences.phoneNumber}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-soil">
                  {preferences.smsEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <button
                  onClick={() => handleToggleSms(!preferences.smsEnabled)}
                  disabled={isSaving}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.smsEnabled ? 'bg-moss' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.smsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Email Notifications */}
      <div className="rounded-lg border-2 border-sage bg-card-bg p-6">
        <h3 className="text-xl font-semibold text-moss-dark mb-4">📧 Email Notifications</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-moss-dark">Email Notifications</p>
              <p className="text-sm text-soil">Receive task reminders via email</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-soil">{emailEnabled ? 'Enabled' : 'Disabled'}</span>
              <button
                onClick={() => setEmailEnabled(!emailEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  emailEnabled ? 'bg-moss' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    emailEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {emailEnabled && (
            <div>
              <label className="block text-sm font-medium text-soil mb-2">
                Digest Frequency
              </label>
              <select
                value={emailDigestFrequency}
                onChange={(e) => setEmailDigestFrequency(e.target.value as any)}
                className="w-full max-w-md rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
              >
                <option value="daily">Daily Summary</option>
                <option value="weekly">Weekly Summary</option>
                <option value="never">Individual Alerts Only</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Notification Types */}
      <div className="rounded-lg border-2 border-sage bg-card-bg p-6">
        <h3 className="text-xl font-semibold text-moss-dark mb-4">🔔 Notification Types</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-moss-dark">Tasks Due</p>
              <p className="text-sm text-soil">Notify when tasks are coming due</p>
            </div>
            <input
              type="checkbox"
              checked={notifyTaskDue}
              onChange={(e) => setNotifyTaskDue(e.target.checked)}
              className="h-5 w-5 rounded border-2 border-sage text-moss focus:ring-moss"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-moss-dark">Overdue Tasks</p>
              <p className="text-sm text-soil">Notify when tasks are overdue</p>
            </div>
            <input
              type="checkbox"
              checked={notifyTaskOverdue}
              onChange={(e) => setNotifyTaskOverdue(e.target.checked)}
              className="h-5 w-5 rounded border-2 border-sage text-moss focus:ring-moss"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-moss-dark">Task Completions</p>
              <p className="text-sm text-soil">Notify when you complete tasks</p>
            </div>
            <input
              type="checkbox"
              checked={notifyTaskCompleted}
              onChange={(e) => setNotifyTaskCompleted(e.target.checked)}
              className="h-5 w-5 rounded border-2 border-sage text-moss focus:ring-moss"
            />
          </div>
        </div>
      </div>

      {/* Timing Settings */}
      <div className="rounded-lg border-2 border-sage bg-card-bg p-6">
        <h3 className="text-xl font-semibold text-moss-dark mb-4">⏰ Timing Settings</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-soil mb-2">
              Advance Notice
            </label>
            <select
              value={advanceNoticeHours}
              onChange={(e) => setAdvanceNoticeHours(parseInt(e.target.value))}
              className="w-full max-w-md rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
            >
              <option value={1}>1 hour before</option>
              <option value={6}>6 hours before</option>
              <option value={12}>12 hours before</option>
              <option value={24}>24 hours before (1 day)</option>
              <option value={48}>48 hours before (2 days)</option>
            </select>
            <p className="text-xs text-soil mt-1">
              How far in advance to notify you before tasks are due
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-soil mb-2">
              Quiet Hours
            </label>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="block text-xs text-soil mb-1">Start</label>
                <select
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(parseInt(e.target.value))}
                  className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {formatTime(i)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-soil mb-1">End</label>
                <select
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(parseInt(e.target.value))}
                  className="w-full rounded-md border-2 border-sage bg-white px-3 py-2 text-moss-dark focus:border-moss focus:outline-none"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {formatTime(i)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-xs text-soil mt-1">
              No notifications will be sent during these hours (for SMS/email)
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSavePreferences}
          disabled={isSaving}
          className="bg-moss hover:bg-moss-light text-white px-8"
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}

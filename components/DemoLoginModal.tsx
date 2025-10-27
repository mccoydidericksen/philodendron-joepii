'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface DemoLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoLoginModal({ isOpen, onClose }: DemoLoginModalProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const demoCredentials = {
    email: 'john.doe@plantrot.app',
    password: 'DemoPlantTracker2025!',
  };

  const handleCopyPassword = async () => {
    await navigator.clipboard.writeText(demoCredentials.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoginToDemo = () => {
    // Store demo credentials in sessionStorage so the sign-in page can pre-fill them
    sessionStorage.setItem('demo_email', demoCredentials.email);
    router.push('/sign-in');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-moss-dark/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl border-2 border-sage bg-card-bg p-6 shadow-xl animate-spring-in">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-moss-dark">
            👨‍💻 Developer's Showcase Account
          </h2>
          <p className="mt-2 text-sm text-soil">
            Welcome! This demo account lets you explore all features of the app.
            Feel free to add, edit, or delete anything - it's all demo data!
          </p>
        </div>

        {/* Credentials Section */}
        <div className="mb-6 rounded-lg border border-sage bg-cream p-4">
          <h3 className="mb-3 font-semibold text-moss-dark">Demo Credentials</h3>

          {/* Email */}
          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-soil">
              Email
            </label>
            <div className="rounded-md border border-sage bg-card-bg px-3 py-2 font-mono text-sm text-moss-dark">
              {demoCredentials.email}
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-xs font-medium text-soil">
              Password
            </label>
            <div className="flex gap-2">
              <div className="flex-1 rounded-md border border-sage bg-card-bg px-3 py-2 font-mono text-sm text-moss-dark">
                {demoCredentials.password}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPassword}
                className="shrink-0"
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mb-6 rounded-lg border border-sage-dark/30 bg-moss/10 p-3">
          <p className="text-xs text-soil">
            <strong>Note:</strong> This is a fully interactive demo. All CRUD operations work,
            and changes persist during your session. Your edits won't affect the
            developer's real data.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-moss text-cream hover:bg-moss-light"
            onClick={handleLoginToDemo}
          >
            Login to Demo →
          </Button>
        </div>
      </div>
    </div>
  );
}

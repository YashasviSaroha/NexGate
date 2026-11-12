import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext.js';
import { apiClient } from '../../api/client.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { ArrowLeft, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await apiClient.post('/api/v1/auth/forgot-password', { email });
      success('Reset Dispatched', 'Check your email or use the reset token below.');
      if (res.data?.data?.devResetToken) {
        setToken(res.data.data.devResetToken);
      }
      setStep('reset');
    } catch (err: any) {
      error('Request Failed', err.response?.data?.error?.message || 'Unable to process reset request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      error('Password Mismatch', 'New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      error('Password Too Short', 'Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/api/v1/auth/reset-password', {
        token,
        newPassword,
      });
      success('Password Updated', 'Your password has been changed. Please sign in.');
      navigate('/login');
    } catch (err: any) {
      error('Reset Failed', err.response?.data?.error?.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-neon-blue/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 mb-2">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {step === 'request' ? 'Reset your password' : 'Set new password'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {step === 'request'
              ? 'Enter your account email to receive reset instructions.'
              : 'Enter your reset token and your new secure password.'}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
          {step === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
              />

              <Button type="submit" className="w-full" isLoading={isLoading}>
                <span>Send Reset Link</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Input
                label="Reset Token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste reset token"
                required
              />

              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
              />

              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                minLength={8}
              />

              <Button type="submit" className="w-full" isLoading={isLoading}>
                <span>Update Password</span>
                <CheckCircle2 className="w-4 h-4 ml-1" />
              </Button>
            </form>
          )}

          <div className="pt-2 text-center text-xs">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { ArrowRight, Lock, Mail } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('admin@nexgate.dev');
  const [password, setPassword] = useState('Password123!');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { error, success } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login({ email, password });
      success('Welcome to NexGate', 'Signed in successfully.');
      navigate('/');
    } catch (err: any) {
      error('Authentication Failed', err.response?.data?.error?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-neon-blue/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl overflow-hidden shadow-lg border border-border/50 mb-2">
            <img src="/logo-icon.jpg" alt="NexGate" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sign in to NexGate</h1>
          <p className="text-xs text-muted-foreground">API Infrastructure, Simplified.</p>
        </div>

        {/* Card Form */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
            />

            <div>
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <div className="flex justify-end mt-1.5">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Forget Password?
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              <span>Sign in</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          <div className="pt-2 text-center text-xs text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/auth/register" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="font-semibold text-primary hover:underline">
            Home
          </Link>
          {' · '}
          <Link to="/demo" className="font-semibold text-primary hover:underline">
            Instant Demo
          </Link>
        </p>
      </div>
    </div>
  );
}

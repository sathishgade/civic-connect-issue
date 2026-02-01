import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Layout } from '@/components/layout/Layout';
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (role: 'citizen' | 'admin' | 'employee') => {
    const demoCredentials = {
      citizen: { email: 'citizen@demo.com', password: 'demo123' },
      admin: { email: 'admin@demo.com', password: 'demo123' },
      employee: { email: 'employee@demo.com', password: 'demo123' },
    };
    
    setIsLoading(true);
    try {
      await login(demoCredentials[role].email, demoCredentials[role].password);
      toast.success(`Logged in as ${role}`);
      navigate(role === 'citizen' ? '/dashboard' : role === 'admin' ? '/admin' : '/employee');
    } catch (error) {
      toast.error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout showFooter={false}>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-civic">
                <Building2 className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{t('nav.login')}</h1>
            <p className="text-muted-foreground mt-1">Sign in to your CivicConnect account</p>
          </div>

          {/* Login Form */}
          <div className="card-civic">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-civic"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-civic pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button type="submit" variant="civic" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  t('auth.loginBtn')
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-4 text-muted-foreground">or try demo accounts</span>
              </div>
            </div>

            {/* Demo Login Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDemoLogin('citizen')}
                disabled={isLoading}
              >
                Citizen
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDemoLogin('admin')}
                disabled={isLoading}
              >
                Admin
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDemoLogin('employee')}
                disabled={isLoading}
              >
                Employee
              </Button>
            </div>
          </div>

          {/* Register Link */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-primary font-medium hover:underline">
              {t('nav.register')}
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}

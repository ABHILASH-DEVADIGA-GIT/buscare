import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, seedData } from '@/lib/api';
import { setAuthData } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const { t, setLanguage } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    client_id: 'demo-client-001',
  });

  useEffect(() => {
    initializeDemoData();
  }, []);

  const initializeDemoData = async () => {
    try {
      await seedData();
    } catch (error) {
      console.log('Demo data already exists');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await login(formData);
      const { token, user, client } = response.data;
      
      setAuthData(token, user, client);
      
      // Set user's preferred language
      if (user.preferred_language) {
        setLanguage(user.preferred_language);
      }
      
      toast.success(t('login_success'));
      
      // Navigate based on role
      if (user.role === 'DRIVER') {
        navigate('/inspections');
      } else if (user.role === 'MECHANIC') {
        navigate('/mechanic');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || t('login_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-4">
      {/* Language Switcher in top right */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher variant="default" />
      </div>
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img 
            src="/logo.png" 
            alt="BSP Tech Solutions" 
            className="h-20 w-auto mx-auto mb-4 rounded-lg"
          />
          <p className="text-slate-600 font-medium">{t('fleet_platform')}</p>
        </div>

        <Card className="border-slate-200 shadow-md">
          <CardHeader>
            <CardTitle>{t('sign_in')}</CardTitle>
            <CardDescription>{t('enter_credentials')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="client_id">{t('client_id')}</Label>
                <Input
                  id="client_id"
                  type="text"
                  placeholder="demo-client-001"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  required
                  data-testid="client-id-input"
                />
              </div>

              <div>
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="email-input"
                />
              </div>

              <div>
                <Label htmlFor="password">{t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  data-testid="password-input"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-900 hover:bg-blue-800"
                disabled={loading}
                data-testid="login-button"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('sign_in')}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 mb-2">{t('demo_credentials')}:</p>
              <div className="text-xs text-blue-800 space-y-1">
                <p><strong>{t('client_id')}:</strong> demo-client-001</p>
                <p><strong>{t('role_platform_admin')}:</strong> platform@admin.com / platform123</p>
                <p><strong>{t('role_admin')}:</strong> admin@demo.com / admin123</p>
                <p><strong>{t('role_supervisor')}:</strong> supervisor@demo.com / super123</p>
                <p><strong>{t('role_driver')}:</strong> driver@demo.com / driver123</p>
                <p><strong>{t('role_mechanic')}:</strong> mechanic@demo.com / mech123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer with BSP Logo and Copyright */}
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
        </div>
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} All rights reserved by BSP Tech Solutions
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

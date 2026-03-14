import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getUser, getClient, clearAuthData } from '@/lib/auth';
import { useLanguage } from '@/lib/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ClipboardCheck,
  Wrench,
  MessageSquare,
  AlertTriangle,
  DollarSign,
  Menu,
  X,
  LogOut,
  Bus,
  Building2,
  Users,
} from 'lucide-react';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const client = getClient();
  const { t } = useLanguage();

  const handleLogout = () => {
    clearAuthData();
    navigate('/login');
  };

  const navigation = [
    { name: t('dashboard'), href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'OWNER', 'SUPERVISOR', 'PLATFORM_ADMIN'] },
    { name: t('inspections'), href: '/inspections', icon: ClipboardCheck, roles: ['DRIVER', 'SUPERVISOR', 'ADMIN', 'OWNER'] },
    { name: 'Mechanic', href: '/mechanic', icon: Wrench, roles: ['MECHANIC'] },
    { name: t('feedback'), href: '/feedback-management', icon: MessageSquare, roles: ['SUPERVISOR', 'ADMIN', 'OWNER'] },
    { name: t('alerts'), href: '/alerts', icon: AlertTriangle, roles: ['SUPERVISOR', 'ADMIN', 'OWNER'] },
    { name: t('financial'), href: '/financial', icon: DollarSign, roles: ['SUPERVISOR', 'ADMIN', 'OWNER'] },
    { name: t('buses'), href: '/buses', icon: Bus, roles: ['ADMIN', 'OWNER'] },
    { name: t('clients'), href: '/clients', icon: Building2, roles: ['PLATFORM_ADMIN'] },
    { name: 'Bus Master', href: '/bus-master', icon: Bus, roles: ['PLATFORM_ADMIN'] },
    { name: t('users'), href: '/user-master', icon: Users, roles: ['PLATFORM_ADMIN'] },
  ];

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(user?.role)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2">
            {client?.logo ? (
              <img src={client.logo} alt={client.company_name} className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center">
                <Bus className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="font-bold text-lg text-slate-900">
              {client?.company_name || 'BusCare'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="minimal" showText={false} />
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2"
              data-testid="mobile-menu-button"
            >
              {sidebarOpen ? (
                <X className="w-6 h-6 text-slate-700" />
              ) : (
                <Menu className="w-6 h-6 text-slate-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {client?.logo ? (
                <img src={client.logo} alt={client.company_name} className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center">
                  <Bus className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="font-bold text-lg text-slate-900 tracking-tight">
                  {client?.company_name || 'BusCare'}
                </h1>
                <p className="text-xs text-slate-500 uppercase font-semibold tracking-wider">
                  {user?.role}
                </p>
              </div>
            </div>
          </div>
          {/* Language Switcher */}
          <div className="mt-4">
            <LanguageSwitcher variant="default" />
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 border border-blue-200 text-blue-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
          <div className="mb-3 px-2">
            <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-start gap-2"
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4" />
            {t('sign_out')}
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)}>
          <aside
            className="fixed left-0 top-16 bottom-0 w-64 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="p-4 space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 border border-blue-200 text-blue-900'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
              <div className="mb-3 px-2">
                <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full justify-start gap-2"
              >
                <LogOut className="w-4 h-4" />
                {t('sign_out')}
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;

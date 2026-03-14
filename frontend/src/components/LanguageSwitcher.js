import React from 'react';
import { useLanguage } from '@/lib/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

const LanguageSwitcher = ({ variant = 'default', showText = true }) => {
  const { language, setLanguage, t } = useLanguage();

  const languages = [
    { code: 'EN', name: 'English', nativeName: 'English' },
    { code: 'KN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  ];

  const currentLang = languages.find(l => l.code === language);

  if (variant === 'minimal') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-2" data-testid="language-switcher">
            <Globe className="h-4 w-4" />
            {showText && <span className="ml-1 text-sm">{currentLang?.code}</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={language === lang.code ? 'bg-blue-50' : ''}
              data-testid={`lang-option-${lang.code}`}
            >
              <span className="mr-2">{lang.nativeName}</span>
              {language === lang.code && <span className="text-blue-600">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-9 gap-2"
          data-testid="language-switcher"
        >
          <Globe className="h-4 w-4" />
          {showText && <span>{currentLang?.nativeName}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`cursor-pointer ${language === lang.code ? 'bg-blue-50 text-blue-700' : ''}`}
            data-testid={`lang-option-${lang.code}`}
          >
            <div className="flex items-center justify-between w-full">
              <span>{lang.nativeName}</span>
              {language === lang.code && (
                <span className="text-blue-600 font-bold">✓</span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;

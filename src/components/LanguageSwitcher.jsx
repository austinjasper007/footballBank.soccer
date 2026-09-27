"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { locales, localeNames } from "@/lib/client-dictionaries";

export default function LanguageSwitcher({ currentLang }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const switchLanguage = (newLang) => {
    // Remove current locale from pathname
    const segments = pathname.split('/');
    const currentLocale = segments[1];
    
    let newPathname;
    if (locales.includes(currentLocale)) {
      // Replace current locale with new locale
      segments[1] = newLang;
      newPathname = segments.join('/');
    } else {
      // Add new locale to beginning
      newPathname = `/${newLang}${pathname}`;
    }

    router.push(newPathname);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 sm:space-x-2 px-1 py-0 sm:px-2 sm:py-1.25 rounded-md border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
        aria-label="Select language"
      >
        <span className="text-sm font-medium text-gray-700">
          {currentLang.toUpperCase()}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-30 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="py-1">
            {locales.map((locale) => (
              <button
                key={locale}
                onClick={() => switchLanguage(locale)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center ${
                  locale === currentLang
                    ? "bg-gray-50 text-accent-red font-medium"
                    : "text-gray-700"
                }`}
              >
                <span>{localeNames[locale]}</span>
                {locale === currentLang && (
                  <svg
                    className="w-4 h-4 ml-auto text-accent-red"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { createContext, useContext, useState, useCallback } from 'react';
import ru from './ru';
import tk from './tk';
import en from './en';

const LANGS = { ru, tk, en };
const LANG_NAMES = { ru: 'Рус', tk: 'TM', en: 'EN' };
const STORAGE_KEY = 'cb_lang';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'ru'
  );

  const setLang = useCallback((l) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  }, []);

  const t = LANGS[lang] || LANGS.ru;

  return (
    <LangContext.Provider value={{ lang, setLang, t, LANG_NAMES }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LangProvider');
  return ctx;
}

// Switcher component — drop it anywhere in the UI
export function LangSwitcher({ className = '' }) {
  const { lang, setLang, LANG_NAMES } = useLang();
  return (
    <div style={{ display: 'flex', gap: 4 }} className={className}>
      {Object.keys(LANG_NAMES).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            padding: '4px 10px',
            borderRadius: 20,
            border: '1.5px solid',
            borderColor: lang === l ? 'var(--rose, #e8614a)' : 'var(--gray-200, #e5e7eb)',
            background: lang === l ? 'var(--rose-light, #fdf0ed)' : 'transparent',
            color: lang === l ? 'var(--rose, #e8614a)' : 'var(--gray-400, #9ca3af)',
            fontWeight: lang === l ? 700 : 500,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {LANG_NAMES[l]}
        </button>
      ))}
    </div>
  );
}

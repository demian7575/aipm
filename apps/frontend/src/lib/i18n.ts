import { createContext, useContext, useMemo, useState } from 'react';

type Locale = 'en' | 'ko';

type Messages = Record<string, string>;

type Dictionary = Record<Locale, Messages>;

const dictionary: Dictionary = {
  en: {
    outline: 'Outline',
    mindmap: 'Mindmap',
    expandAll: 'Expand All',
    collapseAll: 'Collapse All',
    expandDepth: 'Expand depth',
    details: 'Details',
    github: 'GitHub',
    investWarnings: 'INVEST & Testability',
    ambiguityFlags: 'Ambiguity flags',
    actions: 'Actions',
    updateBranch: 'Update branch',
    drift: 'Drift',
    lastSync: 'Last sync'
  },
  ko: {
    outline: '아웃라인',
    mindmap: '마인드맵',
    expandAll: '전체 펼치기',
    collapseAll: '전체 접기',
    expandDepth: '깊이 펼치기',
    details: '세부 정보',
    github: '깃허브',
    investWarnings: 'INVEST 및 테스트',
    ambiguityFlags: '모호성 경고',
    actions: '액션',
    updateBranch: '브랜치 갱신',
    drift: '드리프트',
    lastSync: '마지막 동기화'
  }
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: keyof typeof dictionary.en) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');
  const value = useMemo(() => {
    const messages = dictionary[locale];
    return {
      locale,
      setLocale,
      t: (key: keyof typeof dictionary.en) => messages[key] ?? key
    };
  }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('I18n context missing');
  }
  return ctx;
}

export { dictionary };

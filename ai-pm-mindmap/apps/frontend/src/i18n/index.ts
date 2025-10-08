export type Locale = 'en' | 'ko';

type TranslationMap = Record<string, string>;

const translations: Record<Locale, TranslationMap> = {
  en: {
    outlineView: 'Outline Tree',
    mindmapView: 'Mindmap',
    investStatus: 'INVEST Assessment',
    ambiguousFlags: 'Ambiguity Flags',
    tests: 'Acceptance Tests',
    noStorySelected: 'Select a story to view details',
    refresh: 'Refresh Branch',
    repository: 'Repository',
    branch: 'Branch',
    drift: 'Branch Drift',
    lastSync: 'Last Sync',
    keyboardShortcuts: 'Keyboard Shortcuts',
    addChild: 'Add child',
    addSibling: 'Add sibling',
    addTest: 'Add test',
    delete: 'Delete',
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    viewMode: 'View mode'
  },
  ko: {
    outlineView: '아웃라인 트리',
    mindmapView: '마인드맵',
    investStatus: 'INVEST 평가',
    ambiguousFlags: '모호성 플래그',
    tests: '인수 테스트',
    noStorySelected: '스토리를 선택하세요',
    refresh: '브랜치 새로고침',
    repository: '저장소',
    branch: '브랜치',
    drift: '드리프트',
    lastSync: '마지막 동기화',
    keyboardShortcuts: '키보드 단축키',
    addChild: '하위 항목 추가',
    addSibling: '동일 레벨 추가',
    addTest: '테스트 추가',
    delete: '삭제',
    expandAll: '전체 확장',
    collapseAll: '전체 접기',
    viewMode: '뷰 전환'
  }
};

let locale: Locale = 'en';

export function setLocale(next: Locale) {
  locale = next;
}

export function t(key: keyof TranslationMap) {
  return translations[locale][key] ?? translations.en[key];
}

export function getLocale() {
  return locale;
}

export type Locale = 'en' | 'ko';

export const translations: Record<Locale, Record<string, string>> = {
  en: {
    appTitle: 'AI PM Mindmap',
    outlineView: 'Outline',
    mindmapView: 'Mindmap',
    stories: 'Stories',
    tests: 'Acceptance Tests',
    addStory: 'Add Story',
    addChild: 'Add Child',
    addSibling: 'Add Sibling',
    addTest: 'Add Test',
    delete: 'Delete',
    edit: 'Edit',
    status: 'Status',
    investSummary: 'INVEST Summary',
    ambiguityFlags: 'Ambiguity Flags',
    githubPanel: 'GitHub Source',
    refresh: 'Refresh',
    drifted: 'Drift Detected',
    synced: 'Synced',
  },
  ko: {
    appTitle: 'AI PM 마인드맵',
    outlineView: '아웃라인',
    mindmapView: '마인드맵',
    stories: '스토리',
    tests: '인수 테스트',
    addStory: '스토리 추가',
    addChild: '하위 추가',
    addSibling: '동일 레벨 추가',
    addTest: '테스트 추가',
    delete: '삭제',
    edit: '편집',
    status: '상태',
    investSummary: 'INVEST 요약',
    ambiguityFlags: '모호성 플래그',
    githubPanel: 'GitHub 소스',
    refresh: '새로고침',
    drifted: '드리프트 감지됨',
    synced: '동기화 완료',
  },
};

export const ambiguityDictionary = {
  en: ['should', 'maybe', 'asap', 'etc', 'optimal', 'fast', 'sufficiently'],
  ko: ['적절히', '빠르게', '최적', '가능하면', '추후', '등등', '대략'],
};

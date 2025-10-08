import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      outline: 'Outline',
      mindmap: 'Mindmap',
      expandAll: 'Expand All',
      collapseAll: 'Collapse All',
      expandDepth: 'Expand to depth',
      githubPanel: 'GitHub Status',
      updateBranch: 'Update Branch',
      drift: 'Drift',
      lastSyncAt: 'Last Sync',
      invest: 'INVEST',
      ambiguity: 'Ambiguity',
      measurable: 'Measurable',
      addStory: 'Add Story',
      addChild: 'Add Child',
      addTest: 'Add Test',
      delete: 'Delete'
    }
  },
  ko: {
    translation: {
      outline: '개요',
      mindmap: '마인드맵',
      expandAll: '모두 펼치기',
      collapseAll: '모두 접기',
      expandDepth: '깊이까지 펼치기',
      githubPanel: 'GitHub 상태',
      updateBranch: '브랜치 갱신',
      drift: '드리프트',
      lastSyncAt: '마지막 동기화',
      invest: 'INVEST',
      ambiguity: '모호성',
      measurable: '측정 가능',
      addStory: '스토리 추가',
      addChild: '하위 추가',
      addTest: '테스트 추가',
      delete: '삭제'
    }
  }
} as const;

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
});

export default i18n;

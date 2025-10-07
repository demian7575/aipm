import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      appTitle: 'AI PM Mindmap',
      outline: 'Outline',
      mindmap: 'Mindmap',
      selectMergeRequest: 'Select Merge Request',
      details: 'Details',
      githubPanel: 'GitHub',
      drift: 'Drift',
      lastSync: 'Last synced',
      refresh: 'Refresh',
      investIssues: 'INVEST Issues',
      ambiguityFlags: 'Ambiguity Flags',
      measurableFlags: 'Measurable Reminders',
      tests: 'Acceptance Tests',
      addStory: 'Add Story',
      addSibling: 'Add Sibling',
      addTest: 'Add Test',
      delete: 'Delete',
      expandAll: 'Expand all',
      collapseAll: 'Collapse all'
    }
  },
  ko: {
    translation: {
      appTitle: 'AI PM 마인드맵',
      outline: '아웃라인',
      mindmap: '마인드맵',
      selectMergeRequest: '머지요청 선택',
      details: '상세',
      githubPanel: '깃허브',
      drift: '드리프트',
      lastSync: '마지막 동기화',
      refresh: '새로고침',
      investIssues: 'INVEST 문제',
      ambiguityFlags: '모호성 경고',
      measurableFlags: '측정 가능 메모',
      tests: '인수 테스트',
      addStory: '스토리 추가',
      addSibling: '형제 추가',
      addTest: '테스트 추가',
      delete: '삭제',
      expandAll: '모두 펼치기',
      collapseAll: '모두 접기'
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
});

export default i18n;

import clsx from 'clsx';
import { t } from '../i18n';
import { useStoryStore } from '../store/useStoryStore';

type ViewSwitchVariant = 'header' | 'panel';

interface ViewSwitchProps {
  variant?: ViewSwitchVariant;
}

export function ViewSwitch({ variant = 'header' }: ViewSwitchProps) {
  const { view, toggleView } = useStoryStore((state) => ({
    view: state.view,
    toggleView: state.toggleView
  }));

  const handleSelect = (mode: typeof view) => {
    if (mode !== view) {
      toggleView(mode);
    }
  };

  return (
    <div
      className={clsx('view-switch', `view-switch--${variant}`)}
      role="radiogroup"
      aria-label={t('viewMode')}
    >
      <button
        type="button"
        className={clsx('view-switch__option', { 'is-active': view === 'outline' })}
        role="radio"
        aria-checked={view === 'outline'}
        onClick={() => handleSelect('outline')}
      >
        {t('outlineView')}
      </button>
      <button
        type="button"
        className={clsx('view-switch__option', { 'is-active': view === 'mindmap' })}
        role="radio"
        aria-checked={view === 'mindmap'}
        onClick={() => handleSelect('mindmap')}
      >
        {t('mindmapView')}
      </button>
    </div>
  );
}

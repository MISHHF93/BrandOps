import { KeyboardEvent, useMemo, useRef } from 'react';
import { cn } from '../utils/cn';
import { focusRingClass, interactiveTransitionClass } from '../utils/styles';

export interface TabItem {
  key: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
  tabListLabel?: string;
}

export function Tabs({
  items,
  activeKey,
  onChange,
  className,
  tabListLabel = 'Section tabs'
}: TabsProps) {
  const enabledItems = useMemo(() => items.filter((item) => !item.disabled), [items]);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (
      event.key !== 'ArrowRight' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return;
    }

    event.preventDefault();
    if (enabledItems.length === 0) return;

    if (event.key === 'Home') {
      const firstTab = enabledItems[0];
      onChange(firstTab.key);
      buttonRefs.current[firstTab.key]?.focus();
      return;
    }

    if (event.key === 'End') {
      const lastTab = enabledItems[enabledItems.length - 1];
      onChange(lastTab.key);
      buttonRefs.current[lastTab.key]?.focus();
      return;
    }

    const currentIndex = enabledItems.findIndex((item) => item.key === activeKey);
    if (currentIndex === -1) return;

    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentIndex + direction + enabledItems.length) % enabledItems.length;
    const nextTab = enabledItems[nextIndex];
    onChange(nextTab.key);
    buttonRefs.current[nextTab.key]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={tabListLabel}
      onKeyDown={onKeyDown}
      className={cn('inline-flex flex-wrap items-center gap-2 rounded-md bg-bgSubtle p-1', className)}
    >
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            type="button"
            ref={(node) => {
              buttonRefs.current[item.key] = node;
            }}
            role="tab"
            id={`tab-${item.key}`}
            aria-controls={`tabpanel-${item.key}`}
            aria-selected={isActive}
            disabled={item.disabled}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-bodyStrong',
              focusRingClass,
              interactiveTransitionClass,
              isActive
                ? 'border-primary/50 bg-primarySoft text-primary shadow-glow'
                : 'border-transparent text-textMuted hover:border-border/80 hover:bg-surfaceHover hover:text-text',
              item.disabled && 'cursor-not-allowed border-border/40 text-textSoft opacity-50'
            )}
          >
            <span>{item.label}</span>
            {typeof item.count === 'number' ? (
              <span className="rounded-sm bg-bgElevated px-1.5 py-0.5 text-micro text-textSoft">
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

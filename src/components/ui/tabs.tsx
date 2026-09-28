'use client'

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface TabsContextValue {
  activeTab: string
  setActiveTab: (id: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tab components must be used within Tabs')
  return ctx
}

interface TabsProps {
  defaultTab: string
  children: ReactNode
  className?: string
  onChange?: (tab: string) => void
}

function Tabs({ defaultTab, children, className, onChange }: TabsProps) {
  const [activeTab, setActive] = useState(defaultTab)

  const setActiveTab = useCallback((id: string) => {
    setActive(id)
    onChange?.(id)
  }, [onChange])

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabListProps {
  children: ReactNode
  className?: string
}

function TabList({ children, className }: TabListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-1 border-b border-neutral-200 px-1',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface TabProps {
  id: string
  children: ReactNode
  icon?: ReactNode
  className?: string
}

function Tab({ id, children, icon, className }: TabProps) {
  const { activeTab, setActiveTab } = useTabs()
  const isActive = activeTab === id

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      onClick={() => setActiveTab(id)}
      className={cn(
        'relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-0 rounded-t-lg',
        isActive
          ? 'text-primary-700'
          : 'text-neutral-500 hover:text-neutral-700',
        className,
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
      {isActive && (
        <span className="absolute bottom-0 inset-x-2 h-0.5 rounded-full bg-primary-600" />
      )}
    </button>
  )
}

interface TabPanelProps {
  id: string
  children: ReactNode
  className?: string
}

function TabPanel({ id, children, className }: TabPanelProps) {
  const { activeTab } = useTabs()
  if (activeTab !== id) return null

  return (
    <div
      role="tabpanel"
      className={cn('animate-fadeIn', className)}
    >
      {children}
    </div>
  )
}

export { Tabs, TabList, Tab, TabPanel }

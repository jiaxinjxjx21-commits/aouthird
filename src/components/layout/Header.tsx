import React, { useRef, useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Bell, 
  Plus, 
  Sparkles, 
  Search,
  Menu,
  LogIn,
  Ticket
} from 'lucide-react';
import { motion } from 'motion/react';
import { ViewMode, UserProfile } from '../../types';
import { UserProfileMenu } from './UserProfileMenu';

interface HeaderProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenNewEvent: () => void;
  onOpenNewTask: () => void;
  onOpenJoinCode?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleMobileSidebar?: () => void;
  currentUser: UserProfile | null;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onSignOut: () => void;
  onOpenLogin: () => void;
  onClearAllData?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSelectView,
  unreadCount,
  onOpenNotifications,
  onOpenNewEvent,
  onOpenNewTask,
  onOpenJoinCode,
  searchQuery,
  onSearchChange,
  onToggleMobileSidebar,
  currentUser,
  onUpdateProfile,
  onSignOut,
  onOpenLogin,
  onClearAllData,
}) => {
  const MOBILE_TABS: { id: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'matcher', label: 'Matcher', icon: Sparkles },
    { id: 'groups', label: 'Groups', icon: Users },
  ];

  const activeIndex = Math.max(0, MOBILE_TABS.findIndex((t) => t.id === currentView));
  const activeIndexRef = useRef<number>(activeIndex);
  activeIndexRef.current = activeIndex;

  const sliderRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const pointerStartRef = useRef<{ x: number; y: number; time: number; pointerId: number } | null>(null);
  const didDragRef = useRef<boolean>(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      pointerId: e.pointerId,
    };
    didDragRef.current = false;
    setDragOffset(0);
    setIsDragging(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    const deltaX = e.clientX - pointerStartRef.current.x;
    const deltaY = e.clientY - pointerStartRef.current.y;

    // Detect horizontal swipe with either mouse or touch (> 10px)
    if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY) * 0.75) {
      if (!isDragging) {
        setIsDragging(true);
        didDragRef.current = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {}
      }
      const currentIdx = activeIndexRef.current;
      let effectiveOffset = deltaX;
      if ((currentIdx === 0 && deltaX > 0) || (currentIdx === MOBILE_TABS.length - 1 && deltaX < 0)) {
        effectiveOffset = deltaX * 0.25;
      }
      setDragOffset(effectiveOffset);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerStartRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    const deltaX = e.clientX - pointerStartRef.current.x;
    const duration = Date.now() - pointerStartRef.current.time;
    const currentIdx = activeIndexRef.current;

    if (didDragRef.current && Math.abs(deltaX) > 14) {
      // Swipe gesture
      const velocity = Math.abs(deltaX) / Math.max(duration, 1);
      const threshold = velocity > 0.18 ? 16 : 28;

      if (deltaX < -threshold && currentIdx < MOBILE_TABS.length - 1) {
        onSelectView(MOBILE_TABS[currentIdx + 1].id);
      } else if (deltaX > threshold && currentIdx > 0) {
        onSelectView(MOBILE_TABS[currentIdx - 1].id);
      } else if (sliderRef.current) {
        const rect = sliderRef.current.getBoundingClientRect();
        const touchRelativeX = e.clientX - rect.left;
        const segmentWidth = rect.width / MOBILE_TABS.length;
        const targetIdx = Math.min(
          MOBILE_TABS.length - 1,
          Math.max(0, Math.floor(touchRelativeX / segmentWidth))
        );
        onSelectView(MOBILE_TABS[targetIdx].id);
      }
    } else {
      // Tap or Click gesture
      if (sliderRef.current) {
        const rect = sliderRef.current.getBoundingClientRect();
        const touchRelativeX = e.clientX - rect.left;
        const segmentWidth = rect.width / MOBILE_TABS.length;
        const targetIdx = Math.min(
          MOBILE_TABS.length - 1,
          Math.max(0, Math.floor(touchRelativeX / segmentWidth))
        );
        onSelectView(MOBILE_TABS[targetIdx].id);
      }
    }

    setIsDragging(false);
    setDragOffset(0);
    pointerStartRef.current = null;
    setTimeout(() => {
      didDragRef.current = false;
    }, 40);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    setIsDragging(false);
    setDragOffset(0);
    pointerStartRef.current = null;
    setTimeout(() => {
      didDragRef.current = false;
    }, 40);
  };

  return (
    <header id="main-header" className="sticky top-0 z-30 bg-[#FDFCF8] border-b border-[#E8E4D9] text-[#3D3A35] shadow-xs pt-[env(safe-area-inset-top,0px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
        <div className="flex items-center justify-between h-16 sm:h-18 gap-3">
          
          {/* Mobile sidebar hamburger & Logo */}
          <div className="flex items-center gap-3 shrink-0">
            {onToggleMobileSidebar && (
              <button
                id="btn-mobile-menu"
                onClick={onToggleMobileSidebar}
                className="lg:hidden p-2 rounded-xl text-[#5C574F] hover:bg-[#F7F3EB] border border-[#E8E4D9]"
                aria-label="Toggle navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div 
              id="brand-logo"
              className="w-9 h-9 sm:w-10 sm:h-10 bg-[#8A9A5B] rounded-xl flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-xs cursor-pointer active:scale-95 transition-transform"
              onClick={() => onSelectView('calendar')}
            >
              N
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#4A463F] font-serif-soft">
                Nadd<span className="text-[#8A9A5B]">D</span>
              </span>
            </div>
          </div>

          {/* Center Navigation Tabs (Desktop) */}
          <nav id="header-nav-tabs" className="hidden md:flex items-center relative border-b border-[#E8E4D9]">
            {MOBILE_TABS.map((tab) => {
              const isActive = currentView === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => onSelectView(tab.id)}
                  className={`relative z-10 flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    isActive ? 'text-[#3D3A35] font-bold' : 'text-[#8E8A81] hover:text-[#5C574F]'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#8A9A5B]' : 'text-[#8E8A81]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
            {/* Sliding Underline Indicator for Desktop */}
            <motion.div
              className="absolute bottom-0 h-[2.5px] bg-[#8A9A5B] rounded-full pointer-events-none"
              style={{ width: 'calc(100% / 3)' }}
              animate={{ left: `calc(${activeIndex} * (100% / 3))` }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Search Input */}
            <div className="hidden xl:flex items-center relative">
              <Search className="w-4 h-4 absolute left-3 text-[#AFA99E] pointer-events-none" />
              <input
                id="global-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search..."
                className="w-40 pl-9 pr-3 py-1.5 bg-[#F7F3EB] border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35] placeholder-[#AFA99E] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]/40 focus:border-[#8A9A5B]"
              />
            </div>

            {/* Notifications Bell */}
            <button
              id="btn-open-notifications"
              onClick={onOpenNotifications}
              className="relative p-2.5 rounded-xl bg-white border border-[#E8E4D9] text-[#5C574F] hover:bg-[#F7F3EB] transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span 
                  id="unread-notifications-badge"
                  className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#D48C70] rounded-full border-2 border-white"
                  title={`${unreadCount} new notifications`}
                />
              )}
            </button>

            {/* Enter Invite Code Button */}
            {onOpenJoinCode && (
              <button
                id="btn-header-join-code"
                onClick={onOpenJoinCode}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#F7F3EB] hover:bg-[#EFE9DD] border border-[#E8E4D9] text-[#3D3A35] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                title="Have an invite code from a friend?"
              >
                <Ticket className="w-3.5 h-3.5 text-[#8A9A5B]" />
                <span className="hidden sm:inline">Enter Code</span>
                <span className="sm:hidden">Code</span>
              </button>
            )}

            {/* Quick Add Task */}
            <button
              id="btn-header-new-task"
              onClick={onOpenNewTask}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full bg-white hover:bg-[#F7F3EB] border border-[#E8E4D9] text-[#3D3A35] text-xs font-semibold shadow-2xs transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-[#5C574F]" />
              <span>Task</span>
            </button>

            {/* Primary Action Button: Schedule Gathering / Event */}
            <button
              id="btn-header-new-event"
              onClick={onOpenNewEvent}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#8A9A5B] hover:bg-[#78884d] text-white text-xs sm:text-sm font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Event</span>
            </button>

            {/* User Profile Menu or Sign In */}
            {currentUser ? (
              <UserProfileMenu
                currentUser={currentUser}
                onUpdateProfile={onUpdateProfile}
                onSignOut={onSignOut}
                onClearAllData={onClearAllData}
              />
            ) : (
              <button
                id="btn-header-signin"
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white hover:bg-[#F7F3EB] border border-[#E8E4D9] text-xs font-bold text-[#3D3A35] shadow-2xs transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#8A9A5B]" />
                <span>Sign In</span>
              </button>
            )}

          </div>
        </div>

        {/* Mobile Slideable Underline Navigation Bar */}
        <div className="md:hidden py-1 border-t border-[#E8E4D9]">
          <div
            ref={sliderRef}
            id="mobile-nav-bar"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className="relative w-full flex items-center select-none touch-pan-y overflow-hidden cursor-grab active:cursor-grabbing border-b border-[#E8E4D9]"
            title="Swipe or click to switch pages"
          >
            {/* 3 Interactive Tabs */}
            {MOBILE_TABS.map((tab) => {
              const isActive = currentView === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`mobile-nav-${tab.id}`}
                  type="button"
                  onClick={() => onSelectView(tab.id)}
                  className="relative z-10 flex-1 min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-2 text-xs font-semibold cursor-pointer select-none transition-colors"
                  aria-selected={isActive}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                      isActive ? 'text-[#8A9A5B]' : 'text-[#8E8A81]'
                    }`}
                  />
                  <span
                    className={`transition-colors duration-150 tracking-tight ${
                      isActive ? 'text-[#3D3A35] font-bold' : 'text-[#8E8A81] font-medium'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}

            {/* Smooth Sliding Underline Indicator below each page */}
            <motion.div
              id="mobile-nav-slider-line"
              className="absolute bottom-0 h-[3px] bg-[#8A9A5B] rounded-full shadow-2xs pointer-events-none"
              style={{
                width: 'calc(100% / 3)',
              }}
              animate={{
                left: `calc(${activeIndex} * (100% / 3) + ${isDragging ? dragOffset * 0.45 : 0}px)`,
              }}
              transition={
                isDragging
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 480, damping: 35 }
              }
            />
          </div>
        </div>

      </div>
    </header>
  );
};

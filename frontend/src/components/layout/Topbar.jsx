import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Sun, Moon, Search, LogOut, Mail, Building, HelpCircle } from 'lucide-react';
import api from '@/services/api';
import useAuthStore from '@/stores/authStore';
import useActivityStore from '@/stores/activityStore';
import useUIStore, { toast } from '@/stores/uiStore';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Tooltip } from '@/components/ui/Tooltip';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

const ROUTE_TITLES = {
  '/dashboard':      'Dashboard',
  '/leads':          'Leads',
  '/campaigns':      'Campaigns',
  '/conversations':  'Conversations',
  '/content-studio': 'Content Studio',
  '/booking':        'Booking Agent',
  '/analytics':      'Analytics',
  '/knowledge-base': 'Knowledge Base',
  '/settings':       'Settings',
};

function getTitle(pathname) {
  for (const [path, label] of Object.entries(ROUTE_TITLES)) {
    if (pathname === path || pathname.startsWith(path + '/')) return label;
  }
  return 'Dashboard';
}

/* ── shared icon button style ── */
const iconBtn = (extra = {}) => ({
  width: 30,
  height: 30,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  flexShrink: 0,
  transition: 'background 0.14s',
  ...extra,
});

export function Topbar() {
  const { toggleTheme, isDark } = useDarkMode();
  const { user, logout }        = useAuthStore();
  const { unreadCount }         = useActivityStore();
  const { sidebarCollapsed }    = useUIStore();
  const location                = useLocation();
  const title                   = getTitle(location.pathname);


  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profileOpen && user) {
      setEditName(user.name || '');
      setEditEmail(user.email || '');
      setErrorMsg('');
      setIsEditing(false);
    }
  }, [profileOpen, user]);

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    if (!editName.trim() || !editEmail.trim()) {
      setErrorMsg('Name and email are required');
      return;
    }
    setIsSaving(true);
    setErrorMsg('');
    try {
      const res = await useAuthStore.getState().updateProfileOnServer(editName.trim(), editEmail.trim());
      if (res.success) {
        setIsEditing(false);
        toast.success('Profile updated successfully!', { title: 'Profile Updated' });
      } else {
        setErrorMsg(res.error || 'Failed to update profile');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };



  // Mirror AppShell's content offset: 12 (sidebar left) + width + 12 (gap) + 16 (content right pad)
  const sidebarWidth  = sidebarCollapsed ? 56 : 220;
  const leftOffset    = 12 + sidebarWidth + 12;   // same as AppShell contentOffset
  const rightPad      = 16;
  const TRANSITION    = 'left 280ms cubic-bezier(0.22,1,0.36,1), right 280ms cubic-bezier(0.22,1,0.36,1)';

  return (
    /* Fixed outer shell — positioned precisely to match sidebar width */
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: leftOffset,
        right: rightPad,
        zIndex: 30,
        paddingBottom: 12,
        transition: TRANSITION,
      }}
    >
      {/* ── Floating Capsule Container ── */}
      <div
        data-tour="topbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 56,
          borderRadius: 12,
          background: 'var(--bg-glass-strong)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
          padding: '0 12px 0 20px',
          gap: 8,
          backdropFilter: 'var(--blur-md)',
          WebkitBackdropFilter: 'var(--blur-md)',
        }}
      >
        {/* LEFT — page title */}
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.025em',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {title}
        </span>

        {/* RIGHT — search + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>



          {/* Search container — opens Command Palette */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
            onKeyDown={e => e.key === 'Enter' && window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 12,
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                height: 36,
                width: 220,
                paddingLeft: 34,
                paddingRight: 50,
                borderRadius: 8,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'var(--text-muted)',
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                display: 'flex',
                alignItems: 'center',
                transition: 'border-color 180ms, box-shadow 180ms',
                userSelect: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-light)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Search or jump to...
            </div>
            <kbd
              style={{
                position: 'absolute',
                right: 8,
                padding: '2px 5px',
                borderRadius: 4,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-page)',
                fontSize: 10,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-body)',
                lineHeight: 1.5,
                letterSpacing: '0em',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              ⌘K
            </kbd>
          </div>

          {/* Theme toggle */}
          <Tooltip content={isDark ? 'Light mode' : 'Dark mode'}>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              style={iconBtn({ width: 32, height: 32 })}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-glass)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </Tooltip>

          {/* Website Tour Toggle */}
          <Tooltip content="Start Website Tour">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('start-guided-tour'))}
              aria-label="Start Website Tour"
              style={iconBtn({ width: 32, height: 32 })}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-glass)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <HelpCircle size={16} />
            </button>
          </Tooltip>

          {/* Notifications — with dropdown */}
          <div style={{ position: 'relative' }}>
            <Tooltip content="Notifications">
              <button
                aria-label="Notifications"
                onClick={() => setNotifOpen(o => !o)}
                style={iconBtn({ position: 'relative', width: 32, height: 32 })}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-glass)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 6, right: 7,
                      width: 7, height: 7,
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      border: '1.5px solid var(--bg-glass-strong)',
                    }}
                  />
                )}
              </button>
            </Tooltip>

            {/* Notification Dropdown */}
            {notifOpen && (
              <>
                <div onClick={() => setNotifOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                <div style={{
                  position: 'absolute', top: 38, right: 0,
                  width: 300, zIndex: 50,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 14,
                  boxShadow: 'var(--shadow-float)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px 8px',
                    borderBottom: '1px solid var(--border-glass)',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => { useActivityStore.getState().markAllRead(); setNotifOpen(false); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-body)' }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                    {useActivityStore.getState().activities.length === 0 ? (
                      <p style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'var(--text-muted)' }}>No notifications</p>
                    ) : (
                      useActivityStore.getState().activities.slice(0, 5).map(act => (
                        <div key={act.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '9px 14px',
                          borderBottom: '1px solid var(--border-glass)',
                          background: act.read ? 'transparent' : 'var(--accent-light)',
                          cursor: 'pointer',
                          transition: 'background 120ms',
                        }}
                          onClick={() => { useActivityStore.getState().markRead(act.id); setNotifOpen(false); }}
                          onMouseEnter={e => !act.read && (e.currentTarget.style.background = 'var(--bg-surface)')}
                          onMouseLeave={e => !act.read && (e.currentTarget.style.background = 'var(--accent-light)')}
                        >
                          {!act.read && (
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, marginTop: 5 }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 1 }}>{act.title}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{act.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User avatar */}
          <Tooltip content={user?.name || 'Account'}>
            <button
              onClick={() => setProfileOpen(true)}
              aria-label="Account"
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                border: 'none',
                background: 'var(--accent-light)',
                color: 'var(--accent-text)',
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                letterSpacing: '0.01em',
                flexShrink: 0,
                transition: 'transform 0.14s',
                marginLeft: 2,
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {user?.avatarInitials || 'RM'}
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── User Profile Detail Modal ── */}
      <Modal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Account Profile"
        size="sm"
        footer={
          isEditing ? (
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="btn btn-secondary flex-1 justify-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="btn btn-primary flex-1 justify-center"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="btn btn-secondary w-full justify-center"
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                }}
                className="btn btn-danger flex items-center gap-2 w-full justify-center"
              >
                <LogOut size={14} />
                Logout from Horizon
              </button>
            </div>
          )
        }
      >
        <div className="flex flex-col items-center text-center pb-2">
          {/* Avatar details */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-3"
            style={{
              background: 'var(--accent-light)',
              color: 'var(--accent-text)',
              border: '2px solid rgba(196, 101, 74, 0.25)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {user?.avatarInitials || 'RM'}
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="w-full text-left space-y-4">
              {errorMsg && (
                <div
                  className="p-3 rounded-lg text-xs font-semibold"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                  }}
                >
                  {errorMsg}
                </div>
              )}
              
              <Input
                label="Full Name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
            </form>
          ) : (
            <>
              <h3 className="text-md font-bold mb-0.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                {user?.name || 'Representative'}
              </h3>
              <p className="text-[10px] font-semibold tracking-wider uppercase mb-5" style={{ color: 'var(--text-muted)' }}>
                {user?.role ? user.role.toUpperCase() : 'PLATFORM REPRESENTATIVE'}
              </p>

              {/* Details list */}
              <div className="w-full space-y-2.5 text-left">
                <div
                  className="p-3 rounded-xl flex items-center gap-3"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <p className="text-[10px] uppercase font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>Email Address</p>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{user?.email || 'N/A'}</p>
                  </div>
                </div>

                <div
                  className="p-3 rounded-xl flex items-center gap-3"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <Building size={14} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <p className="text-[10px] uppercase font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>Business ID</p>
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)', maxWidth: 220 }}>
                      {user?.businessId || 'N/A'}
                    </p>
                  </div>
                </div>

                <div
                  className="p-3 rounded-xl flex items-center gap-3"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse bg-[#22c55e]"
                    style={{ boxShadow: '0 0 8px #22c55e' }}
                  />
                  <div style={{ marginLeft: 6 }}>
                    <p className="text-[10px] uppercase font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>Status</p>
                    <p className="text-xs font-semibold" style={{ color: '#22c55e' }}>Active Session</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

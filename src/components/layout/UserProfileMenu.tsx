import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../../types';
import { NATURAL_PALETTES } from '../../data/initialData';
import { 
  LogOut, 
  ChevronDown, 
  Check, 
  Trash2,
  Edit2
} from 'lucide-react';

interface UserProfileMenuProps {
  currentUser: UserProfile | null;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onSignOut: () => void;
  onClearAllData?: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  currentUser,
  onUpdateProfile,
  onSignOut,
  onClearAllData,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editTagline, setEditTagline] = useState(currentUser?.tagline || '');
  const [editColor, setEditColor] = useState(currentUser?.avatarColor || '#8A9A5B');

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditTagline(currentUser.tagline || '');
      setEditColor(currentUser.avatarColor);
    }
  }, [currentUser]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditing(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    onUpdateProfile({
      name: editName.trim(),
      tagline: editTagline.trim(),
      avatarColor: editColor,
    });
    setIsEditing(false);
  };

  const userInitial = (currentUser.name && currentUser.name.trim().charAt(0).toUpperCase()) || 'U';

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Trigger Button */}
      <button
        id="btn-user-profile-menu"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl bg-white hover:bg-[#F7F3EB] border border-[#E8E4D9] transition-all cursor-pointer shadow-2xs group"
        aria-label="User profile and account settings"
      >
        <div
          className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs"
          style={{ backgroundColor: currentUser.avatarColor }}
        >
          {userInitial}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-xs font-bold text-[#3D3A35] leading-tight truncate max-w-[110px]">
            {currentUser.name}
          </p>
          <p className="text-[10px] text-[#8E8A81] leading-tight capitalize">
            {currentUser.role === 'admin' ? 'Host' : 'Member'}
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[#8E8A81] group-hover:text-[#3D3A35] transition-transform" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="user-profile-dropdown"
          className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-[#E8E4D9] rounded-3xl shadow-xl z-50 p-4 space-y-4 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* User Info Header */}
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E8E4D9]">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl text-white text-base font-bold flex items-center justify-center shrink-0 shadow-xs"
                style={{ backgroundColor: currentUser.avatarColor }}
              >
                {userInitial}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold text-[#3D3A35] truncate">{currentUser.name}</h4>
                  {currentUser.authProvider === 'google' && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC]">
                      Google
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#8E8A81] truncate">{currentUser.email}</p>
                {currentUser.tagline && (
                  <p className="text-[10px] text-[#5C574F] italic truncate mt-0.5">{currentUser.tagline}</p>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-1.5 rounded-xl hover:bg-[#F7F3EB] text-[#5C574F] text-xs font-semibold cursor-pointer"
              title="Edit Profile"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Edit Profile View */}
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="space-y-3 p-3 bg-[#FDFCF8] rounded-2xl border border-[#E8E4D9]">
              <h5 className="text-xs font-bold text-[#3D3A35]">Edit Your Profile</h5>
              
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Full Name"
                className="w-full px-3 py-1.5 bg-white border border-[#E8E4D9] rounded-lg text-xs"
              />

              <input
                type="text"
                value={editTagline}
                onChange={(e) => setEditTagline(e.target.value)}
                placeholder="Bio / Tagline"
                className="w-full px-3 py-1.5 bg-white border border-[#E8E4D9] rounded-lg text-xs"
              />

              {/* Color choices */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E8A81] mb-1.5">
                  Avatar Theme Color
                </label>
                <div className="flex gap-2">
                  {NATURAL_PALETTES.slice(0, 6).map((pal) => (
                    <button
                      key={pal.name}
                      type="button"
                      onClick={() => setEditColor(pal.color)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        editColor === pal.color ? 'ring-2 ring-[#3D3A35] ring-offset-1 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: pal.color }}
                    >
                      {editColor === pal.color && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 text-xs text-[#8E8A81] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#8A9A5B] text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Reset Data Option */}
              {onClearAllData && (
                <div className="pt-2 border-t border-[#E8E4D9] space-y-1.5">
                  <button
                    id="btn-profile-clear-data"
                    type="button"
                    onClick={() => {
                      if (window.confirm('Reset all groups, calendar events, and tasks to an empty clean slate?')) {
                        onClearAllData();
                        setIsOpen(false);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-[#F7F3EB] hover:bg-[#EFE9DD] text-[#74471B] border border-[#E8E4D9] transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#C98A4B]" />
                    <span>Reset to Clean Slate</span>
                  </button>
                </div>
              )}

              {/* Sign Out Action */}
              <div className="pt-2 border-t border-[#E8E4D9]">
                <button
                  id="btn-profile-signout"
                  onClick={() => {
                    setIsOpen(false);
                    onSignOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-[#B33928] hover:bg-[#FDF0EE] transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { Ticket, X, Check, AlertCircle, Users, ShieldCheck, Loader2 } from 'lucide-react';
import { FriendGroup } from '../../types';
import { normalizeInviteCode } from '../../utils/inviteCode';

interface JoinCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  friendGroups: FriendGroup[];
  onJoinCode: (code: string, name: string, email?: string) => Promise<{ ok: boolean; error?: string }>;
  initialCode?: string;
  currentUserName?: string;
  currentUserEmail?: string;
}

export const JoinCodeModal: React.FC<JoinCodeModalProps> = ({
  isOpen,
  onClose,
  friendGroups,
  onJoinCode,
  initialCode = '',
  currentUserName = '',
  currentUserEmail = '',
}) => {
  const [codeInput, setCodeInput] = useState(initialCode);
  const [nameInput, setNameInput] = useState(currentUserName);
  const [emailInput, setEmailInput] = useState(currentUserEmail);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  // Sync inputs if initial values change
  React.useEffect(() => {
    if (initialCode) setCodeInput(initialCode);
    if (currentUserName && !nameInput) setNameInput(currentUserName);
    if (currentUserEmail && !emailInput) setEmailInput(currentUserEmail);
  }, [initialCode, currentUserName, currentUserEmail]);

  // Live preview, only for rooms already known on this device (rooms from other devices are checked on join)
  const matchResult = useMemo(() => {
    const cleanCode = normalizeInviteCode(codeInput);
    if (cleanCode.length < 8) return null;
    const group = friendGroups.find((g) => g.roomCode === cleanCode);
    return group ? { group } : null;
  }, [codeInput, friendGroups]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isJoining) return;
    setErrorMsg(null);

    const cleanCode = normalizeInviteCode(codeInput);
    if (!cleanCode) {
      setErrorMsg('Please enter a room code.');
      return;
    }
    if (!nameInput.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }

    setIsJoining(true);
    try {
      const result = await onJoinCode(cleanCode, nameInput.trim(), emailInput.trim() || undefined);
      if (result.ok) {
        setCodeInput('');
        onClose();
      } else {
        setErrorMsg(result.error || 'Could not join this room. Please verify the code.');
      }
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#FDFCF8] border border-[#E8E4D9] rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#F7F3EB] border-b border-[#E8E4D9] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8A9A5B]/15 border border-[#8A9A5B]/30 text-[#8A9A5B] flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif text-[#3D3A35]">
                Enter Room Code
              </h3>
              <p className="text-[11px] text-[#8E8A81]">
                Join your friend's room with its code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#8E8A81] hover:text-[#3D3A35] hover:bg-stone-200/50 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5C574F] mb-1.5">
              Room Code *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase());
                  setErrorMsg(null);
                }}
                placeholder="e.g. NADD-K7M2QX"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E8E4D9] rounded-xl text-sm font-mono uppercase tracking-wider text-[#3D3A35] placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-transparent transition-all"
                autoFocus
              />
              {matchResult && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A9A5B] flex items-center gap-1 text-xs font-semibold">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Live preview banner */}
            {matchResult && (
              <div className="mt-2 p-3 rounded-xl border text-xs bg-[#F3F6EC] border-[#C9D6A8] text-[#2D5A27]">
                <div className="flex items-center justify-between font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Room: {matchResult.group.name}</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-80">
                    {matchResult.group.members.length} members
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C574F] mb-1.5">
              Your Name *
            </label>
            <input
              type="text"
              required
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Jordan Lee"
              className="w-full px-3.5 py-2.5 bg-white border border-[#E8E4D9] rounded-xl text-sm text-[#3D3A35] placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C574F] mb-1.5">
              Email Address <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="For gathering notifications & calendar invites"
              className="w-full px-3.5 py-2.5 bg-white border border-[#E8E4D9] rounded-xl text-sm text-[#3D3A35] placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-[#8A9A5B] focus:border-transparent transition-all"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E8E4D9]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#8E8A81] hover:text-[#3D3A35] hover:bg-stone-100 rounded-xl cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isJoining}
              className="px-5 py-2 bg-[#8A9A5B] hover:bg-[#7D8D50] disabled:bg-stone-300 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
            >
              {isJoining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>{isJoining ? 'Joining...' : 'Join Room'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Plus, Trash2, Shield, User as UserIcon, Loader2, Check, AlertCircle, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountUser {
  id: string;
  username: string;
  role: string;
  created_at: number;
}

interface AccountManagementProps {
  currentUser: { username: string; role: string };
  onClose: () => void;
  onLogout: () => void;
}

export function AccountManagement({ currentUser, onClose, onLogout }: AccountManagementProps) {
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'super_admin'>('user');
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [toast, setToast] = useState('');

  const isSuperAdmin = currentUser.role === 'super_admin';

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch {
      /* ignore */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) loadUsers();
  }, [isSuperAdmin, loadUsers]);

  const handleAddUser = async () => {
    setAddError('');
    if (!newUsername.trim() || !newPassword.trim()) {
      setAddError('Username and password are required');
      return;
    }
    setIsAdding(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User "${newUsername}" added`);
        setShowAddForm(false);
        setNewUsername('');
        setNewPassword('');
        setNewRole('user');
        loadUsers();
      } else {
        setAddError(data.error || 'Failed to add user');
      }
    } catch {
      setAddError('Network error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (username === currentUser.username) {
      showToast("Can't delete yourself");
      return;
    }
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`User "${username}" deleted`);
        loadUsers();
      } else {
        showToast(data.error || 'Delete failed');
      }
    } catch {
      showToast('Network error');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    onLogout();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-surface-container-low rounded-2xl border border-outline-variant/20 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-outline-variant/10">
            <div className="flex items-center gap-2">
              {isSuperAdmin ? (
                <Shield size={18} className="text-primary" />
              ) : (
                <UserIcon size={18} className="text-on-surface-variant" />
              )}
              <h2 className="font-headline font-bold text-base text-on-surface">
                {isSuperAdmin ? 'Account Management' : 'My Account'}
              </h2>
              {isSuperAdmin && (
                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[8px] font-bold uppercase tracking-wider">
                  Super Admin
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="p-4 border-b border-outline-variant/10 bg-surface-container/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-sm uppercase">
                  {currentUser.username.slice(0, 2)}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-on-surface">{currentUser.username}</p>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                  {currentUser.role.replace('_', ' ')}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                <LogOut size={12} />
                Logout
              </button>
            </div>
          </div>

          {isSuperAdmin ? (
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Users ({users.length})
                </span>
                <button
                  onClick={() => setShowAddForm((v) => !v)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                  <Plus size={12} />
                  Add User
                </button>
              </div>

              <AnimatePresence>
                {showAddForm && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 p-3 bg-surface-container-high rounded-xl border border-outline-variant/10">
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="New username"
                        className="w-full bg-surface-container-highest/30 border border-outline-variant/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary/50"
                      />
                      <input
                        type="text"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full bg-surface-container-highest/30 border border-outline-variant/20 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary/50"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setNewRole('user')}
                          className={cn(
                            'py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border',
                            newRole === 'user'
                              ? 'bg-primary text-on-primary border-primary'
                              : 'bg-surface-container-highest/30 text-on-surface-variant border-transparent'
                          )}
                        >
                          User
                        </button>
                        <button
                          onClick={() => setNewRole('super_admin')}
                          className={cn(
                            'py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border',
                            newRole === 'super_admin'
                              ? 'bg-primary text-on-primary border-primary'
                              : 'bg-surface-container-highest/30 text-on-surface-variant border-transparent'
                          )}
                        >
                          Super Admin
                        </button>
                      </div>
                      {addError && (
                        <p className="text-[10px] text-red-400 flex items-center gap-1">
                          <AlertCircle size={10} /> {addError}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddUser}
                          disabled={isAdding}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-on-primary rounded-lg text-[10px] font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
                        >
                          {isAdding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                          Create
                        </button>
                        <button
                          onClick={() => setShowAddForm(false)}
                          className="px-3 py-2 bg-surface-container-highest/30 text-on-surface-variant rounded-lg text-[10px] font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-on-surface-variant text-xs">
                    <Loader2 size={14} className="animate-spin" /> Loading…
                  </div>
                ) : (
                  users.map((u) => (
                    <div
                      key={u.id}
                      className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-container-high transition-colors"
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                        u.role === 'super_admin' ? 'bg-primary/20' : 'bg-surface-container-highest'
                      )}>
                        {u.role === 'super_admin' ? (
                          <Shield size={13} className="text-primary" />
                        ) : (
                          <span className="text-on-surface-variant font-bold text-[10px] uppercase">
                            {u.username.slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-on-surface truncate">{u.username}</p>
                        <p className="text-[9px] text-on-surface-variant uppercase tracking-wider">
                          {u.role.replace('_', ' ')}
                        </p>
                      </div>
                      {u.username === currentUser.username ? (
                        <span className="text-[9px] text-primary font-bold uppercase">You</span>
                      ) : (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          className="p-1.5 text-on-surface-variant/40 hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="p-4">
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                You are signed in as a regular user. Only Super Admins can manage accounts.
                Contact your administrator if you need access changes.
              </p>
            </div>
          )}

          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface-container-highest border border-primary/30 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2"
              >
                <Check size={14} className="text-green-400" />
                <span className="text-xs text-on-surface">{toast}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

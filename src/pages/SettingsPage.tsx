import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, LogOut, Key, User } from 'lucide-react';
import TopBar from '../components/layout/TopBar';
import PersonAvatar from '../components/shared/PersonAvatar';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, profile, signOut, setProfile } = useAuthStore();
  const { darkMode, toggleDarkMode } = useUIStore();
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(profile?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);

  async function handleSaveName() {
    if (!user || !name.trim()) return;
    setSavingName(true);
    try {
      await updateProfile(user, { displayName: name });
      await updateDoc(doc(db, 'users', user.uid), { displayName: name, updatedAt: serverTimestamp() });
      if (profile) setProfile({ ...profile, displayName: name });
      setEditingName(false);
      toast.success('Name updated');
    } catch {
      toast.error('Failed to update name');
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword() {
    if (!user?.email) return;
    await sendPasswordResetEmail(auth, user.email);
    toast.success('Password reset email sent');
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div>
      <TopBar title="Settings" />

      <div className="px-4 py-4 space-y-4">
        {/* Profile section */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Profile</h3>
          <div className="flex items-center gap-4 mb-4">
            <PersonAvatar name={profile?.displayName ?? 'U'} size="lg" />
            <div>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                  <button onClick={handleSaveName} disabled={savingName} className="text-xs text-primary hover:underline disabled:opacity-50">
                    {savingName ? <Loader2 size={12} className="animate-spin" /> : 'Save'}
                  </button>
                  <button onClick={() => setEditingName(false)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{profile?.displayName}</p>
                  <button onClick={() => setEditingName(true)} className="text-xs text-primary hover:underline">Edit</button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
        </div>

        {/* App preferences */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">App</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon size={18} className="text-muted-foreground" /> : <Sun size={18} className="text-muted-foreground" />}
              <span className="text-sm text-foreground">{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative h-6 w-11 rounded-full transition-colors ${darkMode ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Account */}
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          <h3 className="px-4 py-3 text-sm font-semibold text-foreground">Account</h3>
          <button
            onClick={handleChangePassword}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
          >
            <Key size={16} className="text-muted-foreground" />
            Change Password
          </button>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>

        {/* About */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">About</h3>
          <p className="text-xs text-muted-foreground">MoneyFlow v1.0.0</p>
          <p className="text-xs text-muted-foreground">Track your borrowing and lending with simple interest management.</p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useAuthStore } from '@/lib/stores/auth.store';
import { authService } from '@/lib/api/services/auth.service';
import { usersService } from '@/lib/api/services/users.service';
import { useState, useEffect } from 'react';
import { User, Lock, Bell, Shield, Globe } from 'lucide-react';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('personal');
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Avatar upload states
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Form states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await usersService.getProfile();
        setProfileData(data);
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Use FormData to support file uploads
      const formData = new FormData();
      formData.append('first_name', profileData?.first_name || '');
      formData.append('last_name', profileData?.last_name || '');
      formData.append('phone', profileData?.phone || '');

      // Add avatar if selected
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      // Add agent-specific fields if applicable
      if (profileData?.role === 'AGENT') {
        if (profileData?.pincode) formData.append('pincode', profileData.pincode);
      }

      // Add privacy settings
      if (profileData?.profile_visibility) {
        formData.append('profile_visibility', profileData.profile_visibility);
      }

      const updated = await usersService.updateProfile(formData);
      setProfileData(updated);
      setUser(updated); // Update global store
      setAvatarFile(null);
      setAvatarPreview(null);
      setSaveStatus({ type: 'success', message: 'Profile updated successfully' });
    } catch (error) {
      setSaveStatus({ type: 'error', message: 'Failed to update profile' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    try {
      await authService.changePassword(oldPassword, newPassword);
      setSaveStatus({ type: 'success', message: 'Password changed successfully' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setSaveStatus({ type: 'error', message: 'Failed to change password' });
    } finally {
      setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1da9c3]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold dark:text-white">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { id: 'personal', label: 'Personal Info', icon: User },
            { id: 'security', label: 'Security', icon: Lock },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'privacy', label: 'Privacy', icon: Shield },
            { id: 'preferences', label: 'Localisation', icon: Globe },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${activeTab === tab.id
                ? 'bg-[#1da9c3] text-white shadow-lg shadow-[#1da9c3]/20'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
            >
              <tab.icon size={20} />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            {saveStatus.message && (
              <div className={`p-4 text-center text-sm font-medium ${saveStatus.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                {saveStatus.message}
              </div>
            )}

            <div className="p-8">
              {activeTab === 'personal' && (
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  {/* Avatar Upload Section */}
                  <div className="flex items-center gap-6 pb-6 border-b dark:border-slate-800">
                    <div className="relative">
                      {avatarPreview || profileData?.avatar ? (
                        <img
                          src={avatarPreview || profileData?.avatar}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover border-4 border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-3xl font-bold text-[#1da9c3]">
                          {profileData?.first_name?.[0]}{profileData?.last_name?.[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold dark:text-white mb-1">Profile Photo</h3>
                      <p className="text-xs text-slate-500 mb-3">Upload a new avatar for your profile</p>
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium dark:text-white transition-all">
                        <User size={16} />
                        Choose Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                      {avatarFile && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          ✓ New photo selected: {avatarFile.name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium dark:text-slate-300">First Name</label>
                      <input
                        type="text"
                        value={profileData?.first_name || ''}
                        onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium dark:text-slate-300">Last Name</label>
                      <input
                        type="text"
                        value={profileData?.last_name || ''}
                        onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium dark:text-slate-300">Email Address</label>
                    <input
                      type="email"
                      value={profileData?.email || ''}
                      disabled
                      className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-900 border dark:border-slate-800 rounded-lg text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400">Email cannot be changed contact admin for updates.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium dark:text-slate-300">Phone Number</label>
                    <input
                      type="tel"
                      value={profileData?.phone || ''}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg dark:text-white"
                    />
                  </div>

                  {profileData?.role === 'AGENT' && (
                    <div className="pt-4 border-t dark:border-slate-800 space-y-4">
                      <h3 className="text-sm font-bold uppercase text-slate-400">Professional Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium dark:text-slate-300">Service Type</label>
                          <input
                            type="text"
                            value={profileData?.service_type || ''}
                            disabled
                            className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-900 border dark:border-slate-800 rounded-lg text-slate-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium dark:text-slate-300">Pincode</label>
                          <input
                            type="text"
                            value={profileData?.pincode || ''}
                            onChange={(e) => setProfileData({ ...profileData, pincode: e.target.value })}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-8 py-2.5 bg-[#1da9c3] text-white rounded-xl font-semibold hover:bg-[#178a9f] transition-all disabled:opacity-50"
                    >
                      {isSaving ? 'Saving Changes...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'security' && (
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <h2 className="text-xl font-semibold dark:text-white">Security Settings</h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium dark:text-slate-300">Current Password</label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg dark:text-white"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium dark:text-slate-300">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg dark:text-white"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium dark:text-slate-300">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg dark:text-white"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="mt-4 px-8 py-2.5 bg-[#1da9c3] text-white rounded-xl font-semibold hover:bg-[#178a9f] transition-all"
                  >
                    Change Password
                  </button>
                </form>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold dark:text-white">Email Preferences</h2>
                  <div className="divide-y dark:divide-slate-800">
                    {[
                      { id: 'complaint_created', label: 'New Complaint Notifications', desc: 'When you create a ticket' },
                      { id: 'status_changed', label: 'Status Updates', desc: 'When your ticket status changes' },
                      { id: 'comment_added', label: 'New Comments', desc: 'When someone replies to your case' },
                    ].map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-4">
                        <div>
                          <p className="font-medium dark:text-slate-200">{item.label}</p>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-[#1da9c3] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold dark:text-white">Privacy Controls</h2>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border dark:border-slate-700">
                      <label className="block text-sm font-bold uppercase text-slate-400 mb-2">Profile Visibility</label>
                      <select
                        value={profileData?.profile_visibility || 'EVERYONE'}
                        onChange={(e) => setProfileData({ ...profileData, profile_visibility: e.target.value })}
                        className="w-full bg-transparent dark:text-white outline-none"
                      >
                        <option value="EVERYONE">Public (Visible to all team members)</option>
                        <option value="TEAM_MEMBERS">Internal (Visible to admins and assigned agents)</option>
                        <option value="PRIVATE">Private (Only you and admins)</option>
                      </select>
                    </div>
                  </div>
                  <button onClick={handleUpdateProfile} className="mt-4 px-8 py-2.5 bg-[#1da9c3] text-white rounded-xl font-semibold">
                    Save Privacy Settings
                  </button>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-semibold dark:text-white">Time & Region</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium dark:text-slate-300">Time Zone</label>
                      <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg dark:text-white">
                        <option>Asia/Kolkata (IST)</option>
                        <option>UTC +0:00</option>
                        <option>America/New_York (EST)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium dark:text-slate-300">Language</label>
                      <select className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-lg dark:text-white">
                        <option>English (UK)</option>
                        <option>English (US)</option>
                        <option>Spanish</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


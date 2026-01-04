'use client';

import { useAuthStore } from '@/lib/stores/auth.store';
import { usersService } from '@/lib/api/services/users.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { User, Mail, Phone, Briefcase, Calendar, Edit2, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateMutation = useMutation({
    mutationFn: (data: any) => usersService.updateProfile(data),
    onSuccess: (data) => {
      updateUser(data);
      setEditing(false);
      alert('Profile updated successfully');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = new FormData();
    data.append('first_name', formData.first_name);
    data.append('last_name', formData.last_name);
    data.append('phone', formData.phone);
    if (photoFile) {
      data.append('avatar', photoFile);
    }
    updateMutation.mutate(data);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1da9c3] to-[#178a9f] p-8 rounded-t-lg">
          <div className="flex items-center gap-6">
            <div className="relative">
              {photoPreview || user?.avatar ? (
                <img 
                  src={photoPreview || user?.avatar} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-white"
                />
              ) : (
                <div className="w-24 h-24 bg-white dark:bg-gray-200 rounded-full flex items-center justify-center text-3xl font-bold text-[#1da9c3]">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
              )}
              {editing && (
                <label className="absolute bottom-0 right-0 bg-white dark:bg-gray-700 rounded-full p-2 cursor-pointer shadow-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                  <Edit2 size={16} className="text-[#1da9c3]" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <div className="text-white">
              <h1 className="text-3xl font-bold">{user?.first_name} {user?.last_name}</h1>
              <p className="text-blue-100 dark:text-blue-200 mt-1">{user?.role}</p>
              {user?.date_joined && (
                <p className="text-sm text-blue-200 dark:text-blue-300 mt-2">
                  Member since {new Date(user.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold dark:text-white">Profile Information</h2>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Edit2 size={16} />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 border dark:border-gray-600 rounded-lg dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <User size={16} />
                  First Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <p className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg dark:text-white">{user?.first_name}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <User size={16} />
                  Last Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <p className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg dark:text-white">{user?.last_name}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Mail size={16} />
                  Email
                </label>
                <p className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">{user?.email}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Phone size={16} />
                  Phone
                </label>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <p className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg dark:text-white">{user?.phone || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Briefcase size={16} />
                  Role
                </label>
                <p className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg dark:text-white">{user?.role}</p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar size={16} />
                  Last Login
                </label>
                <p className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg dark:text-white">
                  {user?.last_login ? new Date(user.last_login).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

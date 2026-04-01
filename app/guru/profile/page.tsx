'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useTheme } from '@/lib/context/ThemeContext'
import { useLanguage } from '@/lib/context/LanguageContext'
import ThemeToggle from '@/components/ThemeToggle'

const translations = {
  id: {
    title: 'Profil Saya',
    subtitle: 'Kelola informasi pribadi Anda',
    navDashboard: 'Dashboard',
    labelFullName: 'Nama Lengkap',
    placeholderFullName: 'Nama lengkap Anda',
    labelNick: 'Nama Panggilan',
    placeholderNick: 'Nama panggilan',
    labelRole: 'Role',
    roleTeacher: 'Guru / Pengajar',
    labelLanguage: 'Bahasa Aplikasi',
    languageNote: 'Pilihan bahasa akan disimpan untuk sesi berikutnya.',
    btnCancel: 'Batal',
    btnSave: '💾 Simpan Perubahan',
    btnSaving: '💾 Menyimpan...',
    cameraHint: 'Klik icon kamera untuk mengubah foto',
    loadingProfile: 'Memuat profil...',
    alertNameRequired: 'Nama harus diisi!',
    alertProfileUpdated: 'Profil berhasil diperbarui!',
    alertProfileFailed: 'Gagal memperbarui profil',
    alertFileType: 'File harus berupa gambar!',
    alertFileSize: 'Ukuran file maksimal 2MB!',
    alertAvatarSuccess: 'Foto profil berhasil diperbarui!',
    alertAvatarFailed: 'Gagal mengupload foto profil',
    deleteModalTitle: 'Hapus Akun?',
    deleteModalDesc: 'Tindakan ini tidak dapat dibatalkan. Semua data Anda akan dihapus permanen, termasuk:',
    deleteModalList1: 'Profil dan foto profil',
    deleteModalList2: 'Data akun guru',
    deleteModalPrompt: 'Ketik kata kunci untuk konfirmasi:',
    deleteConfirmKeyword: 'HAPUS AKUN',
    deleteModalPlaceholder: 'Ketik HAPUS AKUN',
    deleteModalCancel: 'Batal',
    deleteModalDelete: '🗑️ Hapus Akun',
    deleteModalDeleting: '🗑️ Menghapus...',
    deleteConfirmReminder: 'Ketik "HAPUS AKUN" untuk mengkonfirmasi penghapusan.',
    warningTitle: 'Peringatan',
    warningDesc: 'Menghapus akun akan menghapus semua data Anda secara permanen termasuk profil dan data akun. Tindakan ini tidak dapat dibatalkan.',
    btnDeleteAccount: 'Hapus Akun Saya',
    logoutTitle: 'Logout?',
    logoutDesc: 'Apakah Anda yakin ingin keluar?',
    logoutCancel: '❌ Tidak',
    logoutConfirm: '✅ Ya, Logout',
    fileDeleteError: 'Gagal menghapus akun',
  },
  en: {
    title: 'My Profile',
    subtitle: 'Manage your personal information',
    navDashboard: 'Dashboard',
    labelFullName: 'Full Name',
    placeholderFullName: 'Your full name',
    labelNick: 'Nickname',
    placeholderNick: 'Preferred name',
    labelRole: 'Role',
    roleTeacher: 'Teacher / Instructor',
    labelLanguage: 'Application Language',
    languageNote: 'Language selection will be saved for your next sessions.',
    btnCancel: 'Cancel',
    btnSave: '💾 Save Changes',
    btnSaving: '💾 Saving...',
    cameraHint: 'Click the camera icon to change photo',
    loadingProfile: 'Loading profile...',
    alertNameRequired: 'Name is required!',
    alertProfileUpdated: 'Profile updated successfully!',
    alertProfileFailed: 'Failed to update profile',
    alertFileType: 'File must be an image!',
    alertFileSize: 'Maximum file size is 2MB!',
    alertAvatarSuccess: 'Profile photo updated successfully!',
    alertAvatarFailed: 'Failed to upload profile photo',
    deleteModalTitle: 'Delete Account?',
    deleteModalDesc: 'This action cannot be undone. All your data will be permanently deleted, including:',
    deleteModalList1: 'Profile and avatar',
    deleteModalList2: 'Teacher account data',
    deleteModalPrompt: 'Type the keyword to confirm:',
    deleteConfirmKeyword: 'DELETE ACCOUNT',
    deleteModalPlaceholder: 'Type DELETE ACCOUNT',
    deleteModalCancel: 'Cancel',
    deleteModalDelete: '🗑️ Delete Account',
    deleteModalDeleting: '🗑️ Deleting...',
    deleteConfirmReminder: 'Type "DELETE ACCOUNT" to confirm deletion.',
    warningTitle: 'Warning',
    warningDesc: 'Deleting your account will permanently remove all data including profile and account data. This action cannot be undone.',
    btnDeleteAccount: 'Delete My Account',
    logoutTitle: 'Logout?',
    logoutDesc: 'Are you sure you want to logout?',
    logoutCancel: '❌ No',
    logoutConfirm: '✅ Yes, Logout',
    fileDeleteError: 'Failed to delete account',
  }
}

export default function GuruProfilePage() {
  const { theme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const t = (key: keyof typeof translations['id']) => translations[language][key]
  const [userName, setUserName] = useState('Guru')
  const [userId, setUserId] = useState('')
  const [profile, setProfile] = useState({
    name: '',
    full_name: '',
    email: '',
    role: 'guru',
    avatar_url: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setUserId(session.user.id)
        setUserName(session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Guru')

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (profileData) {
          setProfile({
            name: profileData.name || '',
            full_name: profileData.full_name || '',
            email: profileData.email || session.user.email || '',
            role: profileData.role || 'guru',
            avatar_url: profileData.avatar_url || ''
          })
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profile.name.trim()) {
      showAlert(t('alertNameRequired'), 'error')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profile.name,
          full_name: profile.full_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      setUserName(profile.full_name || profile.name)
      showAlert(t('alertProfileUpdated'), 'success')
    } catch (error: any) {
      console.error('Error saving profile:', error)
      showAlert(t('alertProfileFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showAlert(t('alertFileType'), 'error')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showAlert(t('alertFileSize'), 'error')
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', userId)

      if (updateError) throw updateError

      setProfile({ ...profile, avatar_url: urlData.publicUrl })
      showAlert(t('alertAvatarSuccess'), 'success')
    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      showAlert(t('alertAvatarFailed'), 'error')
    } finally {
      setUploading(false)
    }
  }

  const showAlert = (message: string, type: 'success' | 'error') => {
    setAlert({ message, type })
    setTimeout(() => setAlert(null), 3000)
  }

  const handleLanguageChange = (value: 'id' | 'en') => {
    setLanguage(value)
    showAlert(value === 'id' ? 'Bahasa berhasil diubah ke Indonesia' : 'Language changed to English', 'success')
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  const handleDeleteAccount = async () => {
    const isValidKeyword = [translations.id.deleteConfirmKeyword, translations.en.deleteConfirmKeyword].includes(deleteConfirmText.trim())
    if (!isValidKeyword) {
      showAlert(t('deleteConfirmReminder'), 'error')
      return
    }

    setDeleting(true)
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmText: deleteConfirmText }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || t('fileDeleteError'))
      }

      // Sign out and redirect
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.replace('/login')
    } catch (error: any) {
      console.error('Error deleting account:', error)
      showAlert(error.message || t('fileDeleteError'), 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
        <div className={`text-xl ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t('loadingProfile')}</div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }}></div>
          <div className={`relative rounded-2xl p-8 border shadow-2xl max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-red-100'}`}>
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t('deleteModalTitle')}</h3>
              <p className={`mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{t('deleteModalDesc')}</p>
              <ul className={`text-sm mb-4 text-left list-disc list-inside ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                <li>{t('deleteModalList1')}</li>
                <li>{t('deleteModalList2')}</li>
              </ul>
              <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                {t('deleteModalPrompt')} <strong className="text-red-500">{t('deleteConfirmKeyword')}</strong>
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={t('deleteModalPlaceholder')}
                className={`w-full px-4 py-3 border rounded-xl mb-6 text-center font-mono focus:ring-2 focus:ring-red-500 focus:border-transparent ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-red-200 text-slate-800 placeholder-slate-400'}`}
              />
              <div className="flex gap-4 justify-center">
                <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText('') }} className={`px-6 py-3 rounded-xl font-semibold transition-all ${theme === 'dark' ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-slate-800'}`}>
                  {t('deleteModalCancel')}
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || ![translations.id.deleteConfirmKeyword, translations.en.deleteConfirmKeyword].includes(deleteConfirmText.trim())}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${deleting || ![translations.id.deleteConfirmKeyword, translations.en.deleteConfirmKeyword].includes(deleteConfirmText.trim()) ? 'bg-red-300 text-white cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30'}`}
                >
                  {deleting ? t('deleteModalDeleting') : t('deleteModalDelete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)}></div>
          <div className={`relative rounded-2xl p-8 border shadow-2xl max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
            <div className="text-center">
              <div className="text-6xl mb-4">🚪</div>
              <h3 className={`text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t('logoutTitle')}</h3>
              <p className={`mb-6 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{t('logoutDesc')}</p>
              <div className="flex gap-4 justify-center">
                <button onClick={() => setShowLogoutModal(false)} className="px-6 py-3 bg-slate-500 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all">
                  {t('logoutCancel')}
                </button>
                <button onClick={handleLogout} className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all shadow-lg">
                  {t('logoutConfirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert */}
      {alert && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-xl shadow-lg ${
          alert.type === 'success' 
            ? 'bg-purple-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {alert.message}
        </div>
      )}

      {/* Animated Background - Dark Mode Only */}
      {theme === 'dark' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
      )}

      {/* Navbar */}
      <nav className={`relative border-b shadow-sm ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-purple-600 p-3 rounded-xl shadow-lg">
                <span className="text-2xl">👤</span>
              </div>
              <div>
                <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{t('title')}</h1>
                <p className={`text-sm ${theme === 'dark' ? 'text-purple-300' : 'text-purple-600'}`}>{t('subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Link href="/guru/dashboard" className={`px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-purple-50 hover:bg-purple-100 text-purple-700'}`}>
                📊 {t('navDashboard')}
              </Link>
              <button onClick={() => setShowLogoutModal(true)} className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all" title="Logout">
                🚪
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative max-w-4xl mx-auto px-6 py-8">
        <div className={`rounded-2xl p-8 border shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-purple-100'}`}>
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-full shadow-lg transition-all disabled:opacity-50"
              >
                {uploading ? '⏳' : '📷'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t('cameraHint')}</p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{t('labelFullName')} <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-purple-200 text-slate-800 placeholder-slate-400'}`}
                  placeholder={t('placeholderFullName')}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{t('labelNick')} <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' : 'bg-white border-purple-200 text-slate-800 placeholder-slate-400'}`}
                  placeholder={t('placeholderNick')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Email</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className={`w-full px-4 py-3 border rounded-xl cursor-not-allowed ${theme === 'dark' ? 'bg-slate-700/50 border-slate-600 text-slate-400' : 'bg-gray-100 border-purple-200 text-slate-500'}`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{t('labelRole')}</label>
                <input
                  type="text"
                  value={t('roleTeacher')}
                  disabled
                  className={`w-full px-4 py-3 border rounded-xl cursor-not-allowed ${theme === 'dark' ? 'bg-slate-700/50 border-slate-600 text-slate-400' : 'bg-gray-100 border-purple-200 text-slate-500'}`}
                />
              </div>
            </div>

            {/* Language Settings */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                {t('labelLanguage')}
              </label>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as 'id' | 'en')}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-purple-200 text-slate-800'}`}
              >
                <option value="id">Indonesia</option>
                <option value="en">English</option>
              </select>
              <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {t('languageNote')}
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <Link
                href="/guru/dashboard"
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-slate-700'}`}
              >
                {t('btnCancel')}
              </Link>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  saving
                    ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg'
                }`}
              >
                {saving ? t('btnSaving') : t('btnSave')}
              </button>
            </div>
          </div>
        </div>

        {/* Delete Account Section */}
        <div className={`mt-6 rounded-2xl p-8 border shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-red-900/50' : 'bg-white border-red-200'}`}>
          <h3 className={`text-lg font-bold mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>⚠️ {t('warningTitle')}</h3>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('warningDesc')}
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-red-500/30"
          >
            🗑️ {t('btnDeleteAccount')}
          </button>
        </div>
      </main>
    </div>
  )
}

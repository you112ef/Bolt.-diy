import { useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { classNames } from '~/utils/classNames';
import { profileStore, updateProfile } from '~/lib/stores/profile';
import { toast } from 'react-toastify';
import { debounce } from '~/utils/debounce';

export default function ProfileTab() {
  const profile = useStore(profileStore);
  const [isUploading, setIsUploading] = useState(false);

  // Create debounced update functions
  const debouncedUpdate = useCallback(
    debounce((field: 'username' | 'bio', value: string) => {
      updateProfile({ [field]: value });
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated`);
    }, 1000),
    [],
  );

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setIsUploading(true);

      // Convert the file to base64
      const reader = new FileReader();

      reader.onloadend = () => {
        const base64String = reader.result as string;
        updateProfile({ avatar: base64String });
        setIsUploading(false);
        toast.success('Profile picture updated');
      };

      reader.onerror = () => {
        console.error('Error reading file:', reader.error);
        setIsUploading(false);
        toast.error('Failed to update profile picture');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setIsUploading(false);
      toast.error('Failed to update profile picture');
    }
  };

  const handleProfileUpdate = (field: 'username' | 'bio', value: string) => {
    // Update the store immediately for UI responsiveness
    updateProfile({ [field]: value });

    // Debounce the toast notification
    debouncedUpdate(field, value);
  };

  return (
    <div className="max-w-2xl mx-auto"> {/* This max-width is fine as tab content is constrained by ControlPanel */}
      <div className="space-y-3 sm:space-y-6"> {/* Base space-y-3 */}
        {/* Personal Information Section */}
        <div>
          {/* Avatar Upload - Base gap-2, mb-3 */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-4 md:gap-6 mb-3 sm:mb-6 md:mb-8">
            <div
              className={classNames(
                'w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden', // Base w-16 h-16 (64px)
                'bg-gray-100 dark:bg-gray-800/50',
                'flex items-center justify-center',
                'ring-1 ring-gray-200 dark:ring-gray-700',
                'relative group',
                'transition-all duration-300 ease-out',
                'hover:ring-purple-500/30 dark:hover:ring-purple-500/30',
                'hover:shadow-lg hover:shadow-purple-500/10',
              )}
            >
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt="Profile"
                  className={classNames(
                    'w-full h-full object-cover',
                    'transition-all duration-300 ease-out',
                    'group-hover:scale-105 group-hover:brightness-90',
                  )}
                />
              ) : (
                // Base fallback icon size w-9 h-9 (36px)
                <div className="i-ph:robot-fill w-9 h-9 sm:w-16 sm:h-16 text-gray-400 dark:text-gray-500 transition-colors group-hover:text-purple-500/70 transform sm:-translate-y-1" />
              )}

              <label
                className={classNames(
                  'absolute inset-0',
                  'flex items-center justify-center',
                  'bg-black/0 group-hover:bg-black/40',
                  'cursor-pointer transition-all duration-300 ease-out',
                  isUploading ? 'cursor-wait' : '',
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploading}
                />
                {isUploading ? (
                   // Responsive spinner icon
                   <div className="i-ph:spinner-gap w-5 h-5 sm:w-6 sm:h-6 text-white animate-spin" />
                ) : (
                   // Responsive camera icon
                   <div className="i-ph:camera-plus w-5 h-5 sm:w-6 sm:h-6 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out transform group-hover:scale-110" />
                )}
              </label>
            </div>

            {/* Responsive text alignment and padding for text section */}
            <div className="flex-1 pt-1 text-center sm:text-left">
              {/* Responsive label text and margin */}
              <label className="block text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 mb-0.5 sm:mb-1">
                Profile Picture
              </label>
              {/* Responsive description text */}
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Upload a profile picture or avatar</p>
            </div>
          </div>

          {/* Username Input - Base mb-3. Input: pl-7 pr-2 py-1.5 rounded-md text-xs */}
          <div className="mb-3 sm:mb-6">
            <label className="block text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">Username</label>
            <div className="relative group">
              <div className="absolute left-2.5 sm:left-3.5 top-1/2 -translate-y-1/2"> {/* Adjusted left for base */}
                <div className="i-ph:user-circle-fill w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-purple-500" />
              </div>
              <input
                type="text"
                value={profile.username}
                onChange={(e) => handleProfileUpdate('username', e.target.value)}
                className={classNames(
                  'w-full pl-7 pr-2 py-1.5 rounded-md sm:pl-10 sm:pr-4 sm:py-2.5 sm:rounded-xl', // Base: pl-7, pr-2, py-1.5, rounded-md
                  'bg-white dark:bg-gray-800/50',
                  'border border-gray-200 dark:border-gray-700/50',
                  'text-gray-900 dark:text-white text-xs sm:text-sm',
                  'placeholder-gray-400 dark:placeholder-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
                  'transition-all duration-300 ease-out',
                )}
                placeholder="Enter your username"
              />
            </div>
          </div>

          {/* Bio Input - Base mb-4. Textarea: pl-7 pr-2 py-1.5 rounded-md text-xs, h-20 */}
          <div className="mb-4 sm:mb-8">
            <label className="block text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 sm:mb-2">Bio</label>
            <div className="relative group">
              <div className="absolute left-2.5 top-2 sm:left-3.5 sm:top-3"> {/* Adjusted left & top for base */}
                <div className="i-ph:text-aa w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-purple-500" />
              </div>
              <textarea
                value={profile.bio}
                onChange={(e) => handleProfileUpdate('bio', e.target.value)}
                className={classNames(
                  'w-full pl-7 pr-2 py-1.5 rounded-md sm:pl-10 sm:pr-4 sm:py-2.5 sm:rounded-xl', // Base: pl-7, pr-2, py-1.5, rounded-md
                  'bg-white dark:bg-gray-800/50',
                  'border border-gray-200 dark:border-gray-700/50',
                  'text-gray-900 dark:text-white text-xs sm:text-sm',
                  'placeholder-gray-400 dark:placeholder-gray-500',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50',
                  'transition-all duration-300 ease-out',
                  'resize-none',
                  'h-20 sm:h-32', // Base h-20 (80px)
                )}
                placeholder="Tell us about yourself"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

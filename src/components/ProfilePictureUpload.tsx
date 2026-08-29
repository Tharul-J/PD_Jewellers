import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import InitialsAvatar from './InitialsAvatar';

interface ProfilePictureUploadProps {
  name: string;
  profilePicture: string;
  token: string;
  onChange: (url: string) => void;
  size?: number;
}

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ProfilePictureUpload({ name, profilePicture, token, onChange, size = 100 }: ProfilePictureUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setError('');
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG or WEBP images are allowed.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('Image must be smaller than 5MB.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/users/profile-picture', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');
      onChange(data.profilePicture);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users/profile-picture', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not remove photo');
      onChange(data.profilePicture);
    } catch (err: any) {
      setError(err.message || 'Could not remove photo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative group" style={{ width: size, height: size }}>
        {profilePicture ? (
          <img
            src={profilePicture}
            alt={name}
            className="w-full h-full rounded-full object-cover border-2 border-[var(--color-gold)]"
          />
        ) : (
          <InitialsAvatar name={name} size={size} className="border-2 border-[var(--color-gold)]" />
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="absolute inset-0 rounded-full flex items-center justify-center bg-black/0 group-hover:bg-black/40 text-transparent group-hover:text-white transition-colors disabled:cursor-not-allowed"
          title="Change photo"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera size={20} />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="text-[10px] uppercase tracking-widest text-[var(--color-gold-dark)] hover:underline font-semibold disabled:opacity-40"
        >
          Upload Photo
        </button>
        {profilePicture && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={loading}
            className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-red-500 hover:underline font-semibold disabled:opacity-40"
          >
            <Trash2 size={11} /> Remove
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500 text-center max-w-[220px]">{error}</p>}
    </div>
  );
}

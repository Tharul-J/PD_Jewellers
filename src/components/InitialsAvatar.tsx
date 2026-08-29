interface InitialsAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

const AVATAR_COLORS = [
  '#E57373', '#7986CB', '#4FC3F7', '#81C784', '#FFB74D',
  '#BA68C8', '#4DB6AC', '#FF8A65', '#A1887F', '#90A4AE',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function InitialsAvatar({ name, size = 40, className = '' }: InitialsAvatarProps) {
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${className}`}
      style={{ width: size, height: size, backgroundColor: getColor(name), fontSize: size * 0.4 }}
    >
      {getInitials(name)}
    </div>
  );
}

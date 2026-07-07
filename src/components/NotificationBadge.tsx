export function NotificationBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 text-white
                     text-[10px] font-bold rounded-full flex items-center justify-center">
      {count > 99 ? '99+' : count}
    </span>
  );
}

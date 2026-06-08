import { cn } from '../../lib/utils';

interface PersonAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colors = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-amber-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500',
];

function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase()).join('');
}

export default function PersonAvatar({ name, size = 'md', className }: PersonAvatarProps) {
  const sizeClasses = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' };
  return (
    <div className={cn(
      'flex items-center justify-center rounded-full font-semibold text-white',
      sizeClasses[size],
      getColor(name),
      className
    )}>
      {getInitials(name)}
    </div>
  );
}

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getInitials } from "@/lib/utils";
import { getDisplayName, isUserDeleted } from "@/lib/user-utils";

interface User {
  id: number;
  name?: string;
  username?: string;
  avatar?: string | null;
  deletedAt?: string | null;
}

interface UserAvatarProps {
  user?: User | null;
  className?: string;
  fallback?: string;
  fallbackClassName?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

export default function UserAvatar({
  user,
  className,
  fallback,
  fallbackClassName,
  size = "md",
}: UserAvatarProps) {
  // Get display name using helper (handles deleted users)
  const displayName = getDisplayName(user);
  const initials = displayName ? getInitials(displayName) : fallback || "?";
  const isDeleted = isUserDeleted(user);
  
  // Size classes
  const sizeClasses = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base"
  };

  const getAvatarSrc = () => {
    // Don't show avatar for deleted users
    if (isDeleted || !user?.avatar) return undefined;
    // Support data URLs, absolute URLs, or relative URLs
    if (user.avatar.startsWith("data:")) return user.avatar;
    if (user.avatar.startsWith("http")) return user.avatar;
    const API_BASE = import.meta.env.VITE_API_URL || "";
    return `${API_BASE}${user.avatar}`;
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {user?.avatar ? (
        <AvatarImage src={getAvatarSrc()} alt={displayName} />
      ) : null}
      <AvatarFallback className={cn(fallbackClassName)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

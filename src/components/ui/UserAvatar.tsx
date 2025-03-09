import React, { useState } from 'react';

type UserAvatarProps = {
  userData: {
    displayName?: string | null;
    email?: string | null;
    photoURL?: string | null;
  } | null | undefined;
  size?: 'small' | 'medium' | 'large';
};

export function UserAvatar({ userData, size = 'medium' }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  // Size classes mapping
  const sizeClasses = {
    small: 'w-5 h-5',
    medium: 'w-8 h-8',
    large: 'w-10 h-10'
  };
  
  // Get initials from name or email
  const getInitials = () => {
    if (!userData) return '?';
    
    if (userData.displayName) {
      return userData.displayName
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    
    if (userData.email) {
      return userData.email.charAt(0).toUpperCase();
    }
    
    return '?';
  };

  // If no user data or image error, show fallback
  if (!userData || imageError) {
    return (
      <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center
                    bg-gray-600 text-gray-300`}>
        <span className="text-sm font-medium">{getInitials()}</span>
      </div>
    );
  }

  // Show image if available, otherwise show initials
  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center overflow-hidden
                  bg-gray-600`}>
      {userData.photoURL ? (
        <img 
          src={userData.photoURL} 
          alt={userData.displayName || userData.email || ''}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="text-sm font-medium text-gray-300">
          {getInitials()}
        </span>
      )}
    </div>
  );
}
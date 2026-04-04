import React from 'react';

const buildInitials = (name = '') => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'AH';
};

const ClientAvatar = ({
  name = '',
  avatarUrl = '',
  sizeClassName = 'w-12 h-12',
  textClassName = 'text-sm font-black app-accent-text',
  className = '',
  ringClassName = 'border border-[rgba(200,245,63,0.28)] bg-[linear-gradient(135deg,rgba(200,245,63,0.18),rgba(96,180,255,0.18))] shadow-lg shadow-black/20',
  showInnerRing = false,
  innerRingClassName = 'absolute inset-1 rounded-full border border-white/10',
}) => {
  const initials = buildInitials(name);

  return (
    <div className={`relative overflow-hidden rounded-full flex items-center justify-center ${sizeClassName} ${ringClassName} ${className}`}>
      {showInnerRing && <div className={innerRingClassName} />}
      {avatarUrl ? (
        <img src={avatarUrl} alt={name || 'trainee avatar'} className="h-full w-full object-cover" />
      ) : (
        <span className={textClassName}>{initials}</span>
      )}
    </div>
  );
};

export default ClientAvatar;

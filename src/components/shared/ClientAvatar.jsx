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
  textClassName = 'text-sm font-black text-blue-300',
  className = '',
  ringClassName = 'border border-white/10 bg-blue-500/15 shadow-lg shadow-blue-500/10',
  showInnerRing = false,
  innerRingClassName = 'absolute inset-1 rounded-full border border-white/10',
}) => {
  const initials = buildInitials(name);

  return (
    <div className={`relative overflow-hidden rounded-full flex items-center justify-center ${sizeClassName} ${ringClassName} ${className}`}>
      {showInnerRing && <div className={innerRingClassName} />}
      {avatarUrl ? (
        <img src={avatarUrl} alt={name || 'client avatar'} className="h-full w-full object-cover" />
      ) : (
        <span className={textClassName}>{initials}</span>
      )}
    </div>
  );
};

export default ClientAvatar;

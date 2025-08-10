import React from 'react';

const Skeleton = ({ className = '', width = '100%', height = '1rem', rounded = 'md' }) => {
  return (
    <div 
      className={`bg-gray-200 dark:bg-gray-700 animate-pulse ${className}`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: rounded === 'full' ? '9999px' : '0.375rem',
      }}
    />
  );
};

export const SkeletonText = ({ lines = 1, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          width={i === lines - 1 && lines > 1 ? '80%' : '100%'} 
          className="last:mb-0"
        />
      ))}
    </div>
  );
};

export const SkeletonCard = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
      <Skeleton width="70%" height="1.25rem" />
      <Skeleton width="50%" height="1rem" />
      <SkeletonText lines={2} className="mt-2" />
      <div className="flex flex-wrap gap-2 mt-3">
        <Skeleton width="4rem" height="1.25rem" rounded="full" />
        <Skeleton width="5rem" height="1.25rem" rounded="full" />
      </div>
    </div>
  );
};

export const SkeletonChart = ({ height = '300px' }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <Skeleton width="40%" height="1.5rem" className="mb-6" />
      <div 
        className="bg-gray-100 dark:bg-gray-700 rounded animate-pulse" 
        style={{ height }}
      />
    </div>
  );
};

export default Skeleton;

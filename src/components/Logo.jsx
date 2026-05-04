import React from 'react';

const Logo = ({ size = 42, color = '#C0C0C0', stylized = true }) => {
  return (
    <div style={{ 
      position: 'relative', 
      width: size, 
      height: size, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      userSelect: 'none'
    }}>
      {/* Background Geometric Base */}
      <div style={{ 
        position: 'absolute', 
        width: '100%', 
        height: '100%', 
        border: `2px solid ${color}`, 
        borderRadius: '12px',
        transform: 'rotate(45deg)',
        opacity: 0.15
      }} />
      
      {/* Main Stylized "M" Structure */}
      <svg 
        width={size * 0.7} 
        height={size * 0.7} 
        viewBox="0 0 24 24" 
        fill="none" 
        style={{ position: 'relative', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
      >
        <defs>
          <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#C0C0C0" />
            <stop offset="100%" stopColor="#8E8E93" />
          </linearGradient>
        </defs>
        <g stroke="url(#silverGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Continuous M path */}
          <path d="M4 18V6L12 14L20 6V18" />
        </g>
        
        {/* Nodes */}
        <circle cx="12" cy="14" r="1.2" fill="#FFFFFF" />
        <circle cx="4" cy="6" r="1.2" fill="#FFFFFF" />
        <circle cx="20" cy="6" r="1.2" fill="#FFFFFF" />
        <circle cx="4" cy="18" r="1.2" fill="#FFFFFF" />
        <circle cx="20" cy="18" r="1.2" fill="#FFFFFF" />
      </svg>
    </div>
  );
};

export default Logo;

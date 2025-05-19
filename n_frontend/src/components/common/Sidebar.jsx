import React from 'react';
import PropTypes from 'prop-types';

const Sidebar = ({ 
  logoSrc, 
  logoAlt = 'Logo',
  title,
  subtitle,
  backgroundImage,
  backgroundColor = '#050a24',
  className = '',
  children
}) => {
  return (
    <div 
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{ backgroundColor }}
    >
      {backgroundImage && (
        <div className="absolute inset-0 w-full h-full z-0">
          <img 
            src={backgroundImage} 
            alt="Background" 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="relative z-10 p-16 h-full flex flex-col">
        {logoSrc && (
          <div className="mb-16">
            <img 
              src={logoSrc} 
              alt={logoAlt} 
              className="h-12"
            />
          </div>
        )}
        
        <div className="mt-auto mb-16">
          {title && (
            <h1 className="text-[56px] font-poppins font-light text-white leading-[67px]">
              {title}
            </h1>
          )}
          
          {subtitle && (
            <p className="text-[56px] font-poppins font-light text-white leading-[67px]">
              {subtitle}
            </p>
          )}
        </div>
        
        {children}
      </div>
    </div>
  );
};

Sidebar.propTypes = {
  logoSrc: PropTypes.string,
  logoAlt: PropTypes.string,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  backgroundImage: PropTypes.string,
  backgroundColor: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node,
};

export default Sidebar;
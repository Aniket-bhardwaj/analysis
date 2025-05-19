import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

const Header = ({ logoSrc, logoAlt = 'Logo', className = '' }) => {
  return (
    <header className={`w-full py-4 ${className}`}>
      <div className="container mx-auto px-4">
        <Link to="/" className="inline-block">
          <img 
            src={logoSrc} 
            alt={logoAlt} 
            className="h-6 md:h-8"
          />
        </Link>
      </div>
    </header>
  );
};

Header.propTypes = {
  logoSrc: PropTypes.string.isRequired,
  logoAlt: PropTypes.string,
  className: PropTypes.string,
};

export default Header;
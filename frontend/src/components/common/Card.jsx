import React from 'react';
import PropTypes from 'prop-types';

const Card = ({ 
  title, 
  children, 
  className = '', 
  padding = 'p-6',
  shadow = 'shadow-md',
  rounded = 'rounded-lg',
  border = 'border border-gray-200',
  bgColor = 'bg-white'
}) => {
  return (
    <div className={`${padding} ${shadow} ${rounded} ${border} ${bgColor} ${className}`}>
      {title && (
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
      )}
      {children}
    </div>
  );
};

Card.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
  padding: PropTypes.string,
  shadow: PropTypes.string,
  rounded: PropTypes.string,
  border: PropTypes.string,
  bgColor: PropTypes.string,
};

export default Card;
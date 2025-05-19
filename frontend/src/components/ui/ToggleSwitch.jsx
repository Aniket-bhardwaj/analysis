import React from 'react';
import PropTypes from 'prop-types';

const ToggleSwitch = ({
  isOn,
  handleToggle,
  id,
  label,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`flex items-center ${className}`}>
      <label htmlFor={id} className="flex items-center cursor-pointer">
        <div className="relative">
          <input
            id={id}
            type="checkbox"
            className="sr-only"
            checked={isOn}
            onChange={handleToggle}
            disabled={disabled}
          />
          <div
            className={`block w-14 h-8 rounded-full ${
              disabled ? 'bg-gray-300' : isOn ? 'bg-[#1570ef]' : 'bg-gray-400'
            } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          ></div>
          <div
            className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ease-in-out ${
              isOn ? 'transform translate-x-6' : ''
            }`}
          ></div>
        </div>
        {label && (
          <span className="ml-3 text-sm font-medium text-gray-700">
            {label}
          </span>
        )}
      </label>
    </div>
  );
};

ToggleSwitch.propTypes = {
  isOn: PropTypes.bool.isRequired,
  handleToggle: PropTypes.func.isRequired,
  id: PropTypes.string.isRequired,
  label: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default ToggleSwitch;
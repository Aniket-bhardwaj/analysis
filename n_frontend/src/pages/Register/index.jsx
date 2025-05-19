import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import InputField from '../../components/ui/InputField';
import Button from '../../components/ui/Button';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [errors, setErrors] = useState({});
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Here you would typically send the data to your backend
      console.log('Form submitted:', formData);
      
      // For demo purposes, show an alert
      alert('Account created successfully!');
    }
  };
  
  return (
    <div className="flex h-screen w-full">
      {/* Left side - Branding */}
      <div className="hidden md:block md:w-1/2 bg-[#050a24] relative">
        <div className="absolute inset-0">
          <img 
            src="/images/img_frame_32.svg" 
            alt="Background pattern" 
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="relative z-10 p-20 h-full flex flex-col">
          <div className="mb-8">
            <img 
              src="/images/img_mati_carbon_logo_white_1.png" 
              alt="Mati Logo" 
              className="h-24 w-auto"
            />
          </div>
          
          <div className="mt-auto">
            <h1 className="text-[56px] font-poppins font-light text-white leading-[67px]">
              Welcome.
              <br />
              Start your journey
              <br />
              now with our
              <br />
              management
              <br />
              system!
            </h1>
          </div>
        </div>
      </div>
      
      {/* Right side - Registration Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-[28px] font-poppins font-semibold text-[#101828] mb-8">
              Create an account
            </h2>
            
            <div className="space-y-6">
              <InputField
                label="Email"
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="balamia@gmail.com"
                error={errors.email}
                required
                className="border-[3px] border-[#d1e9ff] rounded-lg"
              />
              
              <InputField
                label="Password"
                type="password"
                name="password"
                id="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                error={errors.password}
                required
                showPasswordToggle={true}
              />
            </div>
            
            <Button
              type="submit"
              variant="primary"
              size="full"
              className="h-12 rounded-lg text-[16px] font-semibold mt-8"
            >
              Create account
            </Button>
            
            <div className="text-center mt-4">
              <span className="text-[16px] font-poppins text-[#98a2b3]">
                Already have an account ?
              </span>{' '}
              <Link to="/login" className="text-[16px] font-poppins text-[#1570ef]">
                Log in
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
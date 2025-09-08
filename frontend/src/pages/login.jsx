import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      setIsSubmitting(true);
      setServerError('');

      // CORRECTED: Using the full, absolute URL to your backend server.
      const apiUrl = 'http://localhost:8080/api/auth/login';
      console.log('Attempting to send login request to:', apiUrl);

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
          credentials: 'include',
        });

        const data = await response.json();

        if (response.ok) {
          console.log('Login successful:', data);
          navigate('/dashboard');
        } else {
          setServerError(data.error || 'Login failed. Please try again.');
        }
      } catch (error) {
        console.error('Login error:', error);
        setServerError('Network error. Please try again later.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="flex h-screen w-full">
      {/* Left side - Branding */}
      <div className="hidden md:block md:w-1/2 bg-[#050a24] relative">
        <div className="absolute inset-0">
          <img src="/images/img_frame_32.svg" alt="Background pattern" className="w-full h-full object-cover" />
        </div>
        <div className="relative z-10 p-20 h-full flex flex-col">
          <div className="mb-8">
            <img src="/images/whitelogoiitk.png" alt="Mati Logo" className="h-24 w-auto" />
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

      {/* Right side - Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-[28px] font-poppins font-semibold text-[#101828] mb-8">
              Log In
            </h2>
            <div className="space-y-6">
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} placeholder="email@gmail.com" required className="w-full p-3 border border-[#d1e9ff] rounded-lg focus:outline-none" />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} name="password" id="password" value={formData.password} onChange={handleChange} placeholder="Enter your password" required className="w-full p-3 pr-10 border border-[#d1e9ff] rounded-lg focus:outline-none" />
                  <img src="/images/img_icon_eye.svg" alt="Toggle password" onClick={() => setShowPassword((prev) => !prev)} className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 cursor-pointer" />
                </div>
                {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[16px] font-semibold mt-8">
              {isSubmitting ? 'Logging in...' : 'Log In'}
            </button>
            {serverError && <p className="text-red-600 text-sm mt-4">{serverError}</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';
import { parseApiResponse } from '../utils/apiResponse';
import { clearAllOfflineUserData } from '../data/offlineRepository';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    password: ''
  });
  const [otp, setOtp] = useState('');
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [infoMessage, setInfoMessage] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const startCooldown = (seconds) => {
    setCooldown(seconds);
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/signup/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to request OTP');
      }
      setIsOtpStep(true);
      setInfoMessage('OTP sent. Check your email and enter the code below.');
      setOtp('');
      if (data.cooldownSeconds) {
        startCooldown(data.cooldownSeconds);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp,
        }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        throw new Error(data?.message || 'OTP verification failed');
      }
      await clearAllOfflineUserData();
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setInfoMessage(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await parseApiResponse(res);
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to resend OTP');
      }
      setInfoMessage(data.message || 'OTP resent successfully.');
      if (data.cooldownSeconds) {
        startCooldown(data.cooldownSeconds);
      }
    } catch (err) {
      setError(err.message);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-primary selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center gap-2">
           <img src={logo} alt="SaiSwaram" className="w-10 h-10 object-contain drop-shadow-md" />
          <span className="text-3xl font-bold text-gray-900 tracking-tight">SaiSwaram</span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isOtpStep ? 'Verify your email' : 'Create your account'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isOtpStep ? 'Account will be created only after OTP verification.' : (
            <>
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-primary hover:text-primary-dark transition-colors">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-5" onSubmit={isOtpStep ? handleVerifyOtp : handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}
            {infoMessage && (
              <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm font-medium">
                {infoMessage}
              </div>
            )}
            
            {!isOtpStep ? (
              <>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition-all"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">
                    Contact Number
                  </label>
                  <div className="mt-1">
                    <input
                      id="contactNumber"
                      name="contactNumber"
                      type="tel"
                      required
                      value={formData.contactNumber}
                      onChange={handleChange}
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition-all"
                      placeholder="e.g. +1 234 567 890"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition-all"
                      placeholder="Create a strong password"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="bg-orange-50 text-orange-700 p-3 rounded-lg text-sm">
                  OTP sent to <span className="font-bold">{formData.email}</span>
                </div>
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                    Enter 6-digit OTP
                  </label>
                  <div className="mt-1">
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm tracking-[0.3em]"
                      placeholder="123456"
                      maxLength={6}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting || cooldown > 0}
                  onClick={handleResendOtp}
                  className="w-full bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium disabled:opacity-60"
                >
                  {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpStep(false);
                    setOtp('');
                    setInfoMessage(null);
                    setError(null);
                  }}
                  className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium"
                >
                  Edit signup details
                </button>
              </>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all transform hover:-translate-y-0.5"
              >
                {isSubmitting ? 'Please wait...' : (isOtpStep ? 'Verify OTP & Create Account' : 'Send OTP')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Signup;

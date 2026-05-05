// Login.tsx - Simplified & Modern Login Logic
import type { FormEvent } from 'react';
import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';

// TypeScript interfaces for type safety
interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // State management for form data
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const loginInFlightRef = useRef(false);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    // Clear error when user types
    if (error) setError('');
  };

  // Main login handler - Simplified and cleaner
  const doLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (loginInFlightRef.current || isLoading) {
      return;
    }
    loginInFlightRef.current = true;
    setIsLoading(true);
    setError('');
    
    try {
      // Step 1: Authenticate user and get access token
      await authAPI.login({
        username: formData.email,
        password: formData.password
      });

      // Step 2: Get current user data (includes tenant_id, role, service_access)
      const userData = await authAPI.getCurrentUser();
      
      // Save user data to localStorage
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('tenant_id', userData.tenant_id?.toString() || '1');

      // Step 3: Get user's service access
      const servicesResponse = await authAPI.getUserServices();
      localStorage.setItem('service_access', servicesResponse.service_access.toString());
      localStorage.setItem('available_services', JSON.stringify(servicesResponse.available_services));

      // Step 4: Update authentication state
      login();
      
      // Step 5: Show success message and navigate to the park dashboard
      toast.success(`Welcome back, ${userData.full_name}!`);
      
      // Navigate directly to the park dashboard
      setTimeout(() => {
        navigate('/park', { replace: true });
      }, 100);
      
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Handle different error types
      if (err.response?.status === 401) {
        setError('Invalid email or password. Please try again.');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your credentials and try again.');
      }
      
      // Clear sensitive data on error
      localStorage.removeItem('access_token');
      localStorage.removeItem('isAuthenticated');
      
    } finally {
      loginInFlightRef.current = false;
      setIsLoading(false);
    }
  };

  // Handle reset password
  const handleResetPassword = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    toast('Password reset functionality coming soon', {
      icon: '🔑',
    });
  };

  return (
    <div className="font-sans bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center min-h-screen p-5">
      <div className="bg-white w-full max-w-md py-12 px-9 rounded-2xl shadow-2xl">
        
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Adventure Park Admin Login</h2>
          <p className="text-sm text-gray-500 mt-2">Travel Link | Adventure Park | Management</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        <form onSubmit={doLogin}>
          
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm outline-none transition-all duration-200 bg-gray-50 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white placeholder-gray-400" 
              name="email"
              id="email" 
              placeholder="your.email@example.com" 
              required
              value={formData.email}
              onChange={handleInputChange}
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
          
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm outline-none transition-all duration-200 bg-gray-50 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white placeholder-gray-400" 
              name="password"
              id="password" 
              placeholder="Enter your password" 
              required
              value={formData.password}
              onChange={handleInputChange}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>


          
          <div className="mt-2">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-500 text-white border-none px-4 py-3 rounded-lg cursor-pointer text-base font-medium transition-colors duration-200 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Logging in...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Login
                </>
              )}
            </button>
          </div>
          
        </form>
        
        <div className="text-center mt-5 text-sm text-gray-600">
          <p>
            Forgot your password? <a href="#" onClick={handleResetPassword} className="text-blue-500 no-underline cursor-pointer bg-none border-none text-sm hover:underline">Reset</a>
          </p>
        </div>
        
      </div>
    </div>
  );
};

export default Login;

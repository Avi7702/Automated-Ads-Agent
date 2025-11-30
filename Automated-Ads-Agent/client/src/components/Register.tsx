import React, { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface RegisterProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function Register({ onSuccess, onSwitchToLogin }: RegisterProps) {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    const result = await register(email, password);

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || 'Registration failed');
    }

    setIsLoading(false);
  };

  return (
    <div className="auth-form-container">
      <h2>Create Account</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <div className="auth-error">{error}</div>}

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            placeholder="Enter your email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            placeholder="At least 8 characters"
            minLength={8}
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
            placeholder="Confirm your password"
            minLength={8}
          />
        </div>

        <button type="submit" disabled={isLoading} className="auth-button">
          {isLoading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      {onSwitchToLogin && (
        <p className="auth-switch">
          Already have an account?{' '}
          <button type="button" onClick={onSwitchToLogin} className="link-button">
            Login
          </button>
        </p>
      )}
    </div>
  );
}

export default Register;

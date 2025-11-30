import React, { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LoginProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export function Login({ onSuccess, onSwitchToRegister }: LoginProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || 'Login failed');
    }

    setIsLoading(false);
  };

  return (
    <div className="auth-form-container">
      <h2>Login</h2>
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
            placeholder="Enter your password"
            minLength={8}
          />
        </div>

        <button type="submit" disabled={isLoading} className="auth-button">
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {onSwitchToRegister && (
        <p className="auth-switch">
          Don't have an account?{' '}
          <button type="button" onClick={onSwitchToRegister} className="link-button">
            Register
          </button>
        </p>
      )}
    </div>
  );
}

export default Login;

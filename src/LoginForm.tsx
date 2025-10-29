import React, { useState } from 'react';

interface LoginFormProps {
  onLogin: () => void;
  onCancel: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '95859585') {
      onLogin();
    } else {
      setError('Неверный пароль');
      setPassword('');
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-modal">
        <h2>🔐 Вход в админ панель</h2>
        <form onSubmit={handleSubmit} className="login-form">
          <div>
            <label>Пароль *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
              autoFocus
            />
          </div>
          
          {error && <div className="login-error">{error}</div>}
          
          <div className="login-actions">
            <button type="submit" className="login-btn">
              Войти
            </button>
            <button type="button" onClick={onCancel} className="cancel-btn">
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm; 
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, Navigate, useNavigate } from 'react-router-dom';
import Board from './Board';
import AdminPanel from './AdminPanel';
import LoginForm from './LoginForm';
import TableCall from './TableCall';
import QRGenerator from './QRGenerator';
import './App.css';

// Проверка авторизации
const isAuthenticated = () => {
  return localStorage.getItem('isAuthenticated') === 'true';
};

const setAuthenticated = (value: boolean) => {
  if (value) {
    localStorage.setItem('isAuthenticated', 'true');
  } else {
    localStorage.removeItem('isAuthenticated');
  }
};

// Обёртка для TableCall с параметрами из URL
function TableCallPage() {
  const { branch, tableId } = useParams<{ branch: string; tableId: string }>();
  
  if (!branch || !tableId) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Ошибка: неверная ссылка</h2>
      <p>Пожалуйста, отсканируйте QR-код на вашем столе.</p>
    </div>;
  }
  
  return <TableCall branch={decodeURIComponent(branch)} tableId={tableId} />;
}

// Защищенный роут для канбан-доски
function ProtectedBoard() {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <MainApp />;
}


function MainApp() {
  const [currentView, setCurrentView] = useState<'board' | 'login' | 'admin'>('board');

  const handleOpenAdmin = () => {
    setCurrentView('login');
  };

  const handleLogin = () => {
    setAuthenticated(true);
    setCurrentView('admin');
  };

  const handleBackToBoard = () => {
    setCurrentView('board');
  };

  return (
    <div className="App">
      {currentView === 'board' && (
        <Board onOpenAdmin={handleOpenAdmin} />
      )}
      
      {currentView === 'login' && (
        <>
          <Board onOpenAdmin={handleOpenAdmin} />
          <LoginForm 
            onLogin={handleLogin}
            onCancel={handleBackToBoard}
          />
        </>
      )}
      
      {currentView === 'admin' && (
        <AdminPanel onBack={handleBackToBoard} />
      )}
    </div>
  );
}

// Страница входа
function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '9585') {
      setAuthenticated(true);
      navigate('/');
    } else {
      setError('Неверный пароль');
      setPassword('');
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#111111',
      color: '#fff',
      fontFamily: 'Montserrat, sans-serif'
    }}>
      <div style={{
        background: '#1a1a1a',
        padding: '40px',
        borderRadius: '20px',
        border: '1px solid #333',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>🔐 Вход в систему</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Пароль *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #444',
                background: '#2a2a2a',
                color: '#fff',
                fontSize: '16px'
              }}
            />
          </div>
          
          {error && <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: '#f87171', 
            padding: '12px', 
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>{error}</div>}
          
          <button 
            type="submit" 
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              background: '#667eea',
              color: '#fff',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Войти
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedBoard />} />
        <Route path="/table/:branch/:tableId" element={<TableCallPage />} />
        <Route path="/qr-generator" element={isAuthenticated() ? <QRGenerator /> : <Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

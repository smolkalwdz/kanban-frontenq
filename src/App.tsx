import React, { useState } from 'react';
import Board from './Board';
import AdminPanel from './AdminPanel';
import LoginForm from './LoginForm';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState<'board' | 'login' | 'admin'>('board');

  const handleOpenAdmin = () => {
    setCurrentView('login');
  };

  const handleLogin = () => {
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

export default App;

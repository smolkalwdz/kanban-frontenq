import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import Board from './Board';
import AdminPanel from './AdminPanel';
import LoginForm from './LoginForm';
import TableCall from './TableCall';
import QRGenerator from './QRGenerator';
import './App.css';

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

function MainApp() {
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainApp />} />
        <Route path="/table/:branch/:tableId" element={<TableCallPage />} />
        <Route path="/qr-generator" element={<QRGenerator />} />
      </Routes>
    </Router>
  );
}

export default App;

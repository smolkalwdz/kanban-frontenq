import React, { useState, useEffect } from 'react';
import { API_URL } from './config';
import './TableCall.css';

interface TableCallProps {
  branch: string;
  tableId: string;
}

type CallType = 'waiter' | 'hookah' | 'gamemaster';

const TableCall: React.FC<TableCallProps> = ({ branch, tableId }) => {
  const logoSrc = `${process.env.PUBLIC_URL}/logo.png`;
  const [tableName, setTableName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Загружаем информацию о столе
    const loadTableInfo = async () => {
      try {
        const response = await fetch(`${API_URL}/api/zones/${tableId}`);
        if (response.ok) {
          const data = await response.json();
          setTableName(data.name);
        }
      } catch (error) {
        console.error('Error loading table info:', error);
        
       setTableName(`Зона ${tableId}`);
      }
    };
    
    loadTableInfo();
  }, [tableId]);

  const handleCall = async (callType: CallType) => {
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch(`${API_URL}/api/table-calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch,
          tableId: Number(tableId),
          callType,
        }),
      });

      if (response.ok) {
        let successMessage = '';
        if (callType === 'waiter') successMessage = '✅ Сотрудник вызван! Скоро подойдёт.';
        else if (callType === 'hookah') successMessage = '✅ Кальянный мастер вызван! Скоро подойдёт.';
        else if (callType === 'gamemaster') successMessage = '✅ Игровед вызван! Скоро подойдёт.';

        setMessage({ 
          text: successMessage,
          type: 'success' 
        });
        
        // Скрываем сообщение через 3 секунды
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ 
          text: '❌ Ошибка! Попробуйте ещё раз.', 
          type: 'error' 
        });
      }
    } catch (error) {
      setMessage({ 
        text: '❌ Ошибка соединения! Попробуйте ещё раз.', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="table-call-container">
      <div className="table-call-card">
        <div className="table-call-header">
          <div className="table-call-logo">
            <img src={logoSrc} alt="logo" />
          </div>
          <h1 className="branch-name">
            {branch === 'МСК' ? 'Московское шоссе 43-47' : 
             branch === 'Полевая' ? 'Полевая 72' : 
             branch}
          </h1>
          <h2 className="table-name">{tableName || `Зона ${tableId}`}</h2>
        </div>

        <div className="call-buttons">
          <button 
            className="call-button hookah-master"
            onClick={() => handleCall('hookah')}
            disabled={loading}
          >
            <span className="call-icon">🌬️</span>
            <span className="call-text">Позвать кальянного мастера</span>
          </button>

          <button 
            className="call-button gamemaster"
            onClick={() => handleCall('gamemaster')}
            disabled={loading}
          >
            <span className="call-icon">🎮</span>
            <span className="call-text">Позвать игроведа / PS5</span>
          </button>

          <a 
            href="https://vk.com/@dungeon_samara-vo-chto-poigrat-v-taim-kafe-dungeon" 
            target="_blank" 
            rel="noopener noreferrer"
            className="call-button games-link"
          >
            <span className="call-icon">🎲</span>
            <span className="call-text">НАШИ ИГРЫ</span>
          </a>
        </div>

        {message && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>Отправка...</span>
          </div>
        )}

        <div className="table-call-footer">
          <p>Нажмите на кнопку, чтобы вызвать персонал к вашему столу</p>
        </div>
      </div>
    </div>
  );
};

export default TableCall;



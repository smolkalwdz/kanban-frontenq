import React, { useState, useEffect } from 'react';
import { API_URL } from './config';
import './TableCall.css';

interface TableCallProps {
  branch: string;
  tableId: string;
}

type CallType = 'waiter' | 'hookah' | 'gamemaster';

const TableCall: React.FC<TableCallProps> = ({ branch, tableId }) => {
  const logoSrc = `${process.env.PUBLIC_URL}/Logo2.png`;
  const [tableName, setTableName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Состояние модального окна
  const [showModal, setShowModal] = useState(false);
  const [customComment, setCustomComment] = useState('');

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

  const handleCall = async (callType: CallType, comment?: string) => {
    setLoading(true);
    setMessage(null);
    setShowModal(false); // Закрываем модалку при отправке
    
    try {
      const response = await fetch(`${API_URL}/api/table-calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch,
          tableId: Number(tableId),
          callType,
          comment, // Добавляем комментарий
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
        
        setCustomComment(''); // Очищаем поле ввода
        
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
            className="call-button waiter"
            onClick={() => setShowModal(true)} // Открываем модалку
            disabled={loading}
          >
            <span className="call-icon">👨‍💼</span>
            <span className="call-text">Вызвать СОТРУДНИКА</span>
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

      {/* Модальное окно */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Причина вызова</h3>
              <button className="close-button" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="modal-options">
              <button 
                className="modal-option-btn"
                onClick={() => handleCall('waiter', 'Проблема с PS5')}
              >
                🎮 Проблема с PS5
              </button>
              
              <button 
                className="modal-option-btn"
                onClick={() => handleCall('waiter', 'Выключается телевизор')}
              >
                📺 Выключается телевизор
              </button>

              <div className="modal-input-container">
                <input
                  type="text"
                  className="modal-input"
                  placeholder="Другая причина..."
                  value={customComment}
                  onChange={(e) => setCustomComment(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && customComment.trim()) {
                      handleCall('waiter', customComment);
                    }
                  }}
                />
                <button 
                  className="modal-submit-btn"
                  disabled={!customComment.trim()}
                  onClick={() => handleCall('waiter', customComment)}
                >
                  ➤
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableCall;

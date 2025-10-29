import React, { useState, useEffect } from 'react';
import { API_URL } from './config';

interface Table {
  id: number;
  name: string;
  capacity: number;
  branch: string;
}

interface Booking {
  id: string;
  name: string;
  time: string;
  guests: number;
  phone: string;
  tableId: number;
  branch: string;
  isActive: boolean;
}

interface AdminPanelProps {
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  // Отладка API URL
  console.log('🔍 AdminPanel API_URL:', API_URL);
  
  const [tables, setTables] = useState<Table[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentBranch, setCurrentBranch] = useState<'МСК' | 'Полевая'>(() => {
    const saved = localStorage.getItem('adminBranch');
    return (saved === 'МСК' || saved === 'Полевая') ? saved : 'МСК';
  });
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editForm, setEditForm] = useState({ name: '', capacity: 4 });
  const [addForm, setAddForm] = useState({ name: '', capacity: 4 });
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [overrideInput, setOverrideInput] = useState<string>('');
  
  // Состояние для контроля порядка
  const [activeView, setActiveView] = useState<'zones' | 'control'>('zones');
  const [telegramChatId, setTelegramChatId] = useState<string>(() => {
    return localStorage.getItem('telegramChatId') || '-1002686555288';
  });
  const [telegramThreadId, setTelegramThreadId] = useState<string>(() => {
    return localStorage.getItem('telegramThreadId') || '7';
  });
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [sendingZoneId, setSendingZoneId] = useState<number | null>(null);

  // Загрузка бронирований
  const loadBookings = async () => {
    try {
      const response = await fetch(`${API_URL}/api/bookings`);
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  // Проверка есть ли активные гости в зоне
  const hasActiveGuests = (tableId: number): boolean => {
    return bookings.some(booking => 
      booking.tableId === tableId && booking.isActive
    );
  };

  const loadTables = async () => {
    try {
      const res = await fetch(`${API_URL}/api/zones`);
      const data = await res.json();
      setTables(data);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    loadTables();
    loadBookings();
  }, []);

  // Получаем зоны текущего филиала и сортируем по номеру
  const currentTables = tables
    .filter(table => table.branch === currentBranch)
    .sort((a, b) => {
      const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

  // Редактирование зоны
  const handleEditTable = (table: Table) => {
    setEditingTable(table);
    setEditForm({ name: table.name, capacity: table.capacity });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable || !editForm.name.trim() || editForm.capacity < 1) return;

    try {
      const res = await fetch(`${API_URL}/api/zones/${editingTable.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          capacity: editForm.capacity,
        }),
      });
      
      if (res.ok) {
        const updated = await res.json();
        setTables(prev => prev.map(t => t.id === editingTable.id ? updated : t));
        setEditingTable(null);
        setEditForm({ name: '', capacity: 4 });
      }
    } catch (error) {
      console.error('Error updating table:', error);
      alert('Ошибка при обновлении зоны');
    }
  };

  const handleCancelEdit = () => {
    setEditingTable(null);
    setEditForm({ name: '', capacity: 4 });
  };

  // Добавление новой зоны
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || addForm.capacity < 1) return;

    try {
      const res = await fetch(`${API_URL}/api/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          capacity: addForm.capacity,
          branch: currentBranch,
        }),
      });
      
      if (res.ok) {
        const newTable = await res.json();
        setTables(prev => [...prev, newTable]);
        setAddForm({ name: '', capacity: 4 });
        setIsAddingTable(false);
      }
    } catch (error) {
      console.error('Error adding table:', error);
      alert('Ошибка при добавлении зоны');
    }
  };

  // Удаление зоны
  const handleDeleteTable = async (tableId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту зону? Все связанные бронирования также будут удалены.')) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/zones/${tableId}`, { method: 'DELETE' });
      if (res.ok) {
        setTables(prev => prev.filter(t => t.id !== tableId));
      }
    } catch (error) {
      console.error('Error deleting table:', error);
      alert('Ошибка при удалении зоны');
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (editingTable) {
      setEditForm(prev => ({ ...prev, [name]: name === 'capacity' ? Number(value) : value }));
    } else {
      setAddForm(prev => ({ ...prev, [name]: name === 'capacity' ? Number(value) : value }));
    }
  };

  // Сохранение Telegram Chat ID
  const saveTelegramChatId = (chatId: string) => {
    setTelegramChatId(chatId);
    localStorage.setItem('telegramChatId', chatId);
  };

  // Сохранение Telegram Thread ID
  const saveTelegramThreadId = (threadId: string) => {
    setTelegramThreadId(threadId);
    localStorage.setItem('telegramThreadId', threadId);
  };

  // Изменение филиала с сохранением
  const changeBranch = (branch: 'МСК' | 'Полевая') => {
    setCurrentBranch(branch);
    localStorage.setItem('adminBranch', branch);
  };

  // Отправка уведомления о неубранной зоне
  const handleNotifyDirtyZone = async (table: Table) => {
    if (!telegramChatId) {
      alert('Пожалуйста, введите Chat ID Telegram в настройках');
      return;
    }

    setSendingZoneId(table.id);
    try {
      const response = await fetch(`${API_URL}/api/telegram/notify-dirty-zone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch: table.branch,
          zoneName: table.name,
          chatId: telegramChatId,
          threadId: telegramThreadId ? parseInt(telegramThreadId) : null
        })
      });

      if (response.ok) {
        alert(`✅ Уведомление отправлено: ${table.branch}, ${table.name} — НЕ УБРАНА`);
      } else {
        const error = await response.json();
        alert(`❌ Ошибка: ${error.error || 'Не удалось отправить уведомление'}`);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('❌ Ошибка при отправке уведомления');
    } finally {
      setSendingZoneId(null);
    }
  };

  // Отправка произвольного сообщения
  const handleSendCustomMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!telegramChatId) {
      alert('Пожалуйста, введите Chat ID Telegram в настройках');
      return;
    }

    if (!customMessage.trim()) {
      alert('Пожалуйста, введите сообщение');
      return;
    }

    setIsSendingMessage(true);
    try {
      const response = await fetch(`${API_URL}/api/telegram/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: customMessage,
          chatId: telegramChatId,
          threadId: telegramThreadId ? parseInt(telegramThreadId) : null
        })
      });

      if (response.ok) {
        alert('✅ Сообщение отправлено!');
        setCustomMessage('');
      } else {
        const error = await response.json();
        alert(`❌ Ошибка: ${error.error || 'Не удалось отправить сообщение'}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('❌ Ошибка при отправке сообщения');
    } finally {
      setIsSendingMessage(false);
    }
  };

  return (
    <div>
      {/* Заголовок */}
      <div className="header">
        <div>
          <h1>⚙️ Админ панель - {activeView === 'zones' ? 'Управление зонами' : 'Контроль порядка'}</h1>
          <button onClick={onBack} className="back-btn">
            ← Вернуться к доске
          </button>
        </div>
        <div className="header-btns">
          <button 
            onClick={() => setActiveView('zones')}
            className={activeView === 'zones' ? 'active' : ''}
          >
            🏠 Зоны
          </button>
          <button 
            onClick={() => setActiveView('control')}
            className={activeView === 'control' ? 'active' : ''}
          >
            🧹 Контроль порядка
          </button>
        </div>
      </div>

      {/* Информация о текущем филиале */}
      {activeView === 'zones' && (
        <div className="info-bar">
          <div>
            <h2>Редактирование зон - {currentBranch}</h2>
            <div className="booking-stats">
              <span className="stat-item total">
                Всего зон: {currentTables.length}
              </span>
            </div>
          </div>
          <div className="info-bar-icon">
            {currentBranch === 'МСК' ? '🏢' : '🏪'}
          </div>
        </div>
      )}

      {activeView === 'control' && (
        <div className="info-bar">
          <div>
            <h2>Контроль порядка и уведомления</h2>
            <div className="booking-stats">
              <span className="stat-item">
                📱 Telegram уведомления
              </span>
            </div>
          </div>
          <div className="info-bar-icon">
            🧹
          </div>
        </div>
      )}

      <div className="admin-content">
        {/* ========== СЕКЦИЯ: КОНТРОЛЬ ПОРЯДКА ========== */}
        {activeView === 'control' && (
          <>
            {/* Настройки Telegram */}
            <div className="admin-form-card">
              <h3>⚙️ Настройки Telegram</h3>
              <div className="admin-form">
                <div>
                  <label>Chat ID Telegram *</label>
                  <input
                    type="text"
                    value={telegramChatId}
                    onChange={(e) => saveTelegramChatId(e.target.value)}
                    placeholder="-1002686555288"
                  />
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                    💡 ID группового чата (отрицательное число)
                  </p>
                </div>
                <div>
                  <label>Thread ID (для форум-чатов)</label>
                  <input
                    type="text"
                    value={telegramThreadId}
                    onChange={(e) => saveTelegramThreadId(e.target.value)}
                    placeholder="7"
                  />
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                    💡 ID топика "Внутренний порядок" (оставьте 7 для вашего чата)
                  </p>
                </div>
              </div>
            </div>

            {/* Быстрая отправка произвольного сообщения */}
            <div className="admin-form-card">
              <h3>📤 Отправить сообщение в Telegram</h3>
              <form onSubmit={handleSendCustomMessage} className="admin-form">
                <div>
                  <label>Сообщение *</label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Введите текст сообщения..."
                    rows={4}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      width: '100%',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                    required
                  />
                </div>
                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="save-btn"
                    disabled={isSendingMessage}
                  >
                    {isSendingMessage ? '⏳ Отправка...' : '📨 Отправить'}
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setCustomMessage('')}
                    disabled={isSendingMessage}
                  >
                    Очистить
                  </button>
                </div>
              </form>
            </div>

            {/* Выбор филиала для контроля */}
            <div className="admin-form-card">
              <h3>🏢 Выберите филиал</h3>
              <div className="branch-selector">
                <button 
                  onClick={() => changeBranch('МСК')}
                  className={`branch-btn ${currentBranch === 'МСК' ? 'active' : ''}`}
                  type="button"
                >
                  🏢 МСК ({tables.filter(t => t.branch === 'МСК').length} зон)
                </button>
                <button 
                  onClick={() => changeBranch('Полевая')}
                  className={`branch-btn ${currentBranch === 'Полевая' ? 'active' : ''}`}
                  type="button"
                >
                  🏪 Полевая ({tables.filter(t => t.branch === 'Полевая').length} зон)
                </button>
              </div>
            </div>

            {/* Список зон с кнопками уведомлений */}
            <div className="admin-form-card">
              <h3>🚨 {currentBranch} - Контроль зон</h3>
              <div className="control-zones-grid">
                {currentTables.map((table) => {
                  const hasGuests = hasActiveGuests(table.id);
                  return (
                    <div 
                      key={table.id} 
                      className={`control-zone-card ${hasGuests ? 'has-guests' : ''}`}
                    >
                      <div className="control-zone-info">
                        <h4>
                          {hasGuests && <span className="status-indicator">🟢</span>}
                          {table.name}
                        </h4>
                        <p>{table.capacity} чел.</p>
                      </div>
                      <button
                        onClick={() => handleNotifyDirtyZone(table)}
                        className="notify-btn"
                        disabled={sendingZoneId === table.id}
                        type="button"
                      >
                        {sendingZoneId === table.id ? (
                          '⏳ Отправка...'
                        ) : (
                          '🚨 НЕ УБРАНА'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
              {currentTables.length === 0 && (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                  В филиале "{currentBranch}" нет зон
                </p>
              )}
            </div>
          </>
        )}

        {/* ========== СЕКЦИЯ: УПРАВЛЕНИЕ ЗОНАМИ ========== */}
        {activeView === 'zones' && (
          <>
        {/* Панель тестового времени */}
        <div className="admin-form-card">
          <h3>Тестовое время системы</h3>
          <form
            className="admin-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!overrideInput) return;
              const d = new Date(overrideInput);
              if (isNaN(d.getTime())) {
                alert('Некорректная дата/время');
                return;
              }
              localStorage.setItem('appTimeOverride', d.toISOString());
              alert(`Установлено тестовое время: ${d.toLocaleString()}`);
            }}
          >
            <div>
              <label>Дата и время</label>
              <input
                type="datetime-local"
                value={overrideInput}
                onChange={(e) => setOverrideInput(e.target.value)}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="save-btn">Установить</button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  localStorage.removeItem('appTimeOverride');
                  setOverrideInput('');
                  alert('Тестовое время сброшено');
                }}
              >
                Сбросить
              </button>
            </div>
            {localStorage.getItem('appTimeOverride') && (
              <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                Активно: {new Date(localStorage.getItem('appTimeOverride') || '').toLocaleString()}
              </p>
            )}
          </form>
        </div>
        {/* Кнопка добавления новой зоны */}
        <div className="admin-toolbar">
          <button 
            onClick={() => setIsAddingTable(true)}
            className="add-table-btn"
            disabled={isAddingTable}
          >
            ➕ Добавить новую зону
          </button>
        </div>

        {/* Форма добавления новой зоны */}
        {isAddingTable && (
          <div className="admin-form-card">
            <h3>Добавить новую зону</h3>
            <form onSubmit={handleAddTable} className="admin-form">
              <div>
                <label>Название зоны *</label>
                <input
                  name="name"
                  value={addForm.name}
                  onChange={handleFormChange}
                  placeholder="Например: Зона 23"
                  required
                />
              </div>
              
              <div>
                <label>Вместимость (человек) *</label>
                <input
                  name="capacity"
                  type="number"
                  min="1"
                  max="20"
                  value={addForm.capacity}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn">Добавить зону</button>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAddingTable(false);
                    setAddForm({ name: '', capacity: 4 });
                  }}
                  className="cancel-btn"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Список зон */}
        <div className="admin-table-list">
          {currentTables.map((table) => (
            <div key={table.id} className="admin-table-card">
              {editingTable?.id === table.id ? (
                // Режим редактирования
                <form onSubmit={handleSaveEdit} className="admin-form">
                  <div>
                    <label>Название зоны *</label>
                    <input
                      name="name"
                      value={editForm.name}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  
                  <div>
                    <label>Вместимость (человек) *</label>
                    <input
                      name="capacity"
                      type="number"
                      min="1"
                      max="20"
                      value={editForm.capacity}
                      onChange={handleFormChange}
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="save-btn">Сохранить</button>
                    <button type="button" onClick={handleCancelEdit} className="cancel-btn">
                      Отмена
                    </button>
                  </div>
                </form>
              ) : (
                // Режим просмотра
                <div className="table-info">
                  <div className="table-details">
                    <h4>{table.name}</h4>
                    <p>Вместимость: {table.capacity} чел.</p>
                    <p className="table-id">ID: {table.id}</p>
                  </div>
                  <div className="table-actions">
                    <button 
                      onClick={() => handleEditTable(table)}
                      className="edit-btn"
                    >
                      ✏️ Редактировать
                    </button>
                    <button 
                      onClick={() => handleDeleteTable(table.id)}
                      className="delete-btn"
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {currentTables.length === 0 && (
          <div className="no-tables">
            <p>В филиале "{currentBranch}" пока нет зон.</p>
            <p>Добавьте первую зону, нажав кнопку "Добавить новую зону".</p>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel; 
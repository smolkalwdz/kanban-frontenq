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

interface Staff {
  id: string;
  name: string;
  telegramId: string;
}

interface Task {
  id: string;
  title: string;
  message: string;
  scheduledTime: string; // ISO строка времени
  branch: 'МСК' | 'Полевая';
  isRecurring: boolean; // Регулярная задача
  isSent: boolean;
  lastSentDate?: string; // Дата последней отправки (для регулярных задач)
  createdAt: string;
}

interface AdminPanelProps {
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  // Отладка API URL
  console.log('🔍 AdminPanel API_URL:', API_URL);
  
  // Переопределение времени приложения (для тестов): читаем из localStorage
  const getNow = () => {
    const override = localStorage.getItem('appTimeOverride');
    if (override) {
      const parsed = new Date(override);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  };
  
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
  
  // Состояние для вкладок
  const [activeView, setActiveView] = useState<'zones' | 'control' | 'staff' | 'tasks'>('zones');
  const [sendingZoneId, setSendingZoneId] = useState<number | null>(null);
  
  // Состояния для сотрудников
  const [staff, setStaff] = useState<Staff[]>([]);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffForm, setStaffForm] = useState({ name: '', telegramId: '' });
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  
  // Состояния для задач
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskForm, setTaskForm] = useState({ 
    title: '', 
    message: '', 
    scheduledTime: '',
    branch: 'МСК' as 'МСК' | 'Полевая',
    isRecurring: false
  });
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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

  // Загрузка сотрудников
  const loadStaff = async () => {
    try {
      const response = await fetch(`${API_URL}/api/staff`);
      const data = await response.json();
      setStaff(data);
    } catch (error) {
      console.error('Error loading staff:', error);
    }
  };

  // Загрузка задач
  const loadTasks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tasks`);
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  // Загрузка данных при монтировании
  useEffect(() => {
    loadTables();
    loadBookings();
    loadStaff();
    loadTasks();
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

  // ========== ФУНКЦИИ ДЛЯ РАБОТЫ С СОТРУДНИКАМИ ==========

  // Добавление сотрудника
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!staffForm.name.trim()) {
      alert('Введите имя и фамилию');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm)
      });

      if (response.ok) {
        await loadStaff();
        setStaffForm({ name: '', telegramId: '' });
        setIsAddingStaff(false);
        alert('✅ Сотрудник добавлен');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error adding staff:', error);
      alert('Ошибка при добавлении сотрудника');
    }
  };

  // Редактирование сотрудника
  const handleEditStaff = (employee: Staff) => {
    setEditingStaff(employee);
    setStaffForm({ name: employee.name, telegramId: employee.telegramId });
  };

  // Сохранение изменений сотрудника
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingStaff || !staffForm.name.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/staff/${editingStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm)
      });

      if (response.ok) {
        await loadStaff();
        setEditingStaff(null);
        setStaffForm({ name: '', telegramId: '' });
        alert('✅ Сотрудник обновлён');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      alert('Ошибка при обновлении сотрудника');
    }
  };

  // Удаление сотрудника
  const handleDeleteStaff = async (id: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого сотрудника?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/staff/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadStaff();
        alert('🗑️ Сотрудник удалён');
      } else {
        alert('Ошибка при удалении сотрудника');
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Ошибка при удалении сотрудника');
    }
  };

  // Отмена редактирования
  const handleCancelStaffEdit = () => {
    setEditingStaff(null);
    setStaffForm({ name: '', telegramId: '' });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (editingTable) {
      setEditForm(prev => ({ ...prev, [name]: name === 'capacity' ? Number(value) : value }));
    } else {
      setAddForm(prev => ({ ...prev, [name]: name === 'capacity' ? Number(value) : value }));
    }
  };

  // Изменение филиала с сохранением
  const changeBranch = (branch: 'МСК' | 'Полевая') => {
    setCurrentBranch(branch);
    localStorage.setItem('adminBranch', branch);
  };

  // Отправка уведомления сотрудникам на смене (персонально)
  const handleNotifyDirtyZone = async (table: Table) => {
    setSendingZoneId(table.id);
    try {
      // Проверяем тестовое время из localStorage
      const testTimeOverride = localStorage.getItem('appTimeOverride');
      
      const payload: any = {
        branch: table.branch,
        zoneName: table.name
      };
      
      // Если установлено тестовое время - передаём его backend
      if (testTimeOverride) {
        payload.testDate = testTimeOverride;
        console.log(`🧪 Отправка уведомления с тестовым временем: ${new Date(testTimeOverride).toLocaleString('ru-RU')}`);
      }
      
      const response = await fetch(`${API_URL}/api/telegram/notify-staff-on-shift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Уведомление отправлено сотрудникам на смене!\n${result.message}`);
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

  return (
    <div>
      {/* Заголовок */}
      <div className="header">
        <div>
          <h1>⚙️ Админ панель - {activeView === 'zones' ? 'Управление зонами' : activeView === 'staff' ? 'Сотрудники' : activeView === 'tasks' ? 'Задачи' : 'Контроль порядка'}</h1>
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
          <button 
            onClick={() => setActiveView('staff')}
            className={activeView === 'staff' ? 'active' : ''}
          >
            👥 Сотрудники
          </button>
          <button 
            onClick={() => setActiveView('tasks')}
            className={activeView === 'tasks' ? 'active' : ''}
          >
            📋 Задачи
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
              {localStorage.getItem('appTimeOverride') && (
                <span 
                  className="stat-item" 
                  title={`Тестовое время: ${new Date(localStorage.getItem('appTimeOverride') || '').toLocaleString('ru-RU')}`}
                  style={{ 
                    background: '#fde68a', 
                    color: '#92400e', 
                    padding: '4px 8px', 
                    borderRadius: '6px',
                    fontWeight: '600'
                  }}
                >
                  🧪 Тест-режим: {new Date(localStorage.getItem('appTimeOverride') || '').toLocaleDateString('ru-RU')}
                </span>
              )}
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
            {/* Информация о системе уведомлений */}
            <div className="admin-form-card">
              <h3>💡 Как работает система уведомлений</h3>
              <div style={{ 
                padding: '15px', 
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '10px',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151', fontSize: '14px', lineHeight: '1.8' }}>
                  <li><strong>Персональные уведомления:</strong> сообщения отправляются ЛИЧНО сотрудникам на смене</li>
                  <li><strong>Автоматическое определение:</strong> система сама определяет кто на смене из Google Sheets</li>
                  <li><strong>База сотрудников:</strong> Telegram ID берутся из вкладки "Сотрудники"</li>
                  <li><strong>Требования:</strong> сотрудник должен написать /start боту в Telegram</li>
                </ul>
              </div>
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

        {/* Тестовый таймер курения */}
        <div className="admin-form-card">
          <h3>🚬 Тестовый таймер "МНЕ ТОЛЬКО ПОКУРИТЬ"</h3>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#6b7280' }}>
            Для тестирования уведомлений. В тест-режиме таймер составит <strong>30 секунд</strong> вместо 90 минут.
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('smokingTimerTestMode', 'true');
                alert('✅ Тест-режим таймера ВКЛЮЧЕН!\n\nТеперь "МНЕ ТОЛЬКО ПОКУРИТЬ" = 30 секунд\n(вместо 90 минут)');
              }}
              style={{
                background: localStorage.getItem('smokingTimerTestMode') === 'true' 
                  ? 'linear-gradient(135deg, #10b981, #34d399)' 
                  : 'linear-gradient(135deg, #6b7280, #9ca3af)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              {localStorage.getItem('smokingTimerTestMode') === 'true' ? '✅ Включен (30 сек)' : '🔄 Включить'}
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('smokingTimerTestMode');
                alert('❌ Тест-режим таймера ВЫКЛЮЧЕН!\n\nТеперь "МНЕ ТОЛЬКО ПОКУРИТЬ" = 90 минут\n(стандартный режим)');
              }}
              style={{
                background: 'linear-gradient(135deg, #ef4444, #f87171)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              ❌ Выключить
            </button>
          </div>
          {localStorage.getItem('smokingTimerTestMode') === 'true' && (
            <div style={{ 
              marginTop: '15px', 
              padding: '12px', 
              background: 'rgba(16, 185, 129, 0.1)',
              border: '2px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              color: '#065f46',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              ⚡ АКТИВЕН: Таймер = 30 секунд (для тестирования)
            </div>
          )}
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

      {/* ========== ВКЛАДКА: СОТРУДНИКИ ========== */}
      {activeView === 'staff' && (
        <div className="staff-container">
          <div className="admin-form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>👥 Список сотрудников</h3>
              <button 
                onClick={() => {
                  setIsAddingStaff(true);
                  setStaffForm({ name: '', telegramId: '' });
                }}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #34d399)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                ➕ Добавить сотрудника
              </button>
            </div>

            {/* Форма добавления сотрудника */}
            {isAddingStaff && (
              <div style={{ 
                background: 'rgba(16, 185, 129, 0.1)', 
                padding: '20px', 
                borderRadius: '12px',
                marginBottom: '20px',
                border: '2px solid rgba(16, 185, 129, 0.3)'
              }}>
                <h4 style={{ marginTop: 0 }}>Добавить нового сотрудника</h4>
                <form onSubmit={handleAddStaff}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                        Имя и Фамилия (как в отчете) *
                      </label>
                      <input
                        type="text"
                        value={staffForm.name}
                        onChange={(e) => setStaffForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Например: Арсений Орехов"
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                        Telegram ID
                      </label>
                      <input
                        type="text"
                        value={staffForm.telegramId}
                        onChange={(e) => setStaffForm(prev => ({ ...prev, telegramId: e.target.value }))}
                        placeholder="Например: 123456789"
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                          fontSize: '14px'
                        }}
                      />
                      <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                        Для получения ID: @userinfobot в Telegram
                      </small>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        type="submit"
                        style={{
                          background: 'linear-gradient(135deg, #10b981, #34d399)',
                          color: 'white',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        ✅ Сохранить
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setIsAddingStaff(false);
                          setStaffForm({ name: '', telegramId: '' });
                        }}
                        style={{
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        ❌ Отмена
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Список сотрудников */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {staff.length === 0 ? (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center', 
                  background: 'rgba(107, 114, 128, 0.1)',
                  borderRadius: '12px',
                  color: '#666'
                }}>
                  <p style={{ fontSize: '18px', marginBottom: '10px' }}>📋 Список сотрудников пуст</p>
                  <p style={{ fontSize: '14px' }}>Добавьте первого сотрудника, нажав кнопку выше</p>
                </div>
              ) : (
                staff.map((employee) => (
                  <div 
                    key={employee.id}
                    style={{
                      background: 'white',
                      padding: '15px',
                      borderRadius: '10px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    {editingStaff?.id === employee.id ? (
                      // Режим редактирования
                      <form onSubmit={handleSaveStaff}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <input
                            type="text"
                            value={staffForm.name}
                            onChange={(e) => setStaffForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Имя и Фамилия"
                            required
                            style={{
                              padding: '8px',
                              borderRadius: '6px',
                              border: '1px solid #ccc',
                              fontSize: '14px'
                            }}
                          />
                          <input
                            type="text"
                            value={staffForm.telegramId}
                            onChange={(e) => setStaffForm(prev => ({ ...prev, telegramId: e.target.value }))}
                            placeholder="Telegram ID"
                            style={{
                              padding: '8px',
                              borderRadius: '6px',
                              border: '1px solid #ccc',
                              fontSize: '14px'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              type="submit"
                              style={{
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px'
                              }}
                            >
                              ✅ Сохранить
                            </button>
                            <button 
                              type="button"
                              onClick={handleCancelStaffEdit}
                              style={{
                                background: '#6b7280',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px'
                              }}
                            >
                              ❌ Отмена
                            </button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      // Режим просмотра
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#1f2937' }}>
                            {employee.name}
                          </h4>
                          <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                            {employee.telegramId ? (
                              <>📱 Telegram ID: <strong>{employee.telegramId}</strong></>
                            ) : (
                              <span style={{ color: '#ef4444' }}>⚠️ Telegram ID не указан</span>
                            )}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleEditStaff(employee)}
                            style={{
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '600'
                            }}
                          >
                            ✏️ Редактировать
                          </button>
                          <button 
                            onClick={() => handleDeleteStaff(employee.id)}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '600'
                            }}
                          >
                            🗑️ Удалить
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Подсказка */}
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '10px',
              border: '1px solid rgba(59, 130, 246, 0.3)'
            }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: '600', color: '#1e40af' }}>
                💡 Как это работает:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#374151', fontSize: '14px' }}>
                <li>Имя должно ТОЧНО совпадать с именем в Google Sheets (Отчет)</li>
                <li>Telegram ID можно получить у бота @userinfobot</li>
                <li>Уведомления будут отправляться только сотрудникам на смене</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========== ВКЛАДКА: ЗАДАЧИ ========== */}
      {activeView === 'tasks' && (
        <div className="tasks-container">
          <div className="admin-form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>📋 Управление задачами</h3>
              <button 
                onClick={() => {
                  setIsAddingTask(true);
                  setTaskForm({ title: '', message: '', scheduledTime: '', branch: 'МСК', isRecurring: false });
                }}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #34d399)',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px'
                }}
              >
                ➕ Добавить задачу
              </button>
            </div>

            {/* Форма добавления/редактирования задачи */}
            {(isAddingTask || editingTask) && (
              <div style={{ 
                background: 'rgba(16, 185, 129, 0.1)', 
                padding: '20px', 
                borderRadius: '12px',
                marginBottom: '20px',
                border: '2px solid rgba(16, 185, 129, 0.3)'
              }}>
                <h4 style={{ marginTop: 0 }}>{editingTask ? 'Редактировать задачу' : 'Добавить новую задачу'}</h4>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!taskForm.title.trim() || !taskForm.message.trim() || !taskForm.scheduledTime) {
                    alert('Заполните все обязательные поля');
                    return;
                  }

                  try {
                    // Парсим время из формы (HH:MM)
                    const [hours, minutes] = taskForm.scheduledTime.split(':');
                    let scheduledTimeValue;
                    
                    if (taskForm.isRecurring) {
                      // Для регулярных задач сохраняем только время (HH:MM)
                      scheduledTimeValue = taskForm.scheduledTime;
                    } else {
                      // Для единоразовых задач сохраняем полную дату и время
                      const now = getNow();
                      const scheduledDate = new Date(now);
                      scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                      
                      // Если время уже прошло сегодня, ставим на завтра
                      if (scheduledDate <= now) {
                        scheduledDate.setDate(scheduledDate.getDate() + 1);
                      }
                      scheduledTimeValue = scheduledDate.toISOString();
                    }

                    const taskData = {
                      title: taskForm.title.trim(),
                      message: taskForm.message.trim(),
                      scheduledTime: scheduledTimeValue,
                      branch: taskForm.branch,
                      isRecurring: taskForm.isRecurring
                    };

                    if (editingTask) {
                      const response = await fetch(`${API_URL}/api/tasks/${editingTask.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(taskData)
                      });
                      if (response.ok) {
                        await loadTasks();
                        setEditingTask(null);
                        setTaskForm({ title: '', message: '', scheduledTime: '', branch: 'МСК', isRecurring: false });
                        alert('✅ Задача обновлена');
                      }
                    } else {
                      const response = await fetch(`${API_URL}/api/tasks`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(taskData)
                      });
                      if (response.ok) {
                        await loadTasks();
                        setIsAddingTask(false);
                        setTaskForm({ title: '', message: '', scheduledTime: '', branch: 'МСК', isRecurring: false });
                        alert('✅ Задача создана');
                      }
                    }
                  } catch (error) {
                    console.error('Error saving task:', error);
                    alert('Ошибка при сохранении задачи');
                  }
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                        Название задачи *
                      </label>
                      <input
                        type="text"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                        Текст сообщения (будет отправлено в Telegram) *
                      </label>
                      <textarea
                        value={taskForm.message}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Текст, который придет сотрудникам на смене"
                        required
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                          fontSize: '14px',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                        Время отправки (локальное время) *
                      </label>
                      <input
                        type="time"
                        value={taskForm.scheduledTime}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, scheduledTime: e.target.value }))}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #ccc',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                        Филиал *
                      </label>
                      <div className="branch-selector">
                        <button 
                          type="button"
                          onClick={() => setTaskForm(prev => ({ ...prev, branch: 'МСК' }))}
                          className={`branch-btn ${taskForm.branch === 'МСК' ? 'active' : ''}`}
                        >
                          🏢 МСК
                        </button>
                        <button 
                          type="button"
                          onClick={() => setTaskForm(prev => ({ ...prev, branch: 'Полевая' }))}
                          className={`branch-btn ${taskForm.branch === 'Полевая' ? 'active' : ''}`}
                        >
                          🏪 Полевая
                        </button>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                        Тип задачи *
                      </label>
                      <div className="branch-selector">
                        <button 
                          type="button"
                          onClick={() => setTaskForm(prev => ({ ...prev, isRecurring: false }))}
                          className={`branch-btn ${!taskForm.isRecurring ? 'active' : ''}`}
                        >
                          📌 Единоразовая
                        </button>
                        <button 
                          type="button"
                          onClick={() => setTaskForm(prev => ({ ...prev, isRecurring: true }))}
                          className={`branch-btn ${taskForm.isRecurring ? 'active' : ''}`}
                        >
                          🔁 Регулярная
                        </button>
                      </div>
                      <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                        {taskForm.isRecurring 
                          ? 'Регулярная: отправляется каждый день в указанное время' 
                          : 'Единоразовая: отправляется один раз в указанное время'}
                      </small>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        type="submit"
                        style={{
                          background: 'linear-gradient(135deg, #10b981, #34d399)',
                          color: 'white',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        ✅ Сохранить
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setIsAddingTask(false);
                          setEditingTask(null);
                          setTaskForm({ title: '', message: '', scheduledTime: '', branch: 'МСК', isRecurring: false });
                        }}
                        style={{
                          background: '#6b7280',
                          color: 'white',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        ❌ Отмена
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Список задач */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tasks.length === 0 ? (
                <div style={{ 
                  padding: '40px', 
                  textAlign: 'center', 
                  background: 'rgba(107, 114, 128, 0.1)',
                  borderRadius: '12px',
                  color: '#666'
                }}>
                  <p style={{ fontSize: '18px', marginBottom: '10px' }}>📋 Список задач пуст</p>
                  <p style={{ fontSize: '14px' }}>Добавьте первую задачу, нажав кнопку выше</p>
                </div>
              ) : (
                tasks
                  .sort((a, b) => {
                    // Для сортировки: регулярные задачи по времени, единоразовые по дате
                    if (a.isRecurring && b.isRecurring) {
                      // Обе регулярные - сортируем по времени
                      return a.scheduledTime.localeCompare(b.scheduledTime);
                    } else if (a.isRecurring) {
                      return -1; // Регулярные вверх
                    } else if (b.isRecurring) {
                      return 1;
                    } else {
                      // Обе единоразовые - сортируем по дате
                      return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
                    }
                  })
                  .map((task) => {
                    // Для регулярных задач scheduledTime - это строка "HH:MM", для единоразовых - ISO дата
                    const scheduledDate = task.isRecurring 
                      ? null 
                      : new Date(task.scheduledTime);
                    const now = getNow();
                    const isPast = !task.isRecurring && scheduledDate && scheduledDate <= now;
                    
                    return (
                      <div 
                        key={task.id}
                        style={{
                          background: task.isSent ? 'rgba(107, 114, 128, 0.2)' : 'white',
                          padding: '15px',
                          borderRadius: '10px',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                          opacity: task.isSent ? 0.6 : 1
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#1f2937' }}>
                              {task.title}
                              {task.isSent && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#6b7280' }}>✅ Отправлено</span>}
                            </h4>
                            <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap' }}>
                              {task.message}
                            </p>
                            <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#6b7280', flexWrap: 'wrap' }}>
                              <span>🏢 {task.branch}</span>
                              <span>{task.isRecurring ? '🔁 Регулярная' : '📌 Единоразовая'}</span>
                              <span>⏰ {
                                task.isRecurring 
                                  ? task.scheduledTime // Для регулярных показываем только время "HH:MM"
                                  : scheduledDate ? scheduledDate.toLocaleString('ru-RU', { 
                                      day: '2-digit', 
                                      month: '2-digit', 
                                      year: 'numeric',
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    }) : task.scheduledTime
                              }</span>
                              {isPast && !task.isSent && !task.isRecurring && (
                                <span style={{ color: '#ef4444', fontWeight: '600' }}>⚠️ Просрочено</span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {(!task.isSent || task.isRecurring) && (
                              <>
                                <button 
                                  onClick={() => {
                                    setEditingTask(task);
                                    let timeStr;
                                    if (task.isRecurring) {
                                      // Для регулярных задач время уже в формате "HH:MM"
                                      timeStr = task.scheduledTime;
                                    } else {
                                      // Для единоразовых задач парсим из ISO даты
                                      const date = new Date(task.scheduledTime);
                                      const hours = date.getHours();
                                      const minutes = date.getMinutes();
                                      timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                                    }
                                    setTaskForm({ 
                                      title: task.title, 
                                      message: task.message, 
                                      scheduledTime: timeStr,
                                      branch: task.branch,
                                      isRecurring: task.isRecurring || false
                                    });
                                    setIsAddingTask(false);
                                  }}
                                  style={{
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '600'
                                  }}
                                >
                                  ✏️ Редактировать
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (!window.confirm('Вы уверены, что хотите удалить эту задачу?')) return;
                                    try {
                                      const response = await fetch(`${API_URL}/api/tasks/${task.id}`, {
                                        method: 'DELETE'
                                      });
                                      if (response.ok) {
                                        await loadTasks();
                                        alert('🗑️ Задача удалена');
                                      }
                                    } catch (error) {
                                      console.error('Error deleting task:', error);
                                      alert('Ошибка при удалении задачи');
                                    }
                                  }}
                                  style={{
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '600'
                                  }}
                                >
                                  🗑️ Удалить
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminPanel; 
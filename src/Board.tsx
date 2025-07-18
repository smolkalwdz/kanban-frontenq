import React, { useState, useEffect, useMemo } from 'react';

const SOURCES = ['Лично', 'Звонок', 'Онлайн'] as const;
type SourceType = typeof SOURCES[number];

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
  source: SourceType;
  tableId: number;
  branch: string;
  isActive: boolean;
  comment?: string;
  hasVR?: boolean;
  hasShisha?: boolean;
}

// URL backend-сервера (меняйте на свой при деплое)
const API_URL = process.env.REACT_APP_API_URL || 'https://smolkalwdz-kanban-backend-3d00.twc1.net';

interface BoardProps {
  onOpenAdmin: () => void;
}

const Board: React.FC<BoardProps> = ({ onOpenAdmin }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentBranch, setCurrentBranch] = useState<'МСК' | 'Полевая'>('МСК');
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    time: string;
    tableId: number;
    guests: number;
    phone: string;
    source: SourceType;
    comment: string;
    hasVR: boolean;
    hasShisha: boolean;
  }>({
    name: '',
    time: '',
    tableId: 1,
    guests: 1,
    phone: '',
    source: SOURCES[0],
    comment: '',
    hasVR: false,
    hasShisha: false,
  });
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);
  
  // Состояние для редактирования брони
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    time: string;
    guests: number;
    phone: string;
    source: SourceType;
    comment: string;
    hasVR: boolean;
    hasShisha: boolean;
  }>({
    name: '',
    time: '',
    guests: 1,
    phone: '',
    source: SOURCES[0],
    comment: '',
    hasVR: false,
    hasShisha: false,
  });

  // Полностью отключаем любое вмешательство в работу браузера
  useEffect(() => {
    // Ничего не делаем, пусть браузер работает естественно
    return () => {};
  }, []);

  // Получаем столы текущего филиала и сортируем по имени
  const currentTables = tables
    .filter(table => table.branch === currentBranch)
    .sort((a, b) => {
      // Сортируем по имени зоны (Зона 1, Зона 2, и т.д.)
      const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

  // Создание начальных зон, если backend пустой
  const createInitialZones = async () => {
    // МСК - 22 зоны
    for (let i = 1; i <= 22; i++) {
      const newTable = {
        name: `Зона ${i}`,
        capacity: 4,
        branch: 'МСК',
      };
      await fetch(`${API_URL}/api/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTable),
      });
    }
    
    // Полевая - 20 зон
    for (let i = 1; i <= 20; i++) {
      const newTable = {
        name: `Зона ${i}`,
        capacity: 4,
        branch: 'Полевая',
      };
      await fetch(`${API_URL}/api/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTable),
      });
    }
  };

  // Функция загрузки данных (выносим отдельно для переиспользования)
  const loadData = async (showLogs = true) => {
    try {
      if (showLogs) console.log('🔄 Loading zones...');
      const zonesRes = await fetch(`${API_URL}/api/zones`);
      const zonesData = await zonesRes.json();
      if (showLogs) console.log('📦 Zones loaded:', zonesData.length);
      
      if (zonesData.length === 0) {
        console.log('No zones found, creating initial zones...');
        await createInitialZones();
        const newRes = await fetch(`${API_URL}/api/zones`);
        const newData = await newRes.json();
        setTables(newData);
      } else {
        setTables(zonesData);
      }
      
      if (showLogs) console.log('🔄 Loading bookings...');
      const bookingsRes = await fetch(`${API_URL}/api/bookings`);
      const bookingsData = await bookingsRes.json();
      if (showLogs) console.log('📦 Bookings loaded:', bookingsData.length);
      
      setBookings(
        bookingsData.map((b: any) => ({
          ...b,
          tableId: Number(b.tableId)
        }))
      );
      
      // Обновляем время последнего обновления
      setLastUpdate(new Date());
    } catch (error) {
      console.error('❌ Error loading data:', error);
      // Устанавливаем пустые данные при ошибке
      setTables([]);
      setBookings([]);
    }
  };

  // Загрузка зон и бронирований при инициализации
  useEffect(() => {
    loadData(true);
  }, []);

  // Автоматическое обновление данных каждые 5 секунд
  useEffect(() => {
    if (!isAutoRefreshEnabled) return;
    
    const interval = setInterval(() => {
      loadData(false); // Без логов для автоматического обновления
    }, 5000); // 5 секунд

    return () => clearInterval(interval); // Очищаем интервал при размонтировании
  }, [isAutoRefreshEnabled]);

  // useEffect для обновления tableId ТОЛЬКО при смене филиала
  useEffect(() => {
    if (currentTables.length > 0) {
      setForm((prev) => {
        // Проверяем, есть ли текущий tableId в списке доступных зон ТЕКУЩЕГО филиала
        const currentTableExists = currentTables.some(table => table.id === prev.tableId);
        
        // Обновляем tableId только если текущая зона недоступна в новом филиале
        if (!currentTableExists) {
          console.log('🔄 Switching branch, updating tableId from', prev.tableId, 'to', currentTables[0]?.id);
          return {
            ...prev,
            tableId: currentTables[0]?.id || 1
          };
        }
        
        return prev; // Не изменяем, если зона существует
      });
    }
  }, [currentBranch]); // Убираем currentTables из зависимостей!

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (name === 'tableId') {
      console.log('🎯 User selected zone:', value, 'for branch:', currentBranch);
    }
    
    setForm((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : (name === 'guests' || name === 'tableId' ? Number(value) : value)
    }));
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setEditForm((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : (name === 'guests' ? Number(value) : value)
    }));
  };

  // Добавление бронирования
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.time.trim() || !form.tableId || !form.guests || !form.source) return;
    
    console.log('🎯 Creating new booking for table:', form.tableId, 'in branch:', currentBranch);
    
    const newBooking: Omit<Booking, 'id'> = {
      name: form.name.trim(),
      time: form.time.trim(),
      tableId: Number(form.tableId),
      guests: form.guests,
      phone: form.phone.trim(),
      source: form.source as SourceType,
      branch: currentBranch,
      isActive: false,
      comment: form.comment.trim(),
      hasVR: form.hasVR,
      hasShisha: form.hasShisha,
    };
    
    console.log('📤 Sending new booking data:', newBooking);
    
    try {
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking),
      });
      
      if (response.ok) {
        const createdBooking = await response.json();
        console.log('✅ Booking created successfully:', createdBooking);
        
        // Обновляем список броней
        const bookingsRes = await fetch(`${API_URL}/api/bookings`);
        const bookingsData = await bookingsRes.json();
        setBookings(
          bookingsData.map((b: any) => ({
            ...b,
            tableId: Number(b.tableId)
          }))
        );
        
        // Очищаем форму, но сохраняем выбранную зону
        setForm(prev => ({ 
          name: '', 
          time: '', 
          tableId: prev.tableId, // Сохраняем выбранную зону
          guests: 1, 
          phone: '', 
          source: SOURCES[0], 
          comment: '', 
          hasVR: false, 
          hasShisha: false 
        }));
      } else {
        console.error('❌ Failed to create booking:', response.status);
        alert('Ошибка при создании брони');
      }
    } catch (error) {
      console.error('❌ Error creating booking:', error);
      alert('Ошибка сети при создании брони');
    }
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setEditForm({
      name: booking.name,
      time: booking.time,
      guests: booking.guests,
      phone: booking.phone,
      source: booking.source as SourceType,
      comment: booking.comment || '',
      hasVR: booking.hasVR || false,
      hasShisha: booking.hasShisha || false,
    });
  };

  // Редактирование бронирования
  const handleSaveBookingEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking || !editForm.name.trim() || !editForm.time.trim() || !editForm.guests || !editForm.source) return;
    const res = await fetch(`${API_URL}/api/bookings/${editingBooking.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name.trim(),
        time: editForm.time.trim(),
        guests: editForm.guests,
        phone: editForm.phone.trim(),
        source: editForm.source as SourceType,
        comment: editForm.comment.trim(),
        hasVR: editForm.hasVR,
        hasShisha: editForm.hasShisha,
      }),
    });
    const updated = await res.json();
    setBookings(prev => prev.map(b => b.id === editingBooking.id ? { ...updated, isActive: b.isActive } : b));
    setEditingBooking(null);
    setEditForm({ name: '', time: '', guests: 1, phone: '', source: SOURCES[0], comment: '', hasVR: false, hasShisha: false });
  };

  const handleCancelBookingEdit = () => {
    setEditingBooking(null);
    setEditForm({ name: '', time: '', guests: 1, phone: '', source: SOURCES[0], comment: '', hasVR: false, hasShisha: false });
  };

  const handleToggleActive = async (booking: Booking) => {
    await fetch(`${API_URL}/api/bookings/${booking.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...booking, isActive: !booking.isActive }),
    });
    fetch(`${API_URL}/api/bookings`)
      .then(res => res.json())
      .then(data => setBookings(
        data.map((b: any) => ({
          ...b,
          tableId: Number(b.tableId)
        }))
      ));
  };

  const handleDragStart = (booking: Booking) => setDraggedBooking(booking);
  
  const handleDrop = async (tableId: number) => {
    if (draggedBooking) {
      console.log('🎯 Dropping booking:', draggedBooking.id, 'from table:', draggedBooking.tableId, 'to table:', tableId);
      
      // Сначала сохраняем на сервер, потом обновляем локальное состояние
      try {
        console.log('📡 Sending update to server...');
        const updatedBooking = { ...draggedBooking, tableId };
        console.log('📤 Sending data:', updatedBooking);
        
        const response = await fetch(`${API_URL}/api/bookings/${draggedBooking.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedBooking),
        });
        
        if (response.ok) {
          const serverResponse = await response.json();
          console.log('✅ Server update successful, response:', serverResponse);
          
          // Обновляем локальное состояние только после успешного сохранения на сервер
          setBookings((prev) =>
            prev.map((b) => (b.id === draggedBooking.id ? { ...b, tableId } : b))
          );
        } else {
          const errorText = await response.text();
          console.error('❌ Server update failed:', response.status, errorText);
          alert('Ошибка при сохранении на сервере: ' + response.status);
        }
      } catch (error) {
        console.error('❌ Error updating booking on server:', error);
        alert('Ошибка сети при сохранении изменений');
      }
      
      setDraggedBooking(null);
    }
  };

  // Удаление бронирования
  const handleDelete = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту бронь?')) {
      await fetch(`${API_URL}/api/bookings/${id}`, { method: 'DELETE' });
      setBookings(prev => prev.filter(b => b.id !== id));
    }
  };

  // Получаем брони для текущего филиала
  const currentBookings = bookings.filter(booking => booking.branch === currentBranch);

  // Подсчёт активных и ожидающих бронирований
  const activeCount = bookings.filter(b => b.branch === currentBranch && b.isActive).length;
  const waitingCount = bookings.filter(b => b.branch === currentBranch && !b.isActive).length;

  // Модальное окно редактирования брони - мемоизированное для предотвращения потери фокуса
  const EditBookingModal = useMemo(() => {
    if (!editingBooking) return null;
    
    return (
      <div className="modal" key="edit-booking-modal">
        <div className="modal-content">
          <h3>Редактировать бронь</h3>
          <form onSubmit={handleSaveBookingEdit} className="booking-form">
            <div>
              <label>Имя *</label>
              <input
                name="name"
                value={editForm.name}
                onChange={handleEditFormChange}
                required
              />
            </div>
            
            <div>
              <label>Время *</label>
              <input
                name="time"
                type="time"
                value={editForm.time}
                onChange={handleEditFormChange}
                required
              />
            </div>

            <div>
              <label>Количество гостей *</label>
              <input
                name="guests"
                type="number"
                value={editForm.guests}
                onChange={handleEditFormChange}
                required
              />
            </div>

            <div>
              <label>Номер телефона</label>
              <input
                name="phone"
                type="tel"
                value={editForm.phone}
                onChange={handleEditFormChange}
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div>
              <label>Комментарий</label>
              <textarea
                name="comment"
                value={editForm.comment}
                onChange={handleEditFormChange}
                placeholder="Дополнительная информация"
                rows={2}
              />
            </div>

            <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px'}}>
                <input
                  name="hasVR"
                  type="checkbox"
                  checked={editForm.hasVR}
                  onChange={handleEditFormChange}
                />
                VR
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px'}}>
                <input
                  name="hasShisha"
                  type="checkbox"
                  checked={editForm.hasShisha}
                  onChange={handleEditFormChange}
                />
                Кальян
              </label>
            </div>

            <div>
              <label>Источник *</label>
              <select
                name="source"
                value={editForm.source}
                onChange={handleEditFormChange}
                required
              >
                {SOURCES.map((src) => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>

            <div>
              <button type="submit">Сохранить</button>
              <button type="button" onClick={handleCancelBookingEdit}>Отмена</button>
            </div>
          </form>
        </div>
      </div>
    );
  }, [editingBooking, editForm, handleEditFormChange, handleSaveBookingEdit, handleCancelBookingEdit]);

  // Обработчики для кнопок карточек
  const toggleActiveHandler = (booking: Booking) => () => handleToggleActive(booking);
  const editBookingHandler = (booking: Booking) => () => handleEditBooking(booking);
  const deleteBookingHandler = (id: string) => () => handleDelete(id);

  // Простая функция удаления зоны
  const handleSimpleDeleteTable = async (tableId: number) => {
    console.log('Deleting table:', tableId);
    try {
      await fetch(`${API_URL}/api/zones/${tableId}`, { method: 'DELETE' });
      setTables(prev => prev.filter(t => t.id !== tableId));
      setBookings(prev => prev.filter(b => b.tableId !== tableId));
      alert('Зона удалена!');
    } catch (error) {
      console.error('Error deleting table:', error);
      alert('Ошибка при удалении зоны');
    }
  };

  return (
    <div>
      {/* Заголовок с переключателем филиалов */}
      <div className="header">
        <div>
          <h1>Канбан-доска броней</h1>
          <div className="header-controls">
            <button onClick={onOpenAdmin} className="admin-btn">
              ⚙️ Админ панель
            </button>
            <button 
              onClick={() => setIsMobileView(!isMobileView)} 
              className={`mobile-toggle ${isMobileView ? 'active' : ''}`}
            >
              {isMobileView ? '💻 Версия ПК' : '📱 Мобильная версия'}
            </button>
          </div>
        </div>
        <div className="header-btns">
          <button 
            onClick={() => setCurrentBranch('МСК')}
            className={currentBranch === 'МСК' ? 'active' : ''}
          >
            🏢 МСК ({tables.filter(t => t.branch === 'МСК').length})
          </button>
          <button 
            onClick={() => setCurrentBranch('Полевая')}
            className={currentBranch === 'Полевая' ? 'active' : ''}
          >
            🏪 Полевая ({tables.filter(t => t.branch === 'Полевая').length})
          </button>
        </div>
      </div>

      {/* Информация о текущем филиале */}
      <div className="info-bar">
        <div>
          <h2>{currentBranch}</h2>
          <div className="booking-stats">
            <span className="stat-item active">
              <span className="stat-dot green"></span>
              Активных: {activeCount}
            </span>
            <span className="stat-item waiting">
              <span className="stat-dot red"></span>
              Ожидают: {waitingCount}
            </span>
            <span className="stat-item total">
              Всего зон: {currentTables.length}
            </span>
          </div>
          
          {/* Контроллы автообновления */}
          <div className="auto-refresh-controls">
            <button 
              onClick={() => setIsAutoRefreshEnabled(!isAutoRefreshEnabled)}
              className={`refresh-toggle ${isAutoRefreshEnabled ? 'enabled' : 'disabled'}`}
            >
              {isAutoRefreshEnabled ? '🔄 Автообновление ВКЛ' : '⏸️ Автообновление ВЫКЛ'}
            </button>
            <button 
              onClick={() => loadData(true)}
              className="manual-refresh"
            >
              🔄 Обновить сейчас
            </button>
            {lastUpdate && (
              <span className="last-update">
                Обновлено: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <div className="info-bar-icon">
          {currentBranch === 'МСК' ? '🏢' : '🏪'}
        </div>
      </div>

      {/* Основной контент */}
      <div className={`content ${isMobileView ? 'mobile-view' : ''}`}>
        {/* Левая панель - форма добавления */}
        <div className={`form-panel ${isMobileView ? 'mobile-form' : ''}`}>
          <h3>Добавить бронь</h3>
          <form onSubmit={handleSubmit} className="booking-form">
            <div>
              <label>Имя *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Имя клиента"
                required
              />
            </div>
            
            <div>
              <label>Время *</label>
              <input
                name="time"
                type="time"
                value={form.time}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label>Зона *</label>
              <select
                name="tableId"
                value={form.tableId}
                onChange={handleChange}
                required
              >
                {currentTables.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Количество гостей *</label>
              <input
                name="guests"
                type="number"
                value={form.guests}
                onChange={handleChange}
                placeholder="Количество"
                required
              />
            </div>

            <div>
              <label>Номер телефона</label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div>
              <label>Комментарий</label>
              <textarea
                name="comment"
                value={form.comment}
                onChange={handleChange}
                placeholder="Дополнительная информация"
                rows={2}
              />
            </div>

            <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px'}}>
                <input
                  name="hasVR"
                  type="checkbox"
                  checked={form.hasVR}
                  onChange={handleChange}
                />
                VR
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px'}}>
                <input
                  name="hasShisha"
                  type="checkbox"
                  checked={form.hasShisha}
                  onChange={handleChange}
                />
                Кальян
              </label>
            </div>

            <div>
              <label>Источник *</label>
              <select
                name="source"
                value={form.source}
                onChange={handleChange}
                required
              >
                {SOURCES.map((src) => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>

            <button type="submit">➕ Добавить бронь</button>
          </form>
        </div>

        {/* Правая панель - канбан-доска */}
        <div className={`kanban-area ${isMobileView ? 'mobile-kanban' : ''}`}>
          <div className={`kanban-board-content ${isMobileView ? 'mobile-board' : ''}`}>
            {currentTables.map((table) => (
              <div
                key={table.id}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(table.id)}
                className={`zone-card ${isMobileView ? 'mobile-zone' : ''}`}
              >
                <div className="zone-card-header">{table.name}</div>
                <div className="zone-card-body">
                  {currentBookings.filter(b => String(b.tableId) === String(table.id)).length === 0 && (
                    <div className="no-bookings">Нет броней</div>
                  )}
                  {currentBookings.filter(b => String(b.tableId) === String(table.id)).map((b) => (
                    <div
                      key={b.id}
                      draggable
                      onDragStart={() => handleDragStart(b)}
                      className={`booking-card ${b.isActive ? 'green' : 'red'}`}
                    >
                      <div className="booking-name">{b.name}</div>
                      <div className="booking-time">{b.time}</div>
                      <div className="booking-guests">{b.guests} чел.</div>
                      {b.comment && <div className="booking-comment">💬 {b.comment}</div>}
                      {b.phone && <div className="booking-info">тел. {b.phone}</div>}
                      <div className="booking-info">{b.source}</div>
                      {(b.hasVR || b.hasShisha) && (
                        <div className="booking-services">
                          {b.hasVR && 'VR'} {b.hasShisha && 'Кальян'}
                        </div>
                      )}
                      <div className="booking-actions" onMouseDown={(e) => e.stopPropagation()}>
                        <button type="button" onClick={toggleActiveHandler(b)} className="action-btn status-btn">
                          {b.isActive ? '✅' : '⏱️'}
                        </button>
                        <button type="button" onClick={editBookingHandler(b)} className="action-btn edit-btn">
                          ✏️
                        </button>
                        <button type="button" onClick={deleteBookingHandler(b.id)} className="action-btn delete-btn">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="zone-card-footer">{table.capacity} чел.</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Модальное окно редактирования */}
      {EditBookingModal}
    </div>
  );
};

export default Board; 
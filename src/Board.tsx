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
const API_URL = 'https://smolkalwdz-kanban-backend-3d00.twc1.net';

interface BoardProps {
  onOpenAdmin: () => void;
}

const Board: React.FC<BoardProps> = ({ onOpenAdmin }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentBranch, setCurrentBranch] = useState<'МСК' | 'Полевая'>(() => {
    // Получаем сохраненный филиал из localStorage или используем 'МСК' по умолчанию
    return (localStorage.getItem('currentBranch') as 'МСК' | 'Полевая') || 'МСК';
  });
  const [form, setForm] = useState<{
    name: string;
    time: string;
    tableId: number;
    guests: number;
    phone: string;
    comment: string;
    hasVR: boolean;
    hasShisha: boolean;
  }>(() => {
    // Восстанавливаем данные формы из localStorage
    const savedForm = localStorage.getItem('bookingForm');
    if (savedForm) {
      try {
        const parsed = JSON.parse(savedForm);
        return {
          name: parsed.name || '',
          time: parsed.time || '',
          tableId: parsed.tableId || 1,
          guests: parsed.guests || 1,
          phone: parsed.phone || '',
          comment: parsed.comment || '',
          hasVR: parsed.hasVR || false,
          hasShisha: parsed.hasShisha || false,
        };
      } catch (error) {
        console.error('Error parsing saved form:', error);
      }
    }
    
    return {
      name: '',
      time: '',
      tableId: 1,
      guests: 1,
      phone: '',
      comment: '',
      hasVR: false,
      hasShisha: false,
    };
  });
  const [draggedBooking, setDraggedBooking] = useState<Booking | null>(null);

  // Состояние для редактирования брони
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  // Состояние для автообновления
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [editForm, setEditForm] = useState<{
    name: string;
    time: string;
    guests: number;
    phone: string;
    comment: string;
    hasVR: boolean;
    hasShisha: boolean;
  }>({
    name: '',
    time: '',
    guests: 1,
    phone: '',
    comment: '',
    hasVR: false,
    hasShisha: false,
  });

  // Полностью отключаем любое вмешательство в работу браузера
  useEffect(() => {
    // Ничего не делаем, пусть браузер работает естественно
    return () => {};
  }, []);

  // Функция для смены филиала с сохранением в localStorage
  const handleBranchChange = (branch: 'МСК' | 'Полевая') => {
    setCurrentBranch(branch);
    localStorage.setItem('currentBranch', branch);
  };

  // Получаем столы текущего филиала и сортируем по имени
  const currentTables = tables
    .filter(table => table.branch === currentBranch)
    .sort((a, b) => {
      // Сортируем по имени зоны (Зона 1, Зона 2, и т.д.)
      const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

  // Отладочная информация для currentTables
  console.log('📊 CurrentTables debug:', {
    allTablesCount: tables.length,
    currentBranch,
    currentTablesCount: currentTables.length,
    allTables: tables.map(t => ({ id: t.id, name: t.name, branch: t.branch })),
    filteredTables: currentTables.map(t => ({ id: t.id, name: t.name, branch: t.branch }))
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

  // Функция загрузки данных
  const loadData = async () => {
    try {
      console.log('🔄 Автообновление данных...');
      const zonesRes = await fetch(`${API_URL}/api/zones`);
      const zonesData = await zonesRes.json();
      
      if (zonesData.length === 0) {
        console.log('No zones found, creating initial zones...');
        await createInitialZones();
        const newRes = await fetch(`${API_URL}/api/zones`);
        const newData = await newRes.json();
        setTables(newData);
      } else {
        setTables(zonesData);
      }
      
      const bookingsRes = await fetch(`${API_URL}/api/bookings`);
      const bookingsData = await bookingsRes.json();
      
      setBookings(
        bookingsData.map((b: any) => ({
          ...b,
          tableId: Number(b.tableId)
        }))
      );
      
      setLastUpdate(new Date());
      console.log('✅ Данные обновлены:', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('❌ Ошибка загрузки данных:', error);
    }
  };

  // Загрузка зон и бронирований с backend при первом запуске
  useEffect(() => {
    loadData();
  }, []);

  // Автообновление каждые 5 секунд
  useEffect(() => {
    if (!isAutoRefreshEnabled) return;

    const interval = setInterval(() => {
      loadData();
    }, 5000); // 5 секунд

    return () => clearInterval(interval);
  }, [isAutoRefreshEnabled]);

  // useEffect для обновления tableId при смене филиала или зон
  useEffect(() => {
    console.log('🔄 Обновление tableId:', { 
      currentBranch, 
      currentTablesCount: currentTables.length,
      currentTableIds: currentTables.map(t => t.id),
      currentFormTableId: form.tableId
    });
    
    // Обновляем tableId только при смене филиала, не при загрузке зон
    if (currentTables.length > 0) {
      setForm((prev) => {
        // Проверяем, есть ли текущий tableId в списке доступных зон
        const currentTableExists = currentTables.some(table => table.id === prev.tableId);
        
        // Если текущая зона недоступна в новом филиале, выбираем первую
        const newTableId = currentTableExists ? prev.tableId : currentTables[0].id;
        
        console.log('✅ Новый tableId:', { 
          oldTableId: prev.tableId, 
          newTableId, 
          currentTableExists,
          firstAvailableTable: currentTables[0]?.id
        });
        
        return {
          ...prev,
          tableId: newTableId
        };
      });
    }
  }, [currentBranch]); // Убираем currentTables из зависимостей

  // Инициализация tableId при первой загрузке зон
  useEffect(() => {
    if (currentTables.length > 0 && form.tableId === 1) {
      console.log('🚀 Инициализация tableId при первой загрузке');
      setForm(prev => ({
        ...prev,
        tableId: currentTables[0].id
      }));
    }
  }, [currentTables]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    // Отладочная информация для выбора зоны
    if (name === 'tableId') {
      console.log('🎯 Выбор зоны:', { 
        oldValue: form.tableId, 
        newValue: Number(value), 
        availableZones: currentTables.map(t => ({ id: t.id, name: t.name }))
      });
    }
    
    setForm((prev) => {
      const newForm = { 
        ...prev, 
        [name]: type === 'checkbox' ? checked : (name === 'guests' || name === 'tableId' ? Number(value) : value)
      };
      
      // Сохраняем форму в localStorage
      localStorage.setItem('bookingForm', JSON.stringify(newForm));
      
      return newForm;
    });
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
    if (!form.name.trim() || !form.time.trim() || !form.tableId || !form.guests) return;
    
    console.log('🎯 Создание брони:', {
      formData: form,
      selectedTableId: form.tableId,
      currentBranch,
      availableTables: currentTables.map(t => ({ id: t.id, name: t.name }))
    });
    
    const newBooking: Omit<Booking, 'id'> = {
      name: form.name.trim(),
      time: form.time.trim(),
      tableId: Number(form.tableId),
      guests: form.guests,
      phone: form.phone.trim(),
      source: 'Лично' as SourceType,
      branch: currentBranch,
      isActive: false,
      comment: form.comment.trim(),
      hasVR: form.hasVR,
      hasShisha: form.hasShisha,
    };
    await fetch(`${API_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBooking),
    });
    fetch(`${API_URL}/api/bookings`)
      .then(res => res.json())
      .then(data => setBookings(
        data.map((b: any) => ({
          ...b,
          tableId: Number(b.tableId)
        }))
      ));
    // Очищаем форму после успешного создания
    const clearedForm = { 
      name: '', 
      time: '', 
      tableId: form.tableId, // Сохраняем выбранную зону
      guests: 1, 
      phone: '', 
      comment: '', 
      hasVR: false, 
      hasShisha: false 
    };
    
    setForm(clearedForm);
    localStorage.setItem('bookingForm', JSON.stringify(clearedForm));
    
    console.log('✅ Бронь создана, сохранена зона:', form.tableId);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setEditForm({
      name: booking.name,
      time: booking.time,
      guests: booking.guests,
      phone: booking.phone,
      comment: booking.comment || '',
      hasVR: booking.hasVR || false,
      hasShisha: booking.hasShisha || false,
    });
  };

  // Редактирование бронирования
  const handleSaveBookingEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking || !editForm.name.trim() || !editForm.time.trim() || !editForm.guests) return;
    const res = await fetch(`${API_URL}/api/bookings/${editingBooking.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name.trim(),
        time: editForm.time.trim(),
        guests: editForm.guests,
        phone: editForm.phone.trim(),
        source: 'Лично' as SourceType,
        comment: editForm.comment.trim(),
        hasVR: editForm.hasVR,
        hasShisha: editForm.hasShisha,
      }),
    });
    const updated = await res.json();
    setBookings(prev => prev.map(b => b.id === editingBooking.id ? { ...updated, isActive: b.isActive } : b));
    setEditingBooking(null);
    setEditForm({ name: '', time: '', guests: 1, phone: '', comment: '', hasVR: false, hasShisha: false });
  };

  const handleCancelBookingEdit = () => {
    setEditingBooking(null);
    setEditForm({ name: '', time: '', guests: 1, phone: '', comment: '', hasVR: false, hasShisha: false });
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
      // Обновляем локальное состояние
      setBookings((prev) =>
        prev.map((b) => (b.id === draggedBooking.id ? { ...b, tableId } : b))
      );
      
      // Сохраняем изменения на сервер
      try {
        await fetch(`${API_URL}/api/bookings/${draggedBooking.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...draggedBooking, tableId }),
        });
      } catch (error) {
        console.error('Error updating booking on server:', error);
        // При ошибке откатываем изменения
        setBookings((prev) =>
          prev.map((b) => (b.id === draggedBooking.id ? draggedBooking : b))
        );
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

  // Функция очистки всех броней в текущем филиале
  const handleClearAllBookings = async () => {
    if (!window.confirm(`Вы уверены, что хотите удалить ВСЕ брони в филиале "${currentBranch}"? Это действие нельзя отменить!`)) {
      return;
    }

    try {
      // Получаем все брони текущего филиала
      const currentBranchBookings = bookings.filter(b => b.branch === currentBranch);
      
      // Удаляем каждую бронь
      for (const booking of currentBranchBookings) {
        await fetch(`${API_URL}/api/bookings/${booking.id}`, { method: 'DELETE' });
      }
      
      // Обновляем локальное состояние
      setBookings(prev => prev.filter(b => b.branch !== currentBranch));
      
      alert(`Все брони в филиале "${currentBranch}" удалены!`);
    } catch (error) {
      console.error('Error clearing all bookings:', error);
      alert('Ошибка при удалении броней');
    }
  };

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
          <button onClick={onOpenAdmin} className="admin-btn">
            ⚙️ Админ панель
          </button>
        </div>
        <div className="header-btns">
          <button 
            onClick={() => handleBranchChange('МСК')}
            className={currentBranch === 'МСК' ? 'active' : ''}
          >
            🏢 МСК ({tables.filter(t => t.branch === 'МСК').length})
          </button>
          <button 
            onClick={() => handleBranchChange('Полевая')}
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
            <span className="stat-item" style={{ fontSize: '10px', opacity: 0.8 }}>
              Обновлено: {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => setIsAutoRefreshEnabled(!isAutoRefreshEnabled)}
            style={{
              background: isAutoRefreshEnabled 
                ? 'linear-gradient(135deg, #10b981, #34d399)' 
                : 'linear-gradient(135deg, #6b7280, #9ca3af)',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            title={isAutoRefreshEnabled ? "Отключить автообновление" : "Включить автообновление"}
          >
            {isAutoRefreshEnabled ? '🔄 ВКЛ' : '⏸️ ВЫКЛ'}
          </button>
          <button 
            onClick={loadData}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            title="Обновить сейчас"
          >
            🔄 Сейчас
          </button>
          <button 
            onClick={handleClearAllBookings}
            style={{
              background: 'linear-gradient(135deg, #dc2626, #ef4444)',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            title="Удалить все брони в этом филиале"
          >
            🗑️ Очистить все
          </button>
          <div className="info-bar-icon">
            {currentBranch === 'МСК' ? '🏢' : '🏪'}
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="content">
        {/* Левая панель - форма добавления */}
        <div className="form-panel">
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



            <button type="submit">➕ Добавить бронь</button>
      </form>
        </div>

        {/* Правая панель - канбан-доска */}
        <div className="kanban-area">
          <div className="kanban-board-content">
            {currentTables.map((table) => (
          <div
            key={table.id}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(table.id)}
                className="zone-card"
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
                      <div className="booking-time">{b.time}</div>
                      <div className="booking-name">{b.name}</div>
                      <div className="booking-guests">{b.guests} чел.</div>
                      {b.comment && <div className="booking-comment">💬 {b.comment}</div>}
                      {b.phone && <div className="booking-info">тел. {b.phone}</div>}
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
import React, { useState, useEffect, useMemo } from 'react';

const SOURCES = ['Лично', 'Звонок', 'Онлайн'] as const;
type SourceType = typeof SOURCES[number];

interface Table {
  id: number;
  name: string;
  capacity: number;
  branch: string;
  isNotCleaned?: boolean;
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
  // Состояние для быстрого добавления брони
  const [quickBooking, setQuickBooking] = useState<{
    tableId: number;
    position: { x: number; y: number };
  } | null>(null);

  // Базовая форма для быстрого бронирования
  const [quickForm, setQuickForm] = useState({
    name: '',
    time: '',
    guests: 1,
    phone: '',
  });
  // Состояние для контекстного меню
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tableId: number;
  } | null>(null);

  // Обработчик правого клика на зону
  const handleContextMenu = (e: React.MouseEvent, tableId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Закрываем форму быстрого бронирования, если она открыта
    setQuickBooking(null);
    
    setContextMenu({
      x: e.clientX + 10, // Смещаем на 10px вправо от курсора
      y: e.clientY + 10, // Смещаем на 10px вниз от курсора
      tableId
    });
  };

  // Обработчик закрытия контекстного меню
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Обработчик клика на зону для быстрого добавления
  const handleZoneClick = (e: React.MouseEvent, tableId: number) => {
    // Проверяем, был ли клик по карточке брони или её элементам управления
    const isBookingCardClick = (e.target as HTMLElement).closest('.booking-card, .booking-actions, .action-btn');
    if (isBookingCardClick) {
      return; // Если клик был по брони или её кнопкам, не открываем форму
    }

    // Если был правый клик, не открываем форму
    if (e.button === 2) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    // Если уже открыто контекстное меню, закрываем его
    if (contextMenu) {
      setContextMenu(null);
      return;
    }

    // Получаем размеры и позицию зоны относительно viewport
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    
    // Получаем размеры окна браузера
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    // Размеры формы (примерные)
    const formHeight = 450; // Примерная высота формы
    const formWidth = 380; // Ширина формы из CSS

    // Вычисляем позицию по центру зоны
    let x = rect.left + rect.width / 2;
    let y = rect.bottom + 20; // 20px отступ от низа зоны

    // Проверяем, поместится ли форма снизу от зоны
    if (y + formHeight > windowHeight - 20) {
      // Если не помещается снизу, размещаем сверху от зоны
      y = rect.top - formHeight - 20;
      
      // Если и сверху не помещается, центрируем по вертикали
      if (y < 20) {
        y = (windowHeight - formHeight) / 2;
      }
    }

    // Проверяем и корректируем позицию по горизонтали
    if (x - formWidth/2 < 20) {
      x = formWidth/2 + 20;
    } else if (x + formWidth/2 > windowWidth - 20) {
      x = windowWidth - formWidth/2 - 20;
    }

    // Добавляем отладочную информацию
    console.log('Quick booking positioning:', {
      zoneRect: rect,
      windowSize: { width: windowWidth, height: windowHeight },
      calculatedPosition: { x, y },
      formSize: { width: formWidth, height: formHeight }
    });

    // Устанавливаем позицию с учетом корректировок
    setQuickBooking({
      tableId,
      position: { x, y }
    });
    
    setQuickForm({
      name: '',
      time: '',
      guests: 1,
      phone: '',
    });
  };

  // Обработчик быстрого добавления брони
  const handleQuickBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBooking || !quickForm.name.trim() || !quickForm.time.trim()) return;

    const newBooking: Omit<Booking, 'id'> = {
      name: quickForm.name.trim(),
      time: quickForm.time.trim(),
      tableId: quickBooking.tableId,
      guests: quickForm.guests,
      phone: quickForm.phone.trim(),
      source: 'Лично' as SourceType,
      branch: currentBranch,
      isActive: false,
      comment: '',
      hasVR: false,
      hasShisha: false,
    };

    try {
      await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking),
      });
      
      // Обновляем список броней
      const res = await fetch(`${API_URL}/api/bookings`);
      const data = await res.json();
      setBookings(data.map((b: any) => ({
        ...b,
        tableId: Number(b.tableId)
      })));

      // Закрываем форму
      setQuickBooking(null);
      setQuickForm({
        name: '',
        time: '',
        guests: 1,
        phone: '',
      });
    } catch (error) {
      console.error('Error creating quick booking:', error);
    }
  };

  // Обработчик изменения формы быстрого бронирования
  const handleQuickFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setQuickForm(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  // Обработчик изменения статуса уборки
  const handleToggleCleanStatus = async (tableId: number) => {
    try {
      const table = tables.find(t => t.id === tableId);
      if (!table) return;

      // Создаем объект с обязательными полями
      const updatedTable = {
        id: table.id,
        name: table.name,
        capacity: table.capacity,
        branch: table.branch,
        isNotCleaned: table.isNotCleaned === undefined ? true : !table.isNotCleaned
      };

      const res = await fetch(`${API_URL}/api/zones/${tableId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTable),
      });

      const responseText = await res.text();

      if (!res.ok) {
        return;
      }

      interface UpdatedTableData {
        id: number;
        name: string;
        capacity: number;
        branch: string;
        isNotCleaned: boolean;
      }

      let updatedData: UpdatedTableData;
      try {
        updatedData = JSON.parse(responseText) as UpdatedTableData;
        if (!('isNotCleaned' in updatedData)) {
          return;
        }
      } catch (e) {
        return;
      }

      // Обновляем состояние локально
      setTables(prev => prev.map(t => 
        t.id === tableId ? { ...t, isNotCleaned: updatedData.isNotCleaned } : t
      ));

      // Принудительно обновляем данные
      await loadData();

    } catch (error) {
      // Ошибка при обновлении статуса уборки
    } finally {
      handleCloseContextMenu();
    }
  };
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  name="time"
                  type="time"
                  value={editForm.time}
                  onChange={handleEditFormChange}
                  required
                  style={{ marginBottom: '4px' }}
                />
                <div className="time-buttons">
                  {[
                    { time: '14:00', label: '14' },
                    { time: '15:00', label: '15' },
                    { time: '16:00', label: '16' },
                    { time: '17:00', label: '17' },
                    { time: '18:00', label: '18' },
                    { time: '19:00', label: '19' },
                    { time: '20:00', label: '20' },
                    { time: '21:00', label: '21' },
                    { time: '22:00', label: '22' },
                    { time: '23:00', label: '23' },
                    { time: '00:00', label: '00' },
                    { time: '01:00', label: '01' },
                    { time: '02:00', label: '02' }
                  ].map(({ time, label }) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, time }))}
                      className={`time-button ${editForm.time === time ? 'active' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '2px' }}>
                  {[
                    { time: '14:30', label: '14:30' },
                    { time: '15:30', label: '15:30' },
                    { time: '16:30', label: '16:30' },
                    { time: '17:30', label: '17:30' },
                    { time: '18:30', label: '18:30' },
                    { time: '19:30', label: '19:30' },
                    { time: '20:30', label: '20:30' },
                    { time: '21:30', label: '21:30' },
                    { time: '22:30', label: '22:30' },
                    { time: '23:30', label: '23:30' },
                    { time: '00:30', label: '00:30' },
                    { time: '01:30', label: '01:30' }
                  ].map(({ time, label }) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, time }))}
                      style={{
                        background: editForm.time === time ? '#10b981' : '#f3f4f6',
                        color: editForm.time === time ? 'white' : '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '3px',
                        padding: '2px 6px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
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
  const toggleActiveHandler = (booking: Booking) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleToggleActive(booking);
  };
  
  const editBookingHandler = (booking: Booking) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleEditBooking(booking);
  };
  
  const deleteBookingHandler = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleDelete(id);
  };

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

  // Обработчик клика вне контекстного меню и формы быстрого бронирования
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Проверяем, был ли клик вне формы быстрого бронирования
      const quickBookingForm = document.querySelector('.quick-booking-form');
      if (quickBookingForm && !(quickBookingForm as HTMLElement).contains(e.target as Node)) {
        setQuickBooking(null);
      }
      
      // Проверяем, был ли клик вне контекстного меню
      const contextMenuElement = document.querySelector('.context-menu');
      if (contextMenuElement && !(contextMenuElement as HTMLElement).contains(e.target as Node)) {
        handleCloseContextMenu();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div>
      {/* Контекстное меню */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="context-menu-item"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggleCleanStatus(contextMenu.tableId);
            }}
            type="button"
          >
            {tables.find(t => t.id === contextMenu.tableId)?.isNotCleaned
              ? '✨ Отметить как убранную'
              : '🚫 Отметить как неубранную'}
          </button>
        </div>
      )}

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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  name="time"
                  type="time"
                  value={form.time}
                  onChange={handleChange}
                  required
                  style={{ marginBottom: '4px' }}
                />
                <div className="time-buttons">
                  {[
                    { time: '14:00', label: '14' },
                    { time: '15:00', label: '15' },
                    { time: '16:00', label: '16' },
                    { time: '17:00', label: '17' },
                    { time: '18:00', label: '18' },
                    { time: '19:00', label: '19' },
                    { time: '20:00', label: '20' },
                    { time: '21:00', label: '21' },
                    { time: '22:00', label: '22' },
                    { time: '23:00', label: '23' },
                    { time: '00:00', label: '00' },
                    { time: '01:00', label: '01' },
                    { time: '02:00', label: '02' }
                  ].map(({ time, label }) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, time }))}
                      className={`time-button ${form.time === time ? 'active' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="time-buttons">
                  {[
                    { time: '14:30', label: '14:30' },
                    { time: '15:30', label: '15:30' },
                    { time: '16:30', label: '16:30' },
                    { time: '17:30', label: '17:30' },
                    { time: '18:30', label: '18:30' },
                    { time: '19:30', label: '19:30' },
                    { time: '20:30', label: '20:30' },
                    { time: '21:30', label: '21:30' },
                    { time: '22:30', label: '22:30' },
                    { time: '23:30', label: '23:30' },
                    { time: '00:30', label: '00:30' },
                    { time: '01:30', label: '01:30' }
                  ].map(({ time, label }) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, time }))}
                      className={`time-button half-hour ${form.time === time ? 'active' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
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
            onClick={(e) => handleZoneClick(e, table.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleContextMenu(e, table.id);
            }}
            className={`zone-card ${table.isNotCleaned ? 'not-cleaned' : ''}`}
            style={{ position: 'relative', cursor: 'pointer' }}
              >
                <div className="zone-card-header">
                  {table.name}
                  {table.isNotCleaned && (
                    <div className="not-cleaned-indicator">Не убрана</div>
                  )}
                </div>
                <div className="zone-card-body">
                  {currentBookings.filter(b => String(b.tableId) === String(table.id)).length === 0 && (
                    <div className="no-bookings">Нет броней</div>
                  )}
                  {currentBookings.filter(b => String(b.tableId) === String(table.id)).map((b) => (
                <div
                  key={b.id}
                  draggable
                  onDragStart={() => handleDragStart(b)}
                  onClick={(e) => e.stopPropagation()}
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

      {/* Форма быстрого бронирования */}
      {quickBooking && (
        <div
          className="quick-booking-form"
          style={{
            position: 'fixed',
            top: quickBooking.position.y,
            left: quickBooking.position.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3>Быстрое бронирование - {tables.find(t => t.id === quickBooking.tableId)?.name}</h3>
          <form onSubmit={handleQuickBookingSubmit}>
            <div>
              <label>Имя *</label>
              <input
                name="name"
                value={quickForm.name}
                onChange={handleQuickFormChange}
                placeholder="Имя клиента"
                required
                autoFocus
              />
            </div>

            <div>
              <label>Время *</label>
              <input
                name="time"
                type="time"
                value={quickForm.time}
                onChange={handleQuickFormChange}
                required
              />
              <div className="quick-time-buttons">
                {[
                  '14:00', '15:00', '16:00', '17:00', '18:00',
                  '19:00', '20:00', '21:00', '22:00', '23:00',
                  '00:00', '01:00', '02:00'
                ].map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setQuickForm(prev => ({ ...prev, time }))}
                    className={`quick-time-button ${quickForm.time === time ? 'active' : ''}`}
                  >
                    {time.split(':')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label>Гости *</label>
              <input
                name="guests"
                type="number"
                min="1"
                value={quickForm.guests}
                onChange={handleQuickFormChange}
                required
              />
            </div>

            <div>
              <label>Телефон</label>
              <input
                name="phone"
                type="tel"
                value={quickForm.phone}
                onChange={handleQuickFormChange}
                placeholder="+7"
              />
            </div>

            <div className="actions">
              <button type="submit" className="submit-btn">
                Добавить
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setQuickBooking(null)}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Board; 
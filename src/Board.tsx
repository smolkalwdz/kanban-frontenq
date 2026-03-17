import React, { useState, useEffect, useMemo, useRef } from 'react';
import { API_URL } from './config';

const SOURCES = ['Лично', 'Звонок', 'Онлайн'] as const;
type SourceType = typeof SOURCES[number];

interface Table {
  id: number;
  name: string;
  capacity: number;
  branch: string;
  isNotCleaned?: boolean;
}

interface TableCall {
  id: string;
  branch: string;
  tableId: number;
  callType: 'waiter' | 'hookah' | 'gamemaster';
  timestamp: string;
  resolved: boolean;
  count?: number;
  comment?: string;
}

interface Booking {
  id: string;
  name: string;
  time: string;
  endTime?: string;
  guests: number;
  phone: string;
  source: SourceType;
  tableId: number;
  branch: string;
  isActive: boolean;
  comment?: string;
  hasVR?: boolean;
  hasShisha?: boolean;
  isHappyHours?: boolean;
  smokingTimerEnd?: string; // ISO дата окончания таймера курения
  activeStartedAt?: string | null; // ISO дата начала активной брони
}

interface BoardProps {
  onOpenAdmin: () => void;
}

interface CurrentShift {
  date: string;
  admin: string;
  gamemaster: string;
  isActual: boolean;
  lastUpdate: string;
}

interface WaitlistItem {
  id: string;
  name: string;
  phone: string;
  validUntil: string;
  branch: 'МСК' | 'Полевая';
  createdAt: string;
}

const Board: React.FC<BoardProps> = ({ onOpenAdmin }) => {
  // Переопределение времени приложения (для тестов): читаем из localStorage
  const getNow = () => {
    const override = localStorage.getItem('appTimeOverride');
    if (override) {
      const parsed = new Date(override);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  };
  // Состояние для быстрого добавления брони
  const [quickBooking, setQuickBooking] = useState<{
    tableId: number;
    position: { x: number; y: number };
  } | null>(null);

  // Базовая форма для быстрого бронирования
  const [quickForm, setQuickForm] = useState({
    name: '',
    time: '',
    endTime: '',
    guests: 1,
    phone: '',
    comment: '',
    hasVR: false,
    hasShisha: false,
    isHappyHours: false,
    smokingTimer: false, // галочка "МНЕ ТОЛЬКО ПОКУРИТЬ"
  });
  const [quickTimeTarget, setQuickTimeTarget] = useState<'time' | 'endTime'>('time');
  // Состояние для контекстного меню
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tableId: number;
  } | null>(null);

  // Перетаскивание формы быстрого бронирования
  const [isDraggingQuick, setIsDraggingQuick] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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

    // Центрирование внутри области канбан-доски
    const kanban = document.querySelector('.kanban-area') as HTMLElement | null;
    const rect = kanban?.getBoundingClientRect();
    const formHeight = 450;
    const formWidth = 380;
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    setQuickBooking({
      tableId,
      position: { x, y }
    });
    
    setQuickForm({
      name: '',
      time: '',
      endTime: '',
      guests: 1,
      phone: '',
      comment: '',
      hasVR: false,
      hasShisha: false,
      isHappyHours: false,
      smokingTimer: false,
    });
    setQuickTimeTarget('time');
  };

  // Начало перетаскивания формы
  const handleQuickDragStart = (e: React.MouseEvent) => {
    if (!quickBooking) return;
    const target = e.target as HTMLElement;
    // Не начинаем перетаскивание, если клик по интерактивным элементам
    if (target.closest('input, textarea, select, button, [contenteditable="true"], .quick-time-button, label')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    setIsDraggingQuick(true);
    setDragOffset({
      x: startX - quickBooking.position.x,
      y: startY - quickBooking.position.y,
    });
  };

  // Перемещение формы
  useEffect(() => {
    if (!isDraggingQuick) return;
    const handleMove = (e: MouseEvent) => {
      if (!quickBooking) return;
      const formWidth = 380;
      const formHeight = 450;
      let newX = e.clientX - dragOffset.x;
      let newY = e.clientY - dragOffset.y;
      // Ограничиваем внутри области канбан-доски (или экрана, если не найдена)
      const kanban = document.querySelector('.kanban-area') as HTMLElement | null;
      const rect = kanban?.getBoundingClientRect();
      const minX = (rect?.left ?? 0) + 10;
      const minY = (rect?.top ?? 0) + 10;
      const maxX = (rect ? rect.right : window.innerWidth) - formWidth - 10;
      const maxY = (rect ? rect.bottom : window.innerHeight) - formHeight - 10;
      if (newX < minX) newX = minX;
      if (newY < minY) newY = minY;
      if (newX > maxX) newX = maxX;
      if (newY > maxY) newY = maxY;
      setQuickBooking(prev => (prev ? { ...prev, position: { x: newX, y: newY } } : prev));
    };
    const handleUp = () => setIsDraggingQuick(false);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp, { once: true });
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp as any);
    };
  }, [isDraggingQuick, dragOffset, quickBooking]);

  // Обработчик быстрого добавления брони
  const handleQuickBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBooking || !quickForm.name.trim() || !quickForm.time.trim()) return;

    // Если галочка "МНЕ ТОЛЬКО ПОКУРИТЬ" активна, устанавливаем таймер
    let smokingTimerEnd: string | undefined = undefined;
    if (quickForm.smokingTimer) {
      // Проверяем тест-режим таймера
      const isTestMode = localStorage.getItem('smokingTimerTestMode') === 'true';
      const timerDuration = isTestMode ? 30 * 1000 : 90 * 60 * 1000; // 30 секунд или 90 минут
      const timerEnd = new Date(getNow().getTime() + timerDuration);
      
      if (isTestMode) {
        console.log('🧪 Тест-режим таймера: 30 секунд');
      }
      smokingTimerEnd = timerEnd.toISOString();
    }

    const newBooking: Omit<Booking, 'id'> = {
      name: quickForm.name.trim(),
      time: quickForm.time.trim(),
      endTime: quickForm.endTime.trim() || undefined,
      tableId: quickBooking.tableId,
      guests: quickForm.guests,
      phone: quickForm.phone.trim(),
      source: 'Лично' as SourceType,
      branch: currentBranch,
      isActive: false,
      comment: (quickForm.comment || '').trim(),
      hasVR: !!quickForm.hasVR,
      hasShisha: !!quickForm.hasShisha,
      isHappyHours: !!quickForm.isHappyHours,
      smokingTimerEnd,
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
        endTime: '',
        guests: 1,
        phone: '',
        comment: '',
        hasVR: false,
        hasShisha: false,
        isHappyHours: false,
        smokingTimer: false,
      });
      setQuickTimeTarget('time');
    } catch (error) {
      console.error('Error creating quick booking:', error);
    }
  };

  // Обработчик изменения формы быстрого бронирования
  const handleQuickFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    setQuickForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
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
  const [tableCalls, setTableCalls] = useState<TableCall[]>([]);
  const [currentBranch, setCurrentBranch] = useState<'МСК' | 'Полевая'>(() => {
    // Получаем сохраненный филиал из localStorage или используем 'МСК' по умолчанию
    return (localStorage.getItem('currentBranch') as 'МСК' | 'Полевая') || 'МСК';
  });
  const [currentShift, setCurrentShift] = useState<CurrentShift | null>(null);
  const logoUrl = `${process.env.PUBLIC_URL}/logo1.png`;
  
  // КРИТИЧНО: useRef для notifiedTimers чтобы избежать перезапуска при loadData
  const notifiedTimersRef = useRef<Set<string>>(
    (() => {
      try {
        const stored = localStorage.getItem('smoking_notified_timers');
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    })()
  );
  
  // Функция для сохранения в localStorage
  const saveNotifiedTimers = (timers: Set<string>) => {
    localStorage.setItem('smoking_notified_timers', JSON.stringify(Array.from(timers)));
  };
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
  const [waitlist, setWaitlist] = useState<WaitlistItem[]>([]);
  const [waitlistForm, setWaitlistForm] = useState({
    name: '',
    phone: '',
    validUntil: '',
  });
  const [draggedWaitlistItem, setDraggedWaitlistItem] = useState<WaitlistItem | null>(null);
  const [isWaitlistVisible, setIsWaitlistVisible] = useState<boolean>(() => {
    return localStorage.getItem('waitlistPanelVisible') !== 'false';
  });

  // Состояние для редактирования брони
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  // Состояние для автообновления
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [, setActiveTimerTick] = useState(0);
  const [editForm, setEditForm] = useState<{
    name: string;
    time: string;
    endTime: string;
    guests: number;
    phone: string;
    comment: string;
    hasVR: boolean;
    hasShisha: boolean;
    isHappyHours: boolean;
    smokingTimer: boolean;
  }>({
    name: '',
    time: '',
    endTime: '',
    guests: 1,
    phone: '',
    comment: '',
    hasVR: false,
    hasShisha: false,
    isHappyHours: false,
    smokingTimer: false,
  });
  const [editTimeTarget, setEditTimeTarget] = useState<'time' | 'endTime'>('time');

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimerTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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

  // Функция выхода из системы
  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    window.location.href = '/login';
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

  // Функция загрузки текущей смены
  const loadCurrentShift = async () => {
    try {
      // Проверяем тестовое время из localStorage
      const testTimeOverride = localStorage.getItem('appTimeOverride');
      
      // Добавляем timestamp для предотвращения кеширования
      const timestamp = new Date().getTime();
      let url = `${API_URL}/api/current-shift/${currentBranch}?t=${timestamp}`;
      
      // Если есть тестовое время - передаём его backend
      if (testTimeOverride) {
        url += `&testDate=${encodeURIComponent(testTimeOverride)}`;
        console.log(`🧪 Режим тестирования: дата ${new Date(testTimeOverride).toLocaleDateString('ru-RU')}`);
      }
      
      console.log(`🔄 Запрос смены для "${currentBranch}"...`);
      console.log(`   URL: ${url}`);
      
      const response = await fetch(url, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log(`📡 Ответ сервера: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        setCurrentShift(data);
        console.log(`✅ Смена загружена для "${currentBranch}":`, {
          admin: data.admin,
          gamemaster: data.gamemaster,
          date: data.date,
          isActual: data.isActual,
          testMode: data.testMode || false
        });
      } else {
        const errorData = await response.text();
        console.warn(`⚠️ Нет данных о смене для "${currentBranch}"`, errorData);
        setCurrentShift(null);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки смены:', error);
      setCurrentShift(null);
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
      
      // Загружаем вызовы персонала
      const callsRes = await fetch(`${API_URL}/api/table-calls`);
      const callsData = await callsRes.json();
      setTableCalls(callsData);

      // Загружаем лист ожидания (общий для всех)
      const waitlistRes = await fetch(`${API_URL}/api/waitlist`);
      const waitlistData = await waitlistRes.json();
      setWaitlist(Array.isArray(waitlistData) ? waitlistData : []);
      
      setLastUpdate(new Date());
      console.log('✅ Данные обновлены:', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('❌ Ошибка загрузки данных:', error);
    }
  };

  // Загрузка зон и бронирований с backend при первом запуске
  useEffect(() => {
    loadData();
    loadCurrentShift();
  }, []);

  // Обновление смены при смене филиала
  useEffect(() => {
    loadCurrentShift();
  }, [currentBranch]);

  // Автообновление данных и смены
  // ⚙️ ИНТЕРВАЛ: 5 секунд - оптимальный баланс между актуальностью и нагрузкой
  // Backend обновляется из Google Sheets каждые 60 секунд, frontend просто читает кеш
  useEffect(() => {
    if (!isAutoRefreshEnabled) return;

    const interval = setInterval(() => {
      loadData();
      loadCurrentShift();
    }, 5000); // 5 секунд

    return () => clearInterval(interval);
  }, [isAutoRefreshEnabled, currentBranch]);

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

  // Удаляем основную форму добавления: вспомогательные хендлеры не нужны

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
      isHappyHours: false,
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
    setEditTimeTarget('time');
    // Проверяем, есть ли активный таймер курения
    const hasActiveTimer = booking.smokingTimerEnd && new Date(booking.smokingTimerEnd) > getNow();
    setEditForm({
      name: booking.name,
      time: booking.time,
      endTime: booking.endTime || '',
      guests: booking.guests,
      phone: booking.phone,
      comment: booking.comment || '',
      hasVR: booking.hasVR || false,
      hasShisha: booking.hasShisha || false,
      isHappyHours: booking.isHappyHours || false,
      smokingTimer: !!hasActiveTimer,
    });
  };

  // Редактирование бронирования
  const handleSaveBookingEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking || !editForm.name.trim() || !editForm.time.trim() || !editForm.guests) return;
    
    // Если галочка "МНЕ ТОЛЬКО ПОКУРИТЬ" активна, сохраняем существующий таймер или создаем новый
    // Если галочка снята, очищаем таймер (null)
    let smokingTimerEnd: string | null = null;
    let shouldResetNotificationCounter = false; // Флаг для сброса счетчика уведомлений
    
    if (editForm.smokingTimer) {
      // Если таймер уже был установлен, проверяем не истек ли он
      if (editingBooking.smokingTimerEnd) {
        const existingTimerEnd = new Date(editingBooking.smokingTimerEnd);
        const now = getNow();
        
        // Если таймер НЕ истек, сохраняем его
        if (existingTimerEnd > now) {
          smokingTimerEnd = editingBooking.smokingTimerEnd;
        } else {
          // Если таймер ИСТЕК, создаем НОВЫЙ таймер
          const isTestMode = localStorage.getItem('smokingTimerTestMode') === 'true';
          const timerDuration = isTestMode ? 30 * 1000 : 90 * 60 * 1000;
          const timerEnd = new Date(now.getTime() + timerDuration);
          smokingTimerEnd = timerEnd.toISOString();
          shouldResetNotificationCounter = true; // Нужно сбросить счетчик!
          
          console.log('🔄 Таймер истек, создаю НОВЫЙ таймер');
          if (isTestMode) {
            console.log('🧪 Тест-режим таймера: 30 секунд');
          }
        }
      } else {
        // Если таймера не было, создаем новый
        const isTestMode = localStorage.getItem('smokingTimerTestMode') === 'true';
        const timerDuration = isTestMode ? 30 * 1000 : 90 * 60 * 1000;
        const timerEnd = new Date(getNow().getTime() + timerDuration);
        smokingTimerEnd = timerEnd.toISOString();
        
        if (isTestMode) {
          console.log('🧪 Тест-режим таймера: 30 секунд');
        }
      }
    }
    
    // КРИТИЧНО: Сбрасываем счетчик уведомлений если создали новый таймер
    if (shouldResetNotificationCounter) {
      try {
        notifiedTimersRef.current.delete(editingBooking.id); // Удаляем ID из Ref
        saveNotifiedTimers(notifiedTimersRef.current); // Сохраняем в localStorage
        console.log(`✅ Счетчик уведомлений сброшен для бронирования ${editingBooking.id}`);
      } catch (error) {
        console.error('Ошибка сброса счетчика:', error);
      }
    }
    
    if (editingBooking.endTime !== (editForm.endTime || undefined)) {
      const bookingPrefix = `${editingBooking.id}_`;
      const updatedEndingNotified = new Set(
        Array.from(notifiedEndingBookingsRef.current).filter(key => !key.startsWith(bookingPrefix))
      );
      notifiedEndingBookingsRef.current = updatedEndingNotified;
      saveNotifiedEndingBookings(updatedEndingNotified);

      const updatedEndedNotified = new Set(
        Array.from(notifiedEndedBookingsRef.current).filter(key => !key.startsWith(bookingPrefix))
      );
      notifiedEndedBookingsRef.current = updatedEndedNotified;
      saveNotifiedEndedBookings(updatedEndedNotified);
    }

    const res = await fetch(`${API_URL}/api/bookings/${editingBooking.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editForm.name.trim(),
        time: editForm.time.trim(),
        endTime: editForm.endTime.trim() || null,
        guests: editForm.guests,
        phone: editForm.phone.trim(),
        source: 'Лично' as SourceType,
        comment: editForm.comment.trim(),
        hasVR: editForm.hasVR,
        hasShisha: editForm.hasShisha,
        isHappyHours: editForm.isHappyHours,
        smokingTimerEnd,
      }),
    });
    const updated = await res.json();
    setBookings(prev => prev.map(b => b.id === editingBooking.id ? { ...updated, isActive: b.isActive } : b));
    setEditingBooking(null);
    setEditTimeTarget('time');
    setEditForm({ name: '', time: '', endTime: '', guests: 1, phone: '', comment: '', hasVR: false, hasShisha: false, isHappyHours: false, smokingTimer: false });
  };

  const handleCancelBookingEdit = () => {
    setEditingBooking(null);
    setEditTimeTarget('time');
    setEditForm({ name: '', time: '', endTime: '', guests: 1, phone: '', comment: '', hasVR: false, hasShisha: false, isHappyHours: false, smokingTimer: false });
  };

  const handleToggleActive = async (booking: Booking) => {
    const nextIsActive = !booking.isActive;
    const activeStartedAt = nextIsActive ? getNow().toISOString() : null;

    await fetch(`${API_URL}/api/bookings/${booking.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...booking, isActive: nextIsActive, activeStartedAt }),
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
  const handleWaitlistDragStart = (item: WaitlistItem) => {
    setDraggedWaitlistItem(item);
  };

  const handleWaitlistDragEnd = () => {
    setDraggedWaitlistItem(null);
  };

  const formatNowToTime = (date: Date): string => {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

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
      return;
    }

    if (draggedWaitlistItem) {
      const newBooking: Omit<Booking, 'id'> = {
        name: draggedWaitlistItem.name,
        time: formatNowToTime(getNow()),
        endTime: draggedWaitlistItem.validUntil || undefined,
        guests: 1,
        phone: draggedWaitlistItem.phone,
        source: 'Лично' as SourceType,
        tableId,
        branch: currentBranch,
        isActive: false,
        comment: 'Из листа ожидания',
        hasVR: false,
        hasShisha: false,
        isHappyHours: false,
      };

      try {
        await fetch(`${API_URL}/api/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBooking),
        });

        const bookingsRes = await fetch(`${API_URL}/api/bookings`);
        const bookingsData = await bookingsRes.json();
        setBookings(
          bookingsData.map((b: any) => ({
            ...b,
            tableId: Number(b.tableId)
          }))
        );
        await fetch(`${API_URL}/api/waitlist/${draggedWaitlistItem.id}`, {
          method: 'DELETE',
        });
        setWaitlist(prev => prev.filter(item => item.id !== draggedWaitlistItem.id));
      } catch (error) {
        console.error('Error creating booking from waitlist:', error);
      } finally {
        setDraggedWaitlistItem(null);
      }
    }
  };

  // Удаление бронирования
  const handleDelete = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту бронь?')) {
      await fetch(`${API_URL}/api/bookings/${id}`, { method: 'DELETE' });
      setBookings(prev => prev.filter(b => b.id !== id));
      const bookingPrefix = `${id}_`;
      const updatedEndingNotified = new Set(
        Array.from(notifiedEndingBookingsRef.current).filter(key => !key.startsWith(bookingPrefix))
      );
      notifiedEndingBookingsRef.current = updatedEndingNotified;
      saveNotifiedEndingBookings(updatedEndingNotified);

      const updatedEndedNotified = new Set(
        Array.from(notifiedEndedBookingsRef.current).filter(key => !key.startsWith(bookingPrefix))
      );
      notifiedEndedBookingsRef.current = updatedEndedNotified;
      saveNotifiedEndedBookings(updatedEndedNotified);
    }
  };

  // Получаем брони для текущего филиала
  const currentBookings = bookings.filter(booking => booking.branch === currentBranch);
  // Подсветка счастливых часов: активируется с 18:50
  const isHHTimeNow = () => {
    const now = getNow();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return hours > 18 || (hours === 18 && minutes >= 50);
  };

  const shouldHighlightHH = (b: Booking) => !!b.isHappyHours;

  const isHHWarningWindow = () => {
    const now = getNow();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    return hours === 18 && minutes >= 50 && minutes <= 59;
  };

  const shouldBlinkHH = (b: Booking) => !!b.isHappyHours && isHHWarningWindow();

  const parseTimeToDate = (time: string, baseDate: Date): Date | null => {
    if (!time || !/^\d{2}:\d{2}$/.test(time)) return null;
    const [hoursStr, minutesStr] = time.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    const parsed = new Date(baseDate);
    parsed.setHours(hours, minutes, 0, 0);
    return parsed;
  };

  const getBookingEndDate = (booking: Booking): Date | null => {
    if (!booking.endTime) return null;
    const now = getNow();
    const endToday = parseTimeToDate(booking.endTime, now);
    if (!endToday) return null;

    const bookingStart = booking.time ? parseTimeToDate(booking.time, now) : null;
    if (!bookingStart) return endToday;

    // Если время "до" меньше времени начала, считаем, что бронь через полночь
    if (endToday.getTime() <= bookingStart.getTime()) {
      const result = new Date(endToday);
      if (now.getTime() >= bookingStart.getTime()) {
        result.setDate(result.getDate() + 1);
      }
      return result;
    }

    return endToday;
  };

  const getBookingEndDiffMs = (booking: Booking): number | null => {
    const endDate = getBookingEndDate(booking);
    if (!endDate) return null;
    return endDate.getTime() - getNow().getTime();
  };

  const getEndingSoonInfo = (booking: Booking): { minutesLeft: number; label: string } | null => {
    const diffMs = getBookingEndDiffMs(booking);
    if (diffMs === null) return null;
    if (diffMs <= 0 || diffMs > 10 * 60 * 1000) return null;
    const minutesLeft = Math.max(1, Math.ceil(diffMs / (60 * 1000)));
    return { minutesLeft, label: `⏳ ВРЕМЯ ЗАКАНЧИВАЕТСЯ (${minutesLeft} мин)` };
  };

  const getEndedInfo = (booking: Booking): { minutesOver: number } | null => {
    const diffMs = getBookingEndDiffMs(booking);
    if (diffMs === null) return null;
    // Даем 10 минут окна, чтобы не слать старые просрочки при перезагрузке страницы
    if (diffMs > 0 || diffMs < -10 * 60 * 1000) return null;
    return { minutesOver: Math.max(0, Math.floor(Math.abs(diffMs) / (60 * 1000))) };
  };

  const notifiedEndingBookingsRef = useRef<Set<string>>(
    (() => {
      try {
        const stored = localStorage.getItem('booking_ending_notified');
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    })()
  );

  const saveNotifiedEndingBookings = (keys: Set<string>) => {
    localStorage.setItem('booking_ending_notified', JSON.stringify(Array.from(keys)));
  };

  const notifiedEndedBookingsRef = useRef<Set<string>>(
    (() => {
      try {
        const stored = localStorage.getItem('booking_ended_notified');
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    })()
  );

  const saveNotifiedEndedBookings = (keys: Set<string>) => {
    localStorage.setItem('booking_ended_notified', JSON.stringify(Array.from(keys)));
  };

  // ========== ЛОГИКА ТАЙМЕРА КУРЕНИЯ ==========
  
  // Функция для получения оставшегося времени таймера курения
  const getSmokingTimeRemaining = (booking: Booking): { minutes: number; seconds: number; isExpired: boolean; expiredMoreThan2Min: boolean } | null => {
    if (!booking.smokingTimerEnd) return null;
    
    const now = getNow();
    const endTime = new Date(booking.smokingTimerEnd);
    const diffMs = endTime.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      // Проверяем, прошло ли более 2 минут после истечения
      const expiredMs = Math.abs(diffMs);
      const expiredMoreThan2Min = expiredMs > (2 * 60 * 1000); // 2 минуты
      
      return { minutes: 0, seconds: 0, isExpired: true, expiredMoreThan2Min };
    }
    
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return { minutes, seconds, isExpired: false, expiredMoreThan2Min: false };
  };
  
  // Проверка, истек ли таймер курения (для мигания) - но не более 2 минут назад
  const isSmokingTimerExpired = (b: Booking): boolean => {
    const remaining = getSmokingTimeRemaining(b);
    // Мигание только если истек, но прошло менее 2 минут
    return remaining !== null && remaining.isExpired && !remaining.expiredMoreThan2Min;
  };
  
  // Форматирование времени таймера для отображения
  const formatSmokingTimer = (booking: Booking): string | null => {
    const remaining = getSmokingTimeRemaining(booking);
    if (!remaining) return null;
    
    // Если прошло более 2 минут после истечения - не показываем ничего
    if (remaining.expiredMoreThan2Min) {
      return null;
    }
    
    if (remaining.isExpired) {
      return '⏰ ПРЕДЛОЖИ Кальян или тариф';
    }
    
    const mins = String(remaining.minutes).padStart(2, '0');
    const secs = String(remaining.seconds).padStart(2, '0');
    return `🚬 ${mins}:${secs}`;
  };

  const formatActiveDuration = (booking: Booking): string | null => {
    if (!booking.isActive || !booking.activeStartedAt) return null;

    const startedAt = new Date(booking.activeStartedAt);
    if (isNaN(startedAt.getTime())) return null;

    const diffMs = Math.max(0, getNow().getTime() - startedAt.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `⏱ ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `⏱ ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Уведомление о завершении таймера курения
  useEffect(() => {
    const checkAndNotify = async () => {
      // Используем notifiedTimersRef.current - он НЕ перезапускается при loadData!
      const notifiedTimers = notifiedTimersRef.current;
      
      // Фильтруем бронирования с истекшим таймером, для которых ЕЩЁ НЕ отправлено уведомление
      const currentBookingsWithExpiredTimer = bookings.filter(b => 
        b.branch === currentBranch && 
        b.smokingTimerEnd && 
        isSmokingTimerExpired(b) &&
        !notifiedTimers.has(b.id) // Проверяем: уже отправляли?
      );
      
      if (currentBookingsWithExpiredTimer.length === 0) {
        return; // Нет новых истекших таймеров
      }
      
      // Обрабатываем каждое бронирование
      for (const booking of currentBookingsWithExpiredTimer) {
        // КРИТИЧНО: СРАЗУ добавляем в Set ПЕРЕД отправкой!
        notifiedTimers.add(booking.id);
        saveNotifiedTimers(notifiedTimers);
        
        // Ищем таблицу (сравниваем как строки!)
        const table = tables.find(t => String(t.id) === String(booking.tableId));
        
        const zoneName = table?.name || `Зона ${booking.tableId}`;
        
        console.log(`🚬 [${new Date().toLocaleTimeString()}] Таймер истёк для ${zoneName} (${booking.name}), отправляю уведомление...`);
        
        // Отправляем уведомление сотрудникам на смене
        try {
          const testTimeOverride = localStorage.getItem('appTimeOverride');
          
          const payload: any = {
            branch: booking.branch,
            zoneName: zoneName,
            guestName: booking.name
          };
          
          if (testTimeOverride) {
            payload.testDate = testTimeOverride;
          }
          
          const response = await fetch(`${API_URL}/api/telegram/notify-smoking-timer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log(`   ✅ Уведомление отправлено: ${result.message}`);
          } else {
            console.error('   ❌ Ошибка отправки уведомления');
          }
        } catch (error) {
          console.error('   ❌ Ошибка отправки:', error);
        }
      }
      
      // Очищаем старые уведомления (для броней, которые уже удалены)
      const currentBookingIds = new Set(bookings.map(b => b.id));
      const cleanedTimers = new Set(Array.from(notifiedTimers).filter(id => currentBookingIds.has(id)));
      if (cleanedTimers.size !== notifiedTimers.size) {
        notifiedTimersRef.current = cleanedTimers;
        saveNotifiedTimers(cleanedTimers);
        console.log(`🧹 Очищены старые уведомления: ${notifiedTimers.size} → ${cleanedTimers.size}`);
      }
    };
    
    const interval = setInterval(checkAndNotify, 1000); // Проверяем каждую секунду
    return () => clearInterval(interval);
  }, [bookings, currentBranch, tables]);

  // ========== КОНЕЦ ЛОГИКИ ТАЙМЕРА КУРЕНИЯ ==========

  // ========== ЛОГИКА ПРОВЕРКИ И ОТПРАВКИ ЗАДАЧ ==========
  
  useEffect(() => {
    const checkAndSendTasks = async () => {
      try {
        // Получаем локальное время (с учетом тестового времени)
        const now = getNow();
        
        // Вызываем API для проверки и отправки задач
        const testTimeOverride = localStorage.getItem('appTimeOverride');
        const payload: any = {
          currentTime: now.toISOString()
        };
        
        if (testTimeOverride) {
          payload.testDate = testTimeOverride;
        }
        
        const response = await fetch(`${API_URL}/api/tasks/check-and-send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.checked > 0) {
            console.log(`📋 Проверено задач: ${result.checked}`);
            result.results.forEach((r: any) => {
              if (r.success) {
                console.log(`   ✅ Задача ${r.taskId} отправлена (${r.sent}/${r.total})`);
              } else {
                console.warn(`   ⚠️ Задача ${r.taskId}: ${r.error}`);
              }
            });
          }
        }
      } catch (error) {
        console.error('❌ Ошибка проверки задач:', error);
      }
    };
    
    // Проверяем задачи каждую минуту
    const interval = setInterval(checkAndSendTasks, 60 * 1000);
    
    // Также проверяем сразу при загрузке
    checkAndSendTasks();
    
    return () => clearInterval(interval);
  }, []);

  // Уведомление за 10 минут до окончания брони (поле "До времени")
  useEffect(() => {
    const checkBookingEndingAndNotify = async () => {
      const notified = notifiedEndingBookingsRef.current;
      const testTimeOverride = localStorage.getItem('appTimeOverride');

      for (const booking of bookings) {
        if (booking.branch !== currentBranch || !booking.endTime) continue;
        const endingSoon = getEndingSoonInfo(booking);
        if (!endingSoon) continue;

        const notificationKey = `${booking.id}_${booking.endTime}`;
        if (notified.has(notificationKey)) continue;

        notified.add(notificationKey);
        saveNotifiedEndingBookings(notified);

        const table = tables.find(t => String(t.id) === String(booking.tableId));
        const zoneName = table?.name || `Зона ${booking.tableId}`;

        try {
          const payload: any = {
            branch: booking.branch,
            zoneName,
            guestName: booking.name,
            endTime: booking.endTime,
            minutesLeft: endingSoon.minutesLeft
          };
          if (testTimeOverride) {
            payload.testDate = testTimeOverride;
          }

          const response = await fetch(`${API_URL}/api/telegram/notify-booking-ending`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            console.error('❌ Ошибка отправки уведомления о завершении времени брони');
          }
        } catch (error) {
          console.error('❌ Ошибка отправки уведомления о завершении времени:', error);
        }
      }

      const validPrefixes = new Set(bookings.map(b => `${b.id}_`));
      const cleaned = new Set(
        Array.from(notified).filter(key => {
          for (const prefix of Array.from(validPrefixes)) {
            if (key.startsWith(prefix)) return true;
          }
          return false;
        })
      );
      if (cleaned.size !== notified.size) {
        notifiedEndingBookingsRef.current = cleaned;
        saveNotifiedEndingBookings(cleaned);
      }
    };

    const interval = setInterval(checkBookingEndingAndNotify, 15 * 1000);
    return () => clearInterval(interval);
  }, [bookings, currentBranch, tables]);

  // Уведомление в момент окончания брони (поле "До времени")
  useEffect(() => {
    const checkBookingEndedAndNotify = async () => {
      const notified = notifiedEndedBookingsRef.current;
      const testTimeOverride = localStorage.getItem('appTimeOverride');

      for (const booking of bookings) {
        if (booking.branch !== currentBranch || !booking.endTime) continue;
        const endedInfo = getEndedInfo(booking);
        if (!endedInfo) continue;

        const notificationKey = `${booking.id}_${booking.endTime}`;
        if (notified.has(notificationKey)) continue;

        notified.add(notificationKey);
        saveNotifiedEndedBookings(notified);

        const table = tables.find(t => String(t.id) === String(booking.tableId));
        const zoneName = table?.name || `Зона ${booking.tableId}`;

        try {
          const payload: any = {
            branch: booking.branch,
            zoneName,
            guestName: booking.name,
            endTime: booking.endTime,
            minutesOver: endedInfo.minutesOver
          };
          if (testTimeOverride) {
            payload.testDate = testTimeOverride;
          }

          const response = await fetch(`${API_URL}/api/telegram/notify-booking-ended`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) {
            console.error('❌ Ошибка отправки уведомления об окончании брони');
          }
        } catch (error) {
          console.error('❌ Ошибка отправки уведомления об окончании времени:', error);
        }
      }

      const validPrefixes = new Set(bookings.map(b => `${b.id}_`));
      const cleaned = new Set(
        Array.from(notified).filter(key =>
          Array.from(validPrefixes).some(prefix => key.startsWith(prefix))
        )
      );
      if (cleaned.size !== notified.size) {
        notifiedEndedBookingsRef.current = cleaned;
        saveNotifiedEndedBookings(cleaned);
      }
    };

    const interval = setInterval(checkBookingEndedAndNotify, 15 * 1000);
    return () => clearInterval(interval);
  }, [bookings, currentBranch, tables]);

  // ========== КОНЕЦ ЛОГИКИ ПРОВЕРКИ ЗАДАЧ ==========

  // Ежедневное уведомление в 18:50, если есть хотя бы одна HH-бронирование в текущем филиале
  useEffect(() => {
    let alertedKey = `hh_alerted_${getNow().toDateString()}`;
    if (localStorage.getItem(alertedKey)) return;

    const checkAndAlert = () => {
      const now = getNow();
      if (now.getHours() === 18 && now.getMinutes() === 50) {
        const hasHH = bookings.some(b => b.branch === currentBranch && b.isHappyHours);
        if (hasHH) {
          alert('Напоминание: Счастливые часы!');
          localStorage.setItem(alertedKey, '1');
        }
      }
    };

    const interval = setInterval(checkAndAlert, 1000 * 5); // чаще, чтобы мигание началось вовремя
    return () => clearInterval(interval);
  }, [bookings, currentBranch]);

  // Подсчёт активных и ожидающих бронирований
  const activeCount = bookings.filter(b => b.branch === currentBranch && b.isActive).length;
  const waitingCount = bookings.filter(b => b.branch === currentBranch && !b.isActive).length;
  const currentWaitlist = waitlist.filter(item => item.branch === currentBranch);

  useEffect(() => {
    localStorage.setItem('waitlistPanelVisible', String(isWaitlistVisible));
  }, [isWaitlistVisible]);

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
                  onFocus={() => setEditTimeTarget('time')}
                  required
                  style={{ marginBottom: '4px' }}
                />
                <input
                  name="endTime"
                  type="time"
                  value={editForm.endTime}
                  onChange={handleEditFormChange}
                  onFocus={() => setEditTimeTarget('endTime')}
                  style={{ marginBottom: '4px' }}
                  placeholder="До времени"
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
                      onClick={() =>
                        setEditForm(prev => ({ ...prev, [editTimeTarget]: time }))
                      }
                      className={`time-button ${(editTimeTarget === 'endTime' ? editForm.endTime : editForm.time) === time ? 'active' : ''}`}
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
                      onClick={() =>
                        setEditForm(prev => ({ ...prev, [editTimeTarget]: time }))
                      }
                      style={{
                        background: (editTimeTarget === 'endTime' ? editForm.endTime : editForm.time) === time ? '#10b981' : '#f3f4f6',
                        color: (editTimeTarget === 'endTime' ? editForm.endTime : editForm.time) === time ? 'white' : '#374151',
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

            <div style={{display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap'}}>
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
              <label style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px'}}>
                <input
                  name="isHappyHours"
                  type="checkbox"
                  checked={editForm.isHappyHours}
                  onChange={handleEditFormChange}
                />
                Счастливые часы
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: '700'}}>
                <input
                  name="smokingTimer"
                  type="checkbox"
                  checked={editForm.smokingTimer}
                  onChange={handleEditFormChange}
                />
                МНЕ ТОЛЬКО ПОКУРИТЬ
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

  const handleWaitlistInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setWaitlistForm(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleAddWaitlistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistForm.name.trim() || !waitlistForm.phone.trim() || !waitlistForm.validUntil.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: waitlistForm.name.trim(),
          phone: waitlistForm.phone.trim(),
          validUntil: waitlistForm.validUntil.trim(),
          branch: currentBranch,
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to add waitlist item');
      }
      const created = await res.json();
      setWaitlist(prev => [created, ...prev]);
      setWaitlistForm({
        name: '',
        phone: '',
        validUntil: '',
      });
    } catch (error) {
      console.error('Error adding waitlist item:', error);
      alert('Не удалось добавить в лист ожидания');
    }
  };

  const handleRemoveWaitlistItem = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/waitlist/${id}`, { method: 'DELETE' });
      setWaitlist(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error removing waitlist item:', error);
      alert('Не удалось удалить запись из листа ожидания');
    }
  };

  const handleClearWaitlist = async () => {
    if (!window.confirm(`Очистить весь лист ожидания для "${currentBranch}"?`)) return;
    try {
      await fetch(`${API_URL}/api/waitlist?branch=${encodeURIComponent(currentBranch)}`, {
        method: 'DELETE',
      });
      setWaitlist(prev => prev.filter(item => item.branch !== currentBranch));
    } catch (error) {
      console.error('Error clearing waitlist:', error);
      alert('Не удалось очистить лист ожидания');
    }
  };

  // Получить активные вызовы для стола
  const getTableCalls = (tableId: number): TableCall[] => {
    return tableCalls.filter(call => 
      call.tableId === tableId && 
      call.branch === currentBranch &&
      !call.resolved
    );
  };

  // Закрыть вызов
  const handleResolveCall = async (callId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await fetch(`${API_URL}/api/table-calls/${callId}/resolve`, {
        method: 'PUT',
      });
      
      // Обновляем список вызовов
      setTableCalls(prev => prev.filter(call => call.id !== callId));
      
      console.log(`✅ Вызов ${callId} закрыт`);
    } catch (error) {
      console.error('Error resolving call:', error);
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
        <div className="brand">
          <img src={logoUrl} alt="logo" className="brand-logo" />
          <div>
            <h1>Канбан-доска броней</h1>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={onOpenAdmin} className="admin-btn">
                ⚙️ Админ панель
              </button>
              <button onClick={handleLogout} className="admin-btn" style={{ background: '#dc2626' }}>
                🚪 Выход
              </button>
            </div>
          </div>
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
          
          {/* Информация о смене */}
          {currentShift && (
            <div className="shift-info">
              <span className="shift-label">👥 На смене:</span>
              <span className="shift-staff">
                👨‍💼 {currentShift.admin} | 🎮 {currentShift.gamemaster}
              </span>
              {!currentShift.isActual && (
                <span 
                  className="shift-warning" 
                  title={`Смена на сегодня не назначена. Показаны данные за ${currentShift.date}`}
                >
                  ⚠️ за {currentShift.date}
                </span>
              )}
            </div>
          )}
          
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
            {localStorage.getItem('appTimeOverride') && (
              <span className="stat-item" title={`Тестовое время: ${new Date(localStorage.getItem('appTimeOverride') || '').toLocaleString()}`} style={{ background: '#fde68a', color: '#92400e', padding: '2px 6px', borderRadius: '6px' }}>
                Тест-время активно
              </span>
            )}
            {localStorage.getItem('smokingTimerTestMode') === 'true' && (
              <span className="stat-item" title="Таймер курения = 30 секунд (тест-режим)" style={{ background: '#d1fae5', color: '#065f46', padding: '2px 6px', borderRadius: '6px', fontWeight: '600' }}>
                🚬 Тест-таймер: 30 сек
              </span>
            )}
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
            title="Обновить данные"
          >
            🔄 Данные
          </button>
          <button 
            onClick={loadCurrentShift}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            title="Обновить смену из Google Sheets"
          >
            👥 Смена
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
        <div className="kanban-area">
          <div className="kanban-board-content">
            {currentTables.map((table) => {
              const activeCalls = getTableCalls(table.id);
              const hasWaiterCall = activeCalls.some(call => call.callType === 'waiter');
              const hasHookahCall = activeCalls.some(call => call.callType === 'hookah');
              
              return (
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
            className={`zone-card ${table.isNotCleaned ? 'not-cleaned' : ''} ${activeCalls.length > 0 ? 'has-call' : ''}`}
            style={{ position: 'relative', cursor: 'pointer' }}
              >
                <div className="zone-card-header">
                  {table.name}
                  {table.isNotCleaned && (
                    <div className="not-cleaned-indicator">Не убрана</div>
                  )}
                  {/* Индикаторы вызовов */}
                  {activeCalls.length > 0 && (
                    <div className="call-indicators">
                      {activeCalls.map(call => (
                        <div 
                          key={call.id} 
                          className={`call-indicator ${call.callType}`}
                          onClick={(e) => handleResolveCall(call.id, e)}
                          title={`Закрыть вызов: ${call.callType === 'waiter' ? 'Сотрудник' : 'Кальянщик'}`}
                        >
                          <span className="call-icon">
                            {call.callType === 'waiter' ? '👨‍💼' : call.callType === 'hookah' ? '🌬️' : '🎮'}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                            <span className="call-label">
                              {call.callType === 'waiter' ? 'Администратор' : call.callType === 'hookah' ? 'Кальянный мастер' : 'Игровед / PS5'}
                            </span>
                            {call.comment && (
                              <span className="call-comment">
                                💬 {call.comment}
                              </span>
                            )}
                          </div>
                          {call.count && call.count > 1 && (
                            <span className="call-count">×{call.count}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="zone-card-body">
                  {currentBookings.filter(b => String(b.tableId) === String(table.id)).length === 0 && (
                    <div className="no-bookings">Нет броней</div>
                  )}
                  {currentBookings.filter(b => String(b.tableId) === String(table.id)).map((b) => {
                    const smokingTimerText = formatSmokingTimer(b);
                    const isTimerExpired = isSmokingTimerExpired(b);
                    const endingSoonInfo = getEndingSoonInfo(b);
                    const activeDurationText = formatActiveDuration(b);
                    
                    return (
                <div
                  key={b.id}
                  draggable
                  onDragStart={() => handleDragStart(b)}
                  onClick={(e) => e.stopPropagation()}
                  className={`booking-card ${b.isActive ? 'green' : 'red'} ${shouldHighlightHH(b) ? 'hh-active' : ''} ${shouldBlinkHH(b) ? 'hh-blink' : ''} ${isTimerExpired ? 'smoking-timer-expired' : ''} ${endingSoonInfo ? 'booking-ending-soon' : ''} ${activeDurationText ? 'has-active-timer' : ''}`}
                    >
                      {activeDurationText && (
                        <div className="booking-active-timer">
                          {activeDurationText}
                        </div>
                      )}
                      {/* Таймер курения в левом верхнем углу */}
                      {smokingTimerText && (
                        <div className={`smoking-timer ${isTimerExpired ? 'expired' : ''}`}>
                          {smokingTimerText}
                        </div>
                      )}
                      <div className="booking-time">{b.time}{b.endTime ? ` - ${b.endTime}` : ''}</div>
                      {endingSoonInfo && (
                        <div className="booking-ending-warning">{endingSoonInfo.label}</div>
                      )}
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
                    );
                  })}
                </div>
                <div className="zone-card-footer">{table.capacity} чел.</div>
                </div>
              );
            })}
            </div>
          </div>
        {isWaitlistVisible ? (
        <aside className="waitlist-panel">
          <div className="waitlist-panel-header">
            <h3>Лист ожидания</h3>
            <div className="waitlist-header-actions">
              <span className="waitlist-count">{currentWaitlist.length}</span>
              <button
                type="button"
                className="waitlist-toggle-btn"
                onClick={() => setIsWaitlistVisible(false)}
              >
                Скрыть
              </button>
            </div>
          </div>
          <form className="waitlist-form" onSubmit={handleAddWaitlistItem}>
            <input
              name="name"
              value={waitlistForm.name}
              onChange={handleWaitlistInputChange}
              placeholder="Имя гостя"
              required
            />
            <div className="waitlist-row">
              <input
                name="phone"
                type="tel"
                value={waitlistForm.phone}
                onChange={handleWaitlistInputChange}
                placeholder="Номер телефона"
                required
              />
              <input
                name="validUntil"
                type="time"
                value={waitlistForm.validUntil}
                onChange={handleWaitlistInputChange}
                title="До скольки актуально"
                required
              />
            </div>
            <button type="submit" className="waitlist-add-btn">
              Добавить в лист
            </button>
          </form>
          <div className="waitlist-items">
            {currentWaitlist.length === 0 && (
              <div className="waitlist-empty">Пока никого нет в ожидании</div>
            )}
            {currentWaitlist.map((item) => (
              <div
                className="waitlist-item"
                key={item.id}
                draggable
                onDragStart={() => handleWaitlistDragStart(item)}
                onDragEnd={handleWaitlistDragEnd}
              >
                <div className="waitlist-item-main">
                  <div className="waitlist-item-name">{item.name}</div>
                  <div className="waitlist-item-meta">
                    📞 {item.phone}
                  </div>
                  <div className="waitlist-item-meta">
                    ⏰ до {item.validUntil || 'не указано'}
                  </div>
                </div>
                <button
                  type="button"
                  className="waitlist-remove-btn"
                  onClick={() => handleRemoveWaitlistItem(item.id)}
                  title="Убрать из листа ожидания"
                >
                  ✖
                </button>
              </div>
            ))}
          </div>
          {currentWaitlist.length > 0 && (
            <button
              type="button"
              className="waitlist-clear-btn"
              onClick={handleClearWaitlist}
            >
              Очистить лист
            </button>
          )}
        </aside>
        ) : (
          <button
            type="button"
            className="waitlist-show-btn"
            onClick={() => setIsWaitlistVisible(true)}
          >
            Лист ожидания ({currentWaitlist.length})
          </button>
        )}
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
          onMouseDown={handleQuickDragStart}
          onClick={(e) => e.stopPropagation()}
        >
          <h3>
            Быстрое бронирование - {tables.find(t => t.id === quickBooking.tableId)?.name}
          </h3>
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
                onFocus={() => setQuickTimeTarget('time')}
                required
              />
              <input
                name="endTime"
                type="time"
                value={quickForm.endTime}
                onChange={handleQuickFormChange}
                onFocus={() => setQuickTimeTarget('endTime')}
                placeholder="До времени"
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
                    onClick={() =>
                      setQuickForm(prev => ({ ...prev, [quickTimeTarget]: time }))
                    }
                    className={`quick-time-button ${(quickTimeTarget === 'endTime' ? quickForm.endTime : quickForm.time) === time ? 'active' : ''}`}
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

            <div>
              <label>Комментарий</label>
              <textarea
                name="comment"
                value={quickForm.comment}
                onChange={handleQuickFormChange}
                placeholder="Дополнительная информация"
                rows={2}
              />
            </div>

            <div className="checkbox-row" style={{display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px'}}>
                <input
                  name="hasVR"
                  type="checkbox"
                  checked={quickForm.hasVR}
                  onChange={handleQuickFormChange}
                />
                VR
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px'}}>
                <input
                  name="hasShisha"
                  type="checkbox"
                  checked={quickForm.hasShisha}
                  onChange={handleQuickFormChange}
                />
                Кальян
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px'}}>
                <input
                  name="isHappyHours"
                  type="checkbox"
                  checked={quickForm.isHappyHours}
                  onChange={handleQuickFormChange}
                />
                Счастливые часы
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '16px', fontWeight: '700'}}>
                <input
                  name="smokingTimer"
                  type="checkbox"
                  checked={quickForm.smokingTimer}
                  onChange={handleQuickFormChange}
                />
                МНЕ ТОЛЬКО ПОКУРИТЬ
              </label>
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
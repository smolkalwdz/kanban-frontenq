import React, { useState, useEffect } from 'react';

interface Table {
  id: number;
  name: string;
  capacity: number;
  branch: string;
}

// URL backend-сервера
const API_URL = process.env.REACT_APP_API_URL || 'https://smolkalwdz-kanban-backend-3d00.twc1.net';

interface AdminPanelProps {
  onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [currentBranch, setCurrentBranch] = useState<'МСК' | 'Полевая'>('МСК');
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editForm, setEditForm] = useState({ name: '', capacity: 4 });
  const [addForm, setAddForm] = useState({ name: '', capacity: 4 });
  const [isAddingTable, setIsAddingTable] = useState(false);

  // Загрузка зон
  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const res = await fetch(`${API_URL}/api/zones`);
      const data = await res.json();
      setTables(data);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

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

  return (
    <div>
      {/* Заголовок */}
      <div className="header">
        <div>
          <h1>⚙️ Админ панель - Управление зонами</h1>
          <button onClick={onBack} className="back-btn">
            ← Вернуться к доске
          </button>
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

      <div className="admin-content">
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
      </div>
    </div>
  );
};

export default AdminPanel; 
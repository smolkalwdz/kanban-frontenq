import React, { useState, useEffect } from 'react';
import { API_URL } from './config';
import './TableCall.css';

interface TableCallProps {
  branch: string;
  tableId: string;
}

type CallType = 'waiter' | 'hookah' | 'gamemaster';

interface FoodPartner {
  name: string;
  offer: string;
  promoCode: string;
  note?: string;
  buttonLabel: string;
  url: string;
  phone?: string;
}

const TableCall: React.FC<TableCallProps> = ({ branch, tableId }) => {
  const logoSrc = `${process.env.PUBLIC_URL}/logo2.png`;
  const isMoscowBranch = branch === 'МСК';
  const isPolevayaBranch = branch === 'Полевая';
  const hasFoodPartners = isMoscowBranch || isPolevayaBranch;
  const [tableName, setTableName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // Состояние модального окна
  const [showModal, setShowModal] = useState(false);
  const [showFoodPartners, setShowFoodPartners] = useState(false);
  const [customComment, setCustomComment] = useState('');

  const deliveryAddress = isMoscowBranch ? 'Московское шоссе, 43' : isPolevayaBranch ? 'Полевая, 72' : '';

  const foodPartners: FoodPartner[] = isPolevayaBranch
    ? [
        {
          name: 'Додо Пицца',
          offer: 'Скидка 15% на заказ.',
          promoCode: 'Dungeon3',
          note: 'Укажите адрес доставки: Полевая, 72.',
          buttonLabel: 'Заказать в Додо',
          url: 'https://dodopizza.ru/',
        },
        {
          name: 'Квадратик',
          offer: 'Скидка 10% на заказ.',
          promoCode: 'Dungeon',
          buttonLabel: 'Заказать в Квадратик',
          url: 'https://kpizza.ru/',
        },
        {
          name: 'О! Суши',
          offer: 'Жареный ролл в подарок при заказе от 1500 рублей.',
          promoCode: 'SAM1DUNG',
          buttonLabel: 'Заказать в О! Суши',
          url: 'https://taplink.io/id:014602267:e3b8',
        },
        {
          name: 'Гусь Бургер',
          offer: 'Скидка 10% на заказ.',
          promoCode: 'DUNGEON',
          note: 'Доставка оплачивается отдельно.',
          buttonLabel: 'Заказать в Гусь Бургер',
          url: 'https://gusburger.ru/',
        },
        {
          name: 'Капибара',
          offer: 'Доставка суши и роллов. Скидка 15% при заказе от 1490 рублей.',
          promoCode: 'LOUNGE',
          note: 'Адрес партнёра: ул. Мичурина, д. 149.',
          buttonLabel: 'Заказать в Капибара',
          url: 'https://onelink.to/5rzxc5',
          phone: '+79991188111',
        },
      ]
    : isMoscowBranch
      ? [
          {
            name: 'Додо Пицца',
            offer: 'Скидка 15% на заказ.',
            promoCode: 'Dungeon2',
            note: 'Укажите адрес доставки: Московское шоссе, 43.',
            buttonLabel: 'Заказать в Додо',
            url: 'https://dodopizza.ru/',
          },
          {
            name: 'Квадратик',
            offer: 'Скидка 10% на заказ.',
            promoCode: 'Dungeon',
            buttonLabel: 'Заказать в Квадратик',
            url: 'https://kpizza.ru/',
          },
          {
            name: 'О! Суши',
            offer: 'Жареный ролл в подарок при заказе от 1500 рублей.',
            promoCode: 'SAM1DUNG',
            buttonLabel: 'Заказать в О! Суши',
            url: 'https://taplink.io/id:014602267:e3b8',
          },
          {
            name: 'Гусь Бургер',
            offer: 'Скидка 10% на заказ.',
            promoCode: 'DUNGEON',
            note: 'Доставка оплачивается отдельно.',
            buttonLabel: 'Заказать в Гусь Бургер',
            url: 'https://gusburger.ru/',
          },
          {
            name: 'Капибара',
            offer: 'Доставка суши и роллов. Скидка 15% при заказе от 1490 рублей.',
            promoCode: 'LOUNGE',
            note: 'Адрес партнёра: ул. Мичурина, д. 149.',
            buttonLabel: 'Заказать в Капибара',
            url: 'https://onelink.to/5rzxc5',
            phone: '+79991188111',
          },
        ]
      : [];

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
        if (callType === 'waiter') {
          successMessage = comment 
            ? `✅ Запрос отправлен: ${comment}. Скоро подойдёт.`
            : '✅ Сотрудник вызван! Скоро подойдёт.';
        } else if (callType === 'hookah') {
          successMessage = comment 
            ? `✅ Запрос отправлен: ${comment}. Скоро подойдёт.`
            : '✅ Кальянный мастер вызван! Скоро подойдёт.';
        } else if (callType === 'gamemaster') {
          successMessage = comment 
            ? `✅ Запрос отправлен: ${comment}. Скоро подойдёт.`
            : '✅ Игровед вызван! Скоро подойдёт.';
        }

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

          {hasFoodPartners && (
            <button
              className="call-button food-order"
              onClick={() => setShowFoodPartners(prev => !prev)}
              type="button"
            >
              <span className="call-icon">🍔</span>
              <span className="call-text">
                {showFoodPartners ? 'СКРЫТЬ ПАРТНЕРОВ' : 'ЗАКАЗАТЬ ЕДУ'}
              </span>
            </button>
          )}

          <a 
            href="https://vk.com/@dungeon_samara-vo-chto-poigrat-v-taim-kafe-dungeon" 
            target="_blank" 
            rel="noopener noreferrer"
            className="call-button games-link"
          >
            <span className="call-icon">🎲</span>
            <span className="call-text">НАШИ ИГРЫ</span>
          </a>

          <a 
            href="https://vk.com/@dungeon_samara-akcii-taim-kafe-dungeon" 
            target="_blank" 
            rel="noopener noreferrer"
            className="call-button games-link"
          >
            <span className="call-icon">🎁</span>
            <span className="call-text">НАШИ АКЦИИ</span>
          </a>

          <a 
            href="https://t.me/DUNGEON_K_BOT" 
            target="_blank" 
            rel="noopener noreferrer"
            className="call-button games-link"
            title="5 кальянов скуриваете - 6 бесплатный"
          >
            <span className="call-icon">🚬</span>
            <span className="call-text">6 КАЛЬЯН БЕСПЛАТНО</span>
          </a>
        </div>

        {hasFoodPartners && showFoodPartners && (
          <div className="food-partners-section">
            <div className="food-partners-header">
              <h3>Партнеры доставки</h3>
              <p>Выберите заведение, оформите заказ и укажите адрес: {deliveryAddress}.</p>
            </div>

            <div className="food-partners-list">
              {foodPartners.map((partner) => (
                <div key={partner.name} className="food-partner-card">
                  <div className="food-partner-content">
                    <h4>{partner.name}</h4>
                    <p>{partner.offer}</p>
                    <div className="food-partner-meta">
                      <span className="food-partner-label">Промокод:</span>
                      <span className="food-partner-code">{partner.promoCode}</span>
                    </div>
                    {partner.note && (
                      <p className="food-partner-note">{partner.note}</p>
                    )}
                  </div>

                  <a
                    href={partner.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="food-order-link"
                  >
                    {partner.buttonLabel}
                  </a>

                  {partner.phone && (
                    <a
                      href={`tel:${partner.phone}`}
                      className="food-order-link food-call-link"
                    >
                      Позвонить
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

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
                onClick={() => handleCall('gamemaster', 'Заменить Геймпад')}
              >
                🎮 Заменить Геймпад
              </button>
              
              <button 
                className="modal-option-btn"
                onClick={() => handleCall('waiter', 'Выключается телевизор')}
              >
                📺 Выключается телевизор
              </button>

              <button 
                className="modal-option-btn"
                onClick={() => handleCall('hookah', 'Заказать Кальян')}
              >
                🌬️ Заказать Кальян
              </button>

              <button 
                className="modal-option-btn"
                onClick={() => handleCall('hookah', 'Вызвать Кальянного Мастера')}
              >
                👨‍🔧 Вызвать Кальянного Мастера
              </button>

              <button 
                className="modal-option-btn"
                onClick={() => handleCall('hookah', 'Забрать Кальян')}
              >
                🚪 Забрать Кальян
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

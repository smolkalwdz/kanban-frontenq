import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { API_URL } from './config';
import './QRGenerator.css';

interface Table {
  id: number;
  name: string;
  capacity: number;
  branch: string;
}

const QRGenerator: React.FC = () => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<'МСК' | 'Полевая' | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const logoSrc = `${process.env.PUBLIC_URL}/Logo1.png`;

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const response = await fetch(`${API_URL}/api/zones`);
      const data = await response.json();
      setTables(data.sort((a: Table, b: Table) => {
        const numA = parseInt(a.name.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.name.replace(/\D/g, '')) || 0;
        return numA - numB;
      }));
    } catch (error) {
      console.error('Error loading tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTables = selectedBranch === 'all' 
    ? tables 
    : tables.filter(t => t.branch === selectedBranch);

  const getTableUrl = (table: Table) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/table/${encodeURIComponent(table.branch)}/${table.id}`;
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="qr-generator-container">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="qr-generator-container">
      <div className="qr-controls no-print">
        <div className="controls-header">
           <img src={logoSrc} alt="logo" className="controls-logo"/>
           <h1>Генератор QR-кодов</h1>
        </div>
        
        <div className="filter-controls">
          <label>
            Филиал:
            <select 
              value={selectedBranch} 
              onChange={(e) => setSelectedBranch(e.target.value as 'МСК' | 'Полевая' | 'all')}
            >
              <option value="all">Все филиалы</option>
              <option value="МСК">МСК</option>
              <option value="Полевая">Полевая</option>
            </select>
          </label>

          <button onClick={handlePrint} className="print-button">
            🖨️ Печать
          </button>

          <button onClick={() => window.location.href = '/'} className="back-button">
            ← На доску
          </button>
        </div>

        <div className="info-panel">
          <p>📱 <strong>Инструкция:</strong> Выберите филиал, распечатайте и разместите на столах.</p>
        </div>
      </div>

      <div className="qr-grid">
        {filteredTables.map(table => (
          <div key={table.id} className="qr-card">
            <div className="qr-card-header">
              <div className="qr-logo-container">
                <img src={logoSrc} alt="logo" />
              </div>
              <div className="qr-branch">{table.branch}</div>
              <div className="qr-table-name">{table.name}</div>
            </div>
            
            <div className="qr-code-wrapper">
              <QRCodeSVG 
                value={getTableUrl(table)}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="qr-footer">
              <p className="qr-instruction">Наведите камеру<br/>для вызова персонала</p>
            </div>
          </div>
        ))}
      </div>

      {filteredTables.length === 0 && (
        <div className="empty-state">
          <p>Нет доступных столов для выбранного филиала</p>
        </div>
      )}
    </div>
  );
};

export default QRGenerator;

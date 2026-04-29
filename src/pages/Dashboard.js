import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems, addItem, updateItem, deleteItem, getLowStock, getExpiringSoon } from '../api';

const getCategoryEmoji = (cat) => {
  if (cat === 'dairy') return '🥛';
  if (cat === 'plant-based') return '🌱';
  return '🥦';
};

const ProgressBar = ({ quantity, threshold }) => {
  const max = Math.max(quantity, threshold * 2, 1);
  const pct = Math.min((quantity / max) * 100, 100);
  const color = quantity <= threshold ? '#e07b39' : '#52b788';
  return (
    <div style={{ backgroundColor: '#e8e0d5', borderRadius: '20px', height: '10px', margin: '10px 0', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, backgroundColor: color, height: '100%', borderRadius: '20px', transition: 'width 0.6s ease' }} />
    </div>
  );
};

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiringSoon, setExpiringSoon] = useState([]);
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'dairy', quantity: '', unit: '', expirationDate: '', lowStockThreshold: 2 });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const username = localStorage.getItem('username');

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'pantry-animations';
    style.textContent = `
      @keyframes floatA { 0%,100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-25px) rotate(8deg); } }
      @keyframes floatB { 0%,100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-35px) rotate(-8deg); } }
      @keyframes floatC { 0%,100% { transform: translateY(0px) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }
      @keyframes floatD { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
      .pantry-card { transition: transform 0.3s ease, box-shadow 0.3s ease !important; cursor: default; }
      .pantry-card:hover { transform: translateY(-6px) scale(1.02) !important; box-shadow: 0 20px 50px rgba(61,107,79,0.25) !important; }
      .action-btn { transition: all 0.2s ease !important; }
      .action-btn:hover { transform: scale(1.05) !important; }
      .add-btn-main:hover { transform: scale(1.05) !important; box-shadow: 0 8px 24px rgba(61,107,79,0.5) !important; }
    `;
    document.head.appendChild(style);
    return () => { const el = document.getElementById('pantry-animations'); if (el) el.remove(); };
  }, []);

  const fetchAll = async () => {
    try {
      const [itemsRes, lowRes, expRes] = await Promise.all([
        getItems({ category, sortBy }),
        getLowStock(),
        getExpiringSoon()
      ]);
      setItems(itemsRes.data);
      setLowStock(lowRes.data);
      setExpiringSoon(expRes.data);
    } catch (err) {
      if (err.response?.status === 401) navigate('/');
    }
  };

  useEffect(() => { fetchAll(); }, [category, sortBy]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await addItem({ ...form, quantity: Number(form.quantity), lowStockThreshold: Number(form.lowStockThreshold) });
      setForm({ name: '', category: 'dairy', quantity: '', unit: '', expirationDate: '', lowStockThreshold: 2 });
      setShowForm(false);
      fetchAll();
    } catch (err) { setError('Failed to add item'); }
  };

  const handleConsume = async (item) => {
    if (item.quantity <= 0) return;
    await updateItem(item._id, { quantity: item.quantity - 1 });
    fetchAll();
  };

  const handleDelete = async (id) => {
    await deleteItem(id);
    fetchAll();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    navigate('/');
  };

  const getExpirationColor = (date) => {
    const days = Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
    if (days <= 3) return '#c0392b';
    if (days <= 7) return '#e07b39';
    return '#52b788';
  };

  const getDaysUntilExpiry = (date) => {
    return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f1eb', fontFamily: "'Segoe UI', sans-serif", position: 'relative', overflow: 'hidden' }}>

      {/* Animated Background Orbs */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,195,74,0.15), transparent)', top: '-100px', left: '-150px', animation: 'floatA 9s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,83,0.12), transparent)', top: '20%', right: '-80px', animation: 'floatB 11s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(61,107,79,0.1), transparent)', bottom: '5%', left: '10%', animation: 'floatC 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: '180px', height: '180px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,195,74,0.1), transparent)', bottom: '25%', right: '20%', animation: 'floatD 7s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', fontSize: '80px', opacity: 0.06, top: '15%', left: '5%', animation: 'floatA 12s ease-in-out infinite' }}>🌿</div>
        <div style={{ position: 'absolute', fontSize: '60px', opacity: 0.06, bottom: '20%', right: '8%', animation: 'floatB 10s ease-in-out infinite' }}>🌱</div>
        <div style={{ position: 'absolute', fontSize: '50px', opacity: 0.05, top: '50%', left: '50%', animation: 'floatC 14s ease-in-out infinite' }}>🥗</div>
      </div>

      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 1, padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', background: 'linear-gradient(135deg, #2c5f2d, #3d6b4f, #52b788)', padding: '22px 32px', borderRadius: '20px', boxShadow: '0 8px 32px rgba(44,95,45,0.35)' }}>
          <div>
            <h1 style={{ color: 'white', margin: 0, fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>🥗 Protein Pantry Tracker</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: '4px 0 0', fontSize: '14px' }}>Your personal protein management hub</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '12px' }}>Logged in as</p>
              <p style={{ color: 'white', margin: 0, fontWeight: '700', fontSize: '16px' }}>👤 {username}</p>
            </div>
            <button className="action-btn" style={{ padding: '10px 22px', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '2px solid rgba(255,255,255,0.4)', borderRadius: '25px', cursor: 'pointer', fontWeight: '700', backdropFilter: 'blur(10px)', fontSize: '14px' }} onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total Items', value: items.length, emoji: '📦', color: '#3d6b4f', bg: '#e8f5e9' },
            { label: 'Low Stock', value: lowStock.length, emoji: '⚠️', color: '#e07b39', bg: '#fff3e0' },
            { label: 'Expiring Soon', value: expiringSoon.length, emoji: '📅', color: '#c0392b', bg: '#fdecea' },
          ].map(stat => (
            <div key={stat.label} style={{ backgroundColor: stat.bg, padding: '20px', borderRadius: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', borderLeft: `4px solid ${stat.color}`, display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '36px' }}>{stat.emoji}</span>
              <div>
                <p style={{ margin: 0, fontSize: '32px', fontWeight: '800', color: stat.color }}>{stat.value}</p>
                <p style={{ margin: 0, fontSize: '13px', color: '#666', fontWeight: '600' }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Alert Panels */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {lowStock.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg, #fff8e1, #fff3cd)', color: '#856404', padding: '20px 24px', borderRadius: '16px', flex: 1, minWidth: '250px', boxShadow: '0 4px 16px rgba(133,100,4,0.15)', borderLeft: '5px solid #ffc107' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '16px' }}>⚠️ Low Stock Alert</h3>
              {lowStock.map(i => <p key={i._id} style={{ margin: '4px 0', fontSize: '14px' }}>• {getCategoryEmoji(i.category)} {i.name} — only <strong>{i.quantity} {i.unit}</strong> left</p>)}
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div style={{ background: 'linear-gradient(135deg, #fdecea, #fce4e4)', color: '#842029', padding: '20px 24px', borderRadius: '16px', flex: 1, minWidth: '250px', boxShadow: '0 4px 16px rgba(132,32,41,0.15)', borderLeft: '5px solid #dc3545' }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '16px' }}>🚨 Expiring Soon</h3>
              {expiringSoon.map(i => <p key={i._id} style={{ margin: '4px 0', fontSize: '14px' }}>• {getCategoryEmoji(i.category)} {i.name} — <strong>{getDaysUntilExpiry(i.expirationDate)} days</strong> left</p>)}
            </div>
          )}
        </div>

        {/* Filters + Add Button */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'white', padding: '16px 20px', borderRadius: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <span style={{ color: '#666', fontSize: '14px', fontWeight: '600' }}>Filter:</span>
          <select style={{ padding: '10px 16px', borderRadius: '25px', border: '2px solid #e8e0d5', fontSize: '14px', backgroundColor: '#fafaf8', color: '#333', cursor: 'pointer', outline: 'none' }} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">🌿 All Categories</option>
            <option value="dairy">🥛 Dairy</option>
            <option value="plant-based">🌱 Plant-Based</option>
            <option value="whole food">🥦 Whole Food</option>
          </select>
          <select style={{ padding: '10px 16px', borderRadius: '25px', border: '2px solid #e8e0d5', fontSize: '14px', backgroundColor: '#fafaf8', color: '#333', cursor: 'pointer', outline: 'none' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="">📊 Sort By</option>
            <option value="expiration">📅 Expiration Date</option>
            <option value="quantity">📦 Quantity</option>
          </select>
          <button className="add-btn-main action-btn" style={{ padding: '10px 26px', background: 'linear-gradient(135deg, #2c5f2d, #52b788)', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', boxShadow: '0 4px 16px rgba(44,95,45,0.3)', marginLeft: 'auto' }} onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancel' : '+ Add Item'}
          </button>
        </div>

        {/* Add Item Form */}
        {showForm && (
          <div style={{ background: 'white', padding: '28px', borderRadius: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', marginBottom: '24px', borderTop: '5px solid #52b788' }}>
            <h3 style={{ color: '#2c5f2d', marginBottom: '20px', fontSize: '20px' }}>🌿 Add New Protein Item</h3>
            {error && <p style={{ color: '#c0392b', backgroundColor: '#fdecea', padding: '10px', borderRadius: '8px' }}>{error}</p>}
            <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <input style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #e8e0d5', fontSize: '14px', outline: 'none', backgroundColor: '#fafaf8' }} placeholder="🥗 Name (e.g. Greek Yogurt)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <select style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #e8e0d5', fontSize: '14px', backgroundColor: '#fafaf8' }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="dairy">🥛 Dairy</option>
                <option value="plant-based">🌱 Plant-Based</option>
                <option value="whole food">🥦 Whole Food</option>
              </select>
              <input style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #e8e0d5', fontSize: '14px', backgroundColor: '#fafaf8' }} type="number" placeholder="📦 Quantity" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
              <input style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #e8e0d5', fontSize: '14px', backgroundColor: '#fafaf8' }} placeholder="📏 Unit (cups, oz, lbs)" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} required />
              <input style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #e8e0d5', fontSize: '14px', backgroundColor: '#fafaf8' }} type="date" value={form.expirationDate} onChange={e => setForm({ ...form, expirationDate: e.target.value })} required />
              <input style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #e8e0d5', fontSize: '14px', backgroundColor: '#fafaf8' }} type="number" placeholder="⚠️ Low Stock Threshold" value={form.lowStockThreshold} onChange={e => setForm({ ...form, lowStockThreshold: e.target.value })} required />
              <button className="action-btn" style={{ gridColumn: '1 / -1', padding: '14px', background: 'linear-gradient(135deg, #2c5f2d, #52b788)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 16px rgba(44,95,45,0.3)' }} type="submit">🌿 Add to Pantry</button>
            </form>
          </div>
        )}

        {/* Items Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {items.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#888' }}>
              <p style={{ fontSize: '60px', margin: '0 0 16px' }}>🌱</p>
              <p style={{ fontSize: '18px', fontWeight: '600' }}>Your pantry is empty!</p>
              <p style={{ fontSize: '14px' }}>Click "+ Add Item" to get started</p>
            </div>
          )}
          {items.map(item => (
            <div key={item._id} className="pantry-card" style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderTop: `5px solid ${item.quantity <= item.lowStockThreshold ? '#e07b39' : '#52b788'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ color: '#2c3e1f', margin: '0 0 4px', fontSize: '20px', fontWeight: '800' }}>{item.name}</h3>
                  <span style={{ fontSize: '22px' }}>{getCategoryEmoji(item.category)}</span>
                  <span style={{ marginLeft: '6px', padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', backgroundColor: item.category === 'dairy' ? '#e3f2fd' : item.category === 'plant-based' ? '#e8f5e9' : '#fff3e0', color: item.category === 'dairy' ? '#1565c0' : item.category === 'plant-based' ? '#2e7d32' : '#e65100' }}>{item.category}</span>
                </div>
                {item.quantity <= item.lowStockThreshold && <span style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', border: '1px solid #ffc107' }}>⚠️ LOW</span>}
              </div>

              <p style={{ fontSize: '32px', fontWeight: '900', color: '#2c3e1f', margin: '8px 0 4px', letterSpacing: '-1px' }}>{item.quantity} <span style={{ fontSize: '16px', fontWeight: '500', color: '#888' }}>{item.unit}</span></p>

              <ProgressBar quantity={item.quantity} threshold={item.lowStockThreshold} />

              <p style={{ color: getExpirationColor(item.expirationDate), fontSize: '13px', margin: '8px 0', fontWeight: '600' }}>
                📅 Expires in {getDaysUntilExpiry(item.expirationDate)} days ({new Date(item.expirationDate).toLocaleDateString()})
              </p>

              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button className="action-btn" style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)', color: '#2d6a4f', border: '2px solid #52b788', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }} onClick={() => handleConsume(item)}>− Consume</button>
                <button className="action-btn" style={{ padding: '10px 14px', background: 'linear-gradient(135deg, #fdecea, #ffd5d5)', color: '#c0392b', border: '2px solid #e57373', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }} onClick={() => handleDelete(item._id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
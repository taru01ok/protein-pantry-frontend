import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems, addItem, updateItem, deleteItem, getLowStock, getExpiringSoon, generateRecipes } from '../api';

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
  const [showGrocery, setShowGrocery] = useState(false);
  const [showRecipes, setShowRecipes] = useState(false);
  const [recipes, setRecipes] = useState('');
  const [recipeFilter, setRecipeFilter] = useState('high protein');
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [groceryCopied, setGroceryCopied] = useState(false);
  const [form, setForm] = useState({
    name: '', category: 'dairy', quantity: '', unit: '',
    expirationDate: '', lowStockThreshold: 2, proteinGrams: 0
  });
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
      .pantry-card { transition: transform 0.3s ease, box-shadow 0.3s ease !important; }
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
      await addItem({
        ...form,
        quantity: Number(form.quantity),
        lowStockThreshold: Number(form.lowStockThreshold),
        proteinGrams: Number(form.proteinGrams)
      });
      setForm({ name: '', category: 'dairy', quantity: '', unit: '', expirationDate: '', lowStockThreshold: 2, proteinGrams: 0 });
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

  const generateGroceryList = () => {
    const list = [];
    lowStock.forEach(item => {
      list.push(`• ${getCategoryEmoji(item.category)} ${item.name} — need more (only ${item.quantity} ${item.unit} left)`);
    });
    expiringSoon.forEach(item => {
      if (!lowStock.find(l => l._id === item._id)) {
        list.push(`• ${getCategoryEmoji(item.category)} ${item.name} — expiring soon, consider replacing`);
      }
    });
    if (list.length === 0) list.push('✅ Your pantry looks well stocked!');
    return list.join('\n');
  };

  const handleGenerateRecipes = async () => {
    setLoadingRecipes(true);
    setShowRecipes(true);
    setRecipes('');
    try {
      const ingredientList = items.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ');
      const { data } = await generateRecipes({ ingredients: ingredientList, filter: recipeFilter });
      setRecipes(data.recipe);
    } catch (err) {
      setRecipes('Failed to generate recipes. Please try again.');
    }
    setLoadingRecipes(false);
  };

  // Nutrition calculations
  const dailyGoal = 150;
  const totalProtein = items.reduce((sum, i) => sum + (i.proteinGrams || 0) * i.quantity, 0);
  const daysRemaining = totalProtein > 0 ? (totalProtein / dailyGoal).toFixed(1) : 0;
  const byCategory = {
    dairy: items.filter(i => i.category === 'dairy').reduce((sum, i) => sum + (i.proteinGrams || 0) * i.quantity, 0),
    'plant-based': items.filter(i => i.category === 'plant-based').reduce((sum, i) => sum + (i.proteinGrams || 0) * i.quantity, 0),
    'whole food': items.filter(i => i.category === 'whole food').reduce((sum, i) => sum + (i.proteinGrams || 0) * i.quantity, 0),
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f1eb', fontFamily: "'Segoe UI', sans-serif", position: 'relative', overflow: 'hidden' }}>

      {/* Animated Background */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,195,74,0.15), transparent)', top: '-100px', left: '-150px', animation: 'floatA 9s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,83,0.12), transparent)', top: '20%', right: '-80px', animation: 'floatB 11s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(61,107,79,0.1), transparent)', bottom: '5%', left: '10%', animation: 'floatC 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', fontSize: '80px', opacity: 0.06, top: '15%', left: '5%', animation: 'floatA 12s ease-in-out infinite' }}>🌿</div>
        <div style={{ position: 'absolute', fontSize: '60px', opacity: 0.06, bottom: '20%', right: '8%', animation: 'floatB 10s ease-in-out infinite' }}>🌱</div>
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', background: 'linear-gradient(135deg, #2c5f2d, #3d6b4f, #52b788)', padding: '22px 32px', borderRadius: '20px', boxShadow: '0 8px 32px rgba(44,95,45,0.35)' }}>
          <div>
            <h1 style={{ color: 'white', margin: 0, fontSize: '28px', fontWeight: '800' }}>🥗 Protein Pantry Tracker</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: '4px 0 0', fontSize: '14px' }}>Your personal protein management hub</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: '12px' }}>Logged in as</p>
              <p style={{ color: 'white', margin: 0, fontWeight: '700', fontSize: '16px' }}>👤 {username}</p>
            </div>
            <button className="action-btn" onClick={handleLogout} style={{ padding: '10px 22px', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '2px solid rgba(255,255,255,0.4)', borderRadius: '25px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>Logout</button>
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

        {/* Nutrition Dashboard */}
        {items.length > 0 && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderTop: '5px solid #2c5f2d' }}>
            <h2 style={{ color: '#2c5f2d', margin: '0 0 20px', fontSize: '20px' }}>💪 Nutrition Dashboard</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              {[
                { value: `${totalProtein.toFixed(0)}g`, label: 'Total Protein at Home', bg: '#e8f5e9', color: '#2c5f2d' },
                { value: daysRemaining, label: `Days at ${dailyGoal}g/day Goal`, bg: '#f0faf0', color: '#2c5f2d' },
                { value: `${byCategory['dairy'].toFixed(0)}g`, label: '🥛 Dairy Protein', bg: '#e3f2fd', color: '#1565c0' },
                { value: `${byCategory['plant-based'].toFixed(0)}g`, label: '🌱 Plant Protein', bg: '#e8f5e9', color: '#2e7d32' },
                { value: `${byCategory['whole food'].toFixed(0)}g`, label: '🥦 Whole Food Protein', bg: '#fff3e0', color: '#e65100' },
                { value: daysRemaining < 3 ? '🚨' : daysRemaining < 7 ? '⚠️' : '✅', label: daysRemaining < 3 ? 'Restock Soon!' : daysRemaining < 7 ? 'Running Low' : 'Well Stocked', bg: daysRemaining < 3 ? '#fdecea' : '#f0faf0', color: '#555' },
              ].map((s, i) => (
                <div key={i} style={{ backgroundColor: s.bg, padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '32px', fontWeight: '900', color: s.color, margin: 0 }}>{s.value}</p>
                  <p style={{ color: '#555', margin: '6px 0 0', fontSize: '12px', fontWeight: '600' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grocery + Recipe Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button className="action-btn" onClick={() => setShowGrocery(!showGrocery)} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #e65100, #ff9800)', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', boxShadow: '0 4px 16px rgba(230,81,0,0.3)' }}>
            🛒 {showGrocery ? 'Hide' : 'Generate'} Grocery List
          </button>
          <button className="action-btn" onClick={() => setShowRecipes(!showRecipes)} style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #6a1b9a, #ab47bc)', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', boxShadow: '0 4px 16px rgba(106,27,154,0.3)' }}>
            🍳 {showRecipes ? 'Hide' : 'Generate'} AI Recipes
          </button>
        </div>

        {/* Grocery List */}
        {showGrocery && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderTop: '5px solid #ff9800' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ color: '#e65100', margin: 0, fontSize: '20px' }}>🛒 Smart Grocery List</h2>
              <button className="action-btn" onClick={() => { navigator.clipboard.writeText(generateGroceryList()); setGroceryCopied(true); setTimeout(() => setGroceryCopied(false), 2000); }} style={{ padding: '8px 20px', background: groceryCopied ? '#52b788' : '#e65100', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                {groceryCopied ? '✅ Copied!' : '📋 Copy List'}
              </button>
            </div>
            <pre style={{ backgroundColor: '#fff8f0', padding: '20px', borderRadius: '12px', fontSize: '15px', lineHeight: '2', color: '#333', whiteSpace: 'pre-wrap', margin: 0, border: '1px solid #ffe0b2' }}>
              {generateGroceryList()}
            </pre>
          </div>
        )}

        {/* AI Recipe Generator */}
        {showRecipes && (
          <div style={{ background: 'white', borderRadius: '20px', padding: '24px', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderTop: '5px solid #ab47bc' }}>
            <h2 style={{ color: '#6a1b9a', margin: '0 0 16px', fontSize: '20px' }}>🍳 AI Recipe Generator</h2>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {['high protein', 'under 500 calories', 'quick meals', 'meal prep'].map(filter => (
                <button key={filter} onClick={() => setRecipeFilter(filter)} style={{ padding: '8px 18px', borderRadius: '20px', border: '2px solid #ab47bc', backgroundColor: recipeFilter === filter ? '#ab47bc' : 'white', color: recipeFilter === filter ? 'white' : '#ab47bc', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                  {filter}
                </button>
              ))}
            </div>
            <button className="action-btn" onClick={handleGenerateRecipes} style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #6a1b9a, #ab47bc)', color: 'white', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', marginBottom: '16px' }}>
              {loadingRecipes ? '⏳ Generating...' : '✨ Generate Recipes'}
            </button>
            {recipes && (
              <div style={{ backgroundColor: '#fdf6ff', padding: '20px', borderRadius: '12px', fontSize: '15px', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap', border: '1px solid #e1bee7' }}>
                {recipes}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center', backgroundColor: 'white', padding: '16px 20px', borderRadius: '16px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <span style={{ color: '#666', fontSize: '14px', fontWeight: '600' }}>Filter:</span>
          <select style={{ padding: '10px 16px', borderRadius: '25px', border: '2px solid #e8e0d5', fontSize: '14px', backgroundColor: '#fafaf8', color: '#333', cursor: 'pointer' }} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">🌿 All Categories</option>
            <option value="dairy">🥛 Dairy</option>
            <option value="plant-based">🌱 Plant-Based</option>
            <option value="whole food">🥦 Whole Food</option>
          </select>
          <select style={{ padding: '10px 16px', borderRadius: '25px', border: '2px solid #e8e0d5', fontSize: '14px', backgroundColor: '#fafaf8', color: '#333', cursor: 'pointer' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="">📊 Sort By</option>
            <option value="expiration">📅 Expiration Date</option>
            <option value="quantity">📦 Quantity</option>
          </select>
          <button className="add-btn-main action-btn" onClick={() => setShowForm(!showForm)} style={{ padding: '10px 26px', background: 'linear-gradient(135deg, #2c5f2d, #52b788)', color: 'white', border: 'none', borderRadius: '25px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', boxShadow: '0 4px 16px rgba(44,95,45,0.3)', marginLeft: 'auto' }}>
            {showForm ? '✕ Cancel' : '+ Add Item'}
          </button>
        </div>

        {/* Add Item Form */}
        {showForm && (
          <div style={{ background: 'white', padding: '28px', borderRadius: '20px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', marginBottom: '24px', borderTop: '5px solid #52b788' }}>
            <h3 style={{ color: '#2c5f2d', marginBottom: '20px', fontSize: '20px' }}>🌿 Add New Protein Item</h3>
            {error && <p style={{ color: '#c0392b', backgroundColor: '#fdecea', padding: '10px', borderRadius: '8px' }}>{error}</p>}
            <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <input style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #e8e0d5', fontSize: '14px', backgroundColor: '#fafaf8' }} placeholder="🥗 Name (e.g. Greek Yogurt)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <select style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #e8e0d5', fontSize: '14px', backgroundColor: '#fafaf8' }} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="dairy">🥛 Dairy</option>
                <option value="plant-based">🌱 Plant-Based</option>
                <option value="whole food">🥦 Whole Food</option>
              </select>
              <input style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #e8e0d5', fontSize: '14px', backgroundColor: '#fafaf8' }} type="number" placeholder="📦 Quantity" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
              <input style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #e8e0d5', fontSize: '14px', backgroundColor: '#fafaf8' }} placeholder="📏 Unit (cups, oz, lbs)" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} required />
              <input style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #e8e0d5', fontSize: '14px', backgroundColor: '#fafaf8' }} type="date" value={form.expirationDate} onChange={e => setForm({ ...form, expirationDate: e.target.value })} required />
              <input style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #e8e0d5', fontSize: '14px', backgroundColor: '#fafaf8' }} type="number" placeholder="⚠️ Low Stock Threshold" value={form.lowStockThreshold} onChange={e => setForm({ ...form, lowStockThreshold: e.target.value })} required />
              <input style={{ padding: '12px 16px', borderRadius: '12px', border: '2px solid #e8e0d5', fontSize: '14px', backgroundColor: '#fafaf8' }} type="number" placeholder="💪 Protein per unit (grams)" value={form.proteinGrams} onChange={e => setForm({ ...form, proteinGrams: e.target.value })} />
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
                  <span style={{ fontSize: '20px' }}>{getCategoryEmoji(item.category)}</span>
                  <span style={{ marginLeft: '6px', padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', backgroundColor: item.category === 'dairy' ? '#e3f2fd' : item.category === 'plant-based' ? '#e8f5e9' : '#fff3e0', color: item.category === 'dairy' ? '#1565c0' : item.category === 'plant-based' ? '#2e7d32' : '#e65100' }}>{item.category}</span>
                </div>
                {item.quantity <= item.lowStockThreshold && <span style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>⚠️ LOW</span>}
              </div>
              <p style={{ fontSize: '32px', fontWeight: '900', color: '#2c3e1f', margin: '8px 0 4px' }}>{item.quantity} <span style={{ fontSize: '16px', fontWeight: '500', color: '#888' }}>{item.unit}</span></p>
              {item.proteinGrams > 0 && <p style={{ color: '#2c5f2d', fontSize: '13px', margin: '4px 0', fontWeight: '600' }}>💪 {(item.proteinGrams * item.quantity).toFixed(0)}g protein total</p>}
              <ProgressBar quantity={item.quantity} threshold={item.lowStockThreshold} />
              <p style={{ color: getExpirationColor(item.expirationDate), fontSize: '13px', margin: '8px 0', fontWeight: '600' }}>
                📅 Expires in {getDaysUntilExpiry(item.expirationDate)} days ({new Date(item.expirationDate).toLocaleDateString()})
              </p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button className="action-btn" onClick={() => handleConsume(item)} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)', color: '#2d6a4f', border: '2px solid #52b788', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>− Consume</button>
                <button className="action-btn" onClick={() => handleDelete(item._id)} style={{ padding: '10px 14px', background: 'linear-gradient(135deg, #fdecea, #ffd5d5)', color: '#c0392b', border: '2px solid #e57373', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
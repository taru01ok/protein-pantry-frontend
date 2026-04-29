import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getItems, addItem, updateItem, deleteItem, getLowStock, getExpiringSoon, generateRecipes } from '../api';

const LeafA = ({ style = {} }) => (
  <svg viewBox="0 0 100 130" fill="none" style={style}>
    <path d="M50 118 C22 90 5 55 10 14 C10 14 30 28 50 10 C70 28 90 14 90 14 C95 55 78 90 50 118Z" fill="currentColor" />
    <line x1="50" y1="118" x2="50" y2="10" stroke="currentColor" strokeWidth="2" />
    <path d="M50 80 Q28 72 16 54" stroke="currentColor" strokeWidth="1.4" fill="none" />
    <path d="M50 80 Q72 72 84 54" stroke="currentColor" strokeWidth="1.4" fill="none" />
    <path d="M50 52 Q34 45 26 32" stroke="currentColor" strokeWidth="1.1" fill="none" />
    <path d="M50 52 Q66 45 74 32" stroke="currentColor" strokeWidth="1.1" fill="none" />
  </svg>
);

const LeafB = ({ style = {} }) => (
  <svg viewBox="0 0 100 100" fill="none" style={style}>
    <ellipse cx="50" cy="50" rx="22" ry="44" fill="currentColor" transform="rotate(-18 50 50)" />
    <line x1="50" y1="8" x2="50" y2="92" stroke="currentColor" strokeWidth="1.5" transform="rotate(-18 50 50)" />
    <path d="M42 30 Q28 44 30 58" stroke="currentColor" strokeWidth="1" fill="none" transform="rotate(-18 50 50)" />
    <path d="M58 30 Q72 44 70 58" stroke="currentColor" strokeWidth="1" fill="none" transform="rotate(-18 50 50)" />
  </svg>
);

const LeafC = ({ style = {} }) => (
  <svg viewBox="0 0 100 100" fill="none" style={style}>
    <path d="M18 82 Q8 50 26 20 Q50 38 82 28 Q88 62 62 82 Q40 88 18 82Z" fill="currentColor" />
    <path d="M18 82 Q50 56 82 28" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M35 70 Q42 50 56 40" stroke="currentColor" strokeWidth="1" fill="none" />
  </svg>
);

const CircularRing = ({ value, max, size = 90, label, sublabel }) => {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * Math.min(value / Math.max(max, 1), 1);
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(168,223,198,0.9)" strokeWidth="7"
          strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div style={{ textAlign: 'center', zIndex: 1 }}>
        <div style={{ fontSize: size > 80 ? '17px' : '13px', fontWeight: '700', color: 'white', lineHeight: 1, fontFamily: 'Inter,sans-serif' }}>{label}</div>
        {sublabel && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', marginTop: '2px', letterSpacing: '0.5px' }}>{sublabel}</div>}
      </div>
    </div>
  );
};

const ProgressBar = ({ quantity, threshold }) => {
  const max = Math.max(quantity, threshold * 2, 1);
  const pct = Math.min((quantity / max) * 100, 100);
  const isLow = quantity <= threshold;
  return (
    <div style={{ backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '20px', height: '5px', margin: '10px 0 4px', overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`,
        background: isLow ? 'linear-gradient(90deg, #c97b2a, #e8935a)' : 'linear-gradient(90deg, #52b788, #2c5f2d)',
        height: '100%', borderRadius: '20px',
        transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  );
};

const catConfig = {
  dairy: { emoji: '🥛', color: '#2a6abf', bg: 'rgba(42,106,191,0.09)', label: 'Dairy' },
  'plant-based': { emoji: '🌱', color: '#2c7a52', bg: 'rgba(44,122,82,0.09)', label: 'Plant-Based' },
  'whole food': { emoji: '🥦', color: '#5a8030', bg: 'rgba(90,128,48,0.09)', label: 'Whole Food' },
};
const getCat = c => catConfig[c] || catConfig['whole food'];

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
  const [form, setForm] = useState({ name: '', category: 'dairy', quantity: '', unit: '', expirationDate: '', lowStockThreshold: 2, proteinGrams: 0 });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const username = localStorage.getItem('username');

  useEffect(() => {
    const el = document.createElement('style');
    el.id = 'pp-styles';
    el.textContent = `
      @keyframes floatA { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-32px) rotate(14deg)} }
      @keyframes floatB { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-40px) rotate(-12deg)} }
      @keyframes floatC { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-24px) scale(1.07)} }
      @keyframes floatD { 0%,100%{transform:translateY(0) rotate(-12deg)} 50%{transform:translateY(-20px) rotate(-2deg)} }
      @keyframes gradShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
      @keyframes fadeUp { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
      @keyframes orbFloat1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(28px,-18px) scale(1.04)} 66%{transform:translate(-16px,14px) scale(0.97)} }
      @keyframes orbFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-22px,18px) scale(0.96)} 66%{transform:translate(18px,-8px) scale(1.02)} }
      @keyframes shimmerHero { 0%{opacity:0.4} 50%{opacity:0.7} 100%{opacity:0.4} }

      .pp-card { transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease !important; animation: fadeUp 0.5s ease both; }
      .pp-card:hover { transform: translateY(-9px) scale(1.015) !important; box-shadow: 0 28px 64px rgba(26,58,42,0.16) !important; }
      .pp-btn { transition: all 0.25s cubic-bezier(0.34,1.56,0.64,1) !important; }
      .pp-btn:hover { transform: translateY(-2px) scale(1.05) !important; }
      .pp-hero-pill { transition: all 0.3s ease !important; backdrop-filter: blur(14px) !important; -webkit-backdrop-filter: blur(14px) !important; }
      .pp-hero-pill:hover { transform: translateY(-3px) !important; background: rgba(255,255,255,0.22) !important; }
      .pp-panel { animation: fadeUp 0.4s ease both; }
      input:focus, select:focus { outline: none !important; border-color: #52b788 !important; box-shadow: 0 0 0 3px rgba(82,183,136,0.14) !important; }
      input::placeholder { color: #b0a89e !important; }
    `;
    document.head.appendChild(el);
    return () => { document.getElementById('pp-styles')?.remove(); };
  }, []);

  const fetchAll = async () => {
    try {
      const [a, b, c] = await Promise.all([getItems({ category, sortBy }), getLowStock(), getExpiringSoon()]);
      setItems(a.data); setLowStock(b.data); setExpiringSoon(c.data);
    } catch (err) { if (err.response?.status === 401) navigate('/'); }
  };
  useEffect(() => { fetchAll(); }, [category, sortBy]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await addItem({ ...form, quantity: Number(form.quantity), lowStockThreshold: Number(form.lowStockThreshold), proteinGrams: Number(form.proteinGrams) });
      setForm({ name: '', category: 'dairy', quantity: '', unit: '', expirationDate: '', lowStockThreshold: 2, proteinGrams: 0 });
      setShowForm(false); fetchAll();
    } catch (err) { setError('Failed to add item'); }
  };
  const handleConsume = async (item) => { if (item.quantity <= 0) return; await updateItem(item._id, { quantity: item.quantity - 1 }); fetchAll(); };
  const handleDelete = async (id) => { await deleteItem(id); fetchAll(); };
  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('username'); navigate('/'); };

  const getExpColor = (date) => { const d = Math.ceil((new Date(date) - new Date()) / 864e5); return d <= 3 ? '#b83232' : d <= 7 ? '#c97b2a' : '#2c7a52'; };
  const getDays = (date) => Math.ceil((new Date(date) - new Date()) / 864e5);

  const generateGroceryList = () => {
    const list = lowStock.map(i => `• ${getCat(i.category).emoji} ${i.name} — only ${i.quantity} ${i.unit} left`);
    expiringSoon.forEach(i => { if (!lowStock.find(l => l._id === i._id)) list.push(`• ${getCat(i.category).emoji} ${i.name} — expiring soon`); });
    return list.length ? list.join('\n') : '✅ Your pantry is beautifully stocked!';
  };

  const handleGenerateRecipes = async () => {
    setLoadingRecipes(true); setShowRecipes(true); setRecipes('');
    try {
      const { data } = await generateRecipes({ ingredients: items.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', '), filter: recipeFilter });
      setRecipes(data.recipe);
    } catch { setRecipes('Failed to generate recipes. Please try again.'); }
    setLoadingRecipes(false);
  };

  const dailyGoal = 150;
  const totalProtein = items.reduce((s, i) => s + (i.proteinGrams || 0) * i.quantity, 0);
  const daysRemaining = totalProtein > 0 ? (totalProtein / dailyGoal).toFixed(1) : 0;
  const byCategory = {
    dairy: items.filter(i => i.category === 'dairy').reduce((s, i) => s + (i.proteinGrams || 0) * i.quantity, 0),
    'plant-based': items.filter(i => i.category === 'plant-based').reduce((s, i) => s + (i.proteinGrams || 0) * i.quantity, 0),
    'whole food': items.filter(i => i.category === 'whole food').reduce((s, i) => s + (i.proteinGrams || 0) * i.quantity, 0),
  };

  const inp = { padding: '13px 18px', borderRadius: '14px', border: '1.5px solid #d4cdc3', fontSize: '14px', fontFamily: 'Inter,sans-serif', backgroundColor: '#fdfaf6', color: '#1a3a2a', width: '100%', transition: 'all 0.2s ease' };

  return (
    <div style={{ minHeight: '100vh', background: '#f0ebe2', fontFamily: "'Inter', sans-serif", position: 'relative', overflow: 'hidden' }}>

      {/* ── Grain overlay ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 99, pointerEvents: 'none', opacity: 0.35,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")` }} />

      {/* ── Ambient orbs ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 640, height: 640, borderRadius: '50%', background: 'radial-gradient(circle, rgba(82,183,136,0.11), transparent 70%)', top: -220, left: -200, animation: 'orbFloat1 16s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,151,90,0.09), transparent 70%)', top: '28%', right: -160, animation: 'orbFloat2 20s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, rgba(44,95,45,0.07), transparent 70%)', bottom: -120, left: '18%', animation: 'orbFloat1 22s ease-in-out infinite reverse' }} />

        {/* Botanical leaves */}
        <LeafA style={{ position: 'absolute', width: 100, top: '6%', left: '2.5%', color: '#2c5f2d', opacity: 0.09, animation: 'floatA 15s ease-in-out infinite' }} />
        <LeafB style={{ position: 'absolute', width: 72, top: '10%', right: '3.5%', color: '#3d6b4f', opacity: 0.08, animation: 'floatB 18s ease-in-out infinite' }} />
        <LeafA style={{ position: 'absolute', width: 80, bottom: '12%', right: '5%', color: '#52b788', opacity: 0.07, animation: 'floatC 13s ease-in-out infinite' }} />
        <LeafC style={{ position: 'absolute', width: 68, bottom: '4%', left: '4%', color: '#b8975a', opacity: 0.07, animation: 'floatD 11s ease-in-out infinite' }} />
        <LeafB style={{ position: 'absolute', width: 55, top: '45%', left: '1%', color: '#4a7c59', opacity: 0.06, animation: 'floatA 19s ease-in-out infinite reverse' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto', padding: '24px 24px 56px' }}>

        {/* ════════════════════════════════
            HERO HEADER
        ════════════════════════════════ */}
        <div style={{
          position: 'relative',
          borderRadius: 32,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #122a1c 0%, #1e4429 28%, #2c5f2d 55%, #3d7a52 80%, #4a8c62 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradShift 14s ease infinite',
          boxShadow: '0 24px 72px rgba(18,42,28,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
          padding: '44px 44px 38px',
          marginBottom: 28,
        }}>
          {/* Hero decorative shapes */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: 32, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.055), transparent)', top: -120, right: -60 }} />
            <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.04), transparent)', bottom: -70, left: '12%' }} />
            {/* Large decorative leaf in hero */}
            <LeafA style={{ position: 'absolute', width: 220, right: 160, top: -20, color: 'white', opacity: 0.055, animation: 'shimmerHero 8s ease-in-out infinite' }} />
            <LeafA style={{ position: 'absolute', width: 140, right: 48, bottom: -30, color: 'white', opacity: 0.04 }} />
            {/* Subtle dot grid */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.04 }} xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="white"/></pattern></defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
          </div>

          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
            {/* Left: title block */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🥗</div>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: '3.5px', textTransform: 'uppercase' }}>Protein Pantry</span>
              </div>
              <h1 style={{
                color: 'white', margin: '0 0 10px',
                fontSize: 'clamp(26px, 3.5vw, 44px)',
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1,
              }}>
                Good day,<br />
                <span style={{ fontStyle: 'italic', opacity: 0.9 }}>{username || 'Friend'}</span>
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.48)', margin: 0, fontSize: 14, fontWeight: 400, letterSpacing: '0.1px', maxWidth: 340 }}>
                {items.length > 0
                  ? `${items.length} item${items.length !== 1 ? 's' : ''} tracked · ${totalProtein.toFixed(0)}g protein stocked · ${daysRemaining} days at goal`
                  : 'Your personal wellness nutrition hub. Start by adding items below.'}
              </p>

              {/* Status badge */}
              <div style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.3px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: daysRemaining < 3 ? '#ff6b6b' : daysRemaining < 7 ? '#ffb347' : '#52e0a0', display: 'inline-block', boxShadow: `0 0 8px ${daysRemaining < 3 ? '#ff6b6b' : daysRemaining < 7 ? '#ffb347' : '#52e0a0'}` }} />
                {daysRemaining < 3 ? 'Restock Needed' : daysRemaining < 7 ? 'Running Low' : 'Well Stocked'}
              </div>
            </div>

            {/* Right: stat pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              {items.length > 0 && (
                <div className="pp-hero-pill" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 22, padding: '18px 22px', textAlign: 'center' }}>
                  <CircularRing value={totalProtein} max={Math.max(totalProtein, dailyGoal * 7)} size={90} label={`${totalProtein.toFixed(0)}g`} sublabel="protein" />
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, margin: '10px 0 0', letterSpacing: '2px', textTransform: 'uppercase' }}>Total Stocked</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="pp-hero-pill" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 18, padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>📦</span>
                  <div><p style={{ color: 'white', margin: 0, fontWeight: 800, fontSize: 22, lineHeight: 1, letterSpacing: '-1px' }}>{items.length}</p><p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: 10, letterSpacing: '0.5px' }}>ITEMS</p></div>
                </div>
                <div className="pp-hero-pill" style={{ background: lowStock.length ? 'rgba(201,123,42,0.22)' : 'rgba(255,255,255,0.1)', border: `1px solid ${lowStock.length ? 'rgba(201,123,42,0.35)' : 'rgba(255,255,255,0.14)'}`, borderRadius: 18, padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>⚠️</span>
                  <div><p style={{ color: 'white', margin: 0, fontWeight: 800, fontSize: 22, lineHeight: 1, letterSpacing: '-1px' }}>{lowStock.length}</p><p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: 10, letterSpacing: '0.5px' }}>LOW STOCK</p></div>
                </div>
                <div className="pp-hero-pill" style={{ background: expiringSoon.length ? 'rgba(184,50,50,0.2)' : 'rgba(255,255,255,0.1)', border: `1px solid ${expiringSoon.length ? 'rgba(184,50,50,0.3)' : 'rgba(255,255,255,0.14)'}`, borderRadius: 18, padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>📅</span>
                  <div><p style={{ color: 'white', margin: 0, fontWeight: 800, fontSize: 22, lineHeight: 1, letterSpacing: '-1px' }}>{expiringSoon.length}</p><p style={{ color: 'rgba(255,255,255,0.45)', margin: 0, fontSize: 10, letterSpacing: '0.5px' }}>EXPIRING</p></div>
                </div>
                <button className="pp-btn" onClick={handleLogout} style={{ padding: '10px 18px', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 14, cursor: 'pointer', fontWeight: 600, fontSize: 12, fontFamily: 'Inter,sans-serif', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Sign Out</button>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════
            NUTRITION OVERVIEW
        ════════════════════════════════ */}
        {items.length > 0 && (
          <div className="pp-panel" style={{ background: 'linear-gradient(145deg, #fdfaf6, #f5f0e6)', borderRadius: 26, padding: '28px 30px', marginBottom: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 14px 44px rgba(26,58,42,0.07)', border: '1px solid rgba(255,255,255,0.85)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ color: '#1a3a2a', margin: '0 0 4px', fontSize: 17, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600 }}>Nutrition Overview</h2>
                <p style={{ color: '#8a7f74', margin: 0, fontSize: 13 }}>Based on current pantry inventory</p>
              </div>
              <div style={{ padding: '6px 16px', borderRadius: 20, background: daysRemaining < 3 ? '#fdecea' : daysRemaining < 7 ? '#fff3e0' : '#e6f4ed', color: daysRemaining < 3 ? '#b83232' : daysRemaining < 7 ? '#c97b2a' : '#1a5c38', fontSize: 12, fontWeight: 700, letterSpacing: '0.3px' }}>
                {daysRemaining < 3 ? '🚨 Restock Soon' : daysRemaining < 7 ? '⚠️ Running Low' : '✅ Well Stocked'}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 14 }}>
              {[
                { v: `${totalProtein.toFixed(0)}g`, l: 'Total Protein', g: 'linear-gradient(135deg,#e6f4ed,#d4ead8)', c: '#1a3a2a', a: '#2c5f2d' },
                { v: `${daysRemaining}d`, l: `Days at ${dailyGoal}g`, g: 'linear-gradient(135deg,#edf6f0,#daeee5)', c: '#1a3a2a', a: '#3d6b4f' },
                { v: `${byCategory['dairy'].toFixed(0)}g`, l: '🥛 Dairy', g: 'linear-gradient(135deg,#e6edf9,#d5e4f7)', c: '#1a3a72', a: '#2a6abf' },
                { v: `${byCategory['plant-based'].toFixed(0)}g`, l: '🌱 Plant', g: 'linear-gradient(135deg,#e6f4ed,#d4ecdc)', c: '#1a4a2a', a: '#2c7a52' },
                { v: `${byCategory['whole food'].toFixed(0)}g`, l: '🥦 Whole Food', g: 'linear-gradient(135deg,#fdf0e2,#fbe0c4)', c: '#6a3000', a: '#c97b2a' },
              ].map((s, i) => (
                <div key={i} style={{ background: s.g, padding: '18px 16px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  <p style={{ fontSize: 30, fontWeight: 800, color: s.c, margin: '0 0 3px', letterSpacing: '-1.5px', lineHeight: 1 }}>{s.v}</p>
                  <p style={{ color: '#8a7f74', margin: 0, fontSize: 12, fontWeight: 500 }}>{s.l}</p>
                  <div style={{ height: 3, background: `linear-gradient(90deg,${s.a},transparent)`, borderRadius: 2, marginTop: 10, opacity: 0.35 }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════
            ACTION BUTTONS
        ════════════════════════════════ */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <button className="pp-btn" onClick={() => setShowGrocery(!showGrocery)} style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#c07220,#e8935a)', color: 'white', border: 'none', borderRadius: 18, cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'Inter,sans-serif', boxShadow: '0 5px 20px rgba(192,114,32,0.3)', letterSpacing: '0.2px' }}>
            🛒 {showGrocery ? 'Hide' : 'Smart Grocery'} List
          </button>
          <button className="pp-btn" onClick={() => setShowRecipes(!showRecipes)} style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#6a2090,#9f4cc0)', color: 'white', border: 'none', borderRadius: 18, cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'Inter,sans-serif', boxShadow: '0 5px 20px rgba(106,32,144,0.28)', letterSpacing: '0.2px' }}>
            ✨ {showRecipes ? 'Hide' : 'AI Recipe'} Generator
          </button>
        </div>

        {/* ════════════════════════════════
            GROCERY LIST
        ════════════════════════════════ */}
        {showGrocery && (
          <div className="pp-panel" style={{ background: 'linear-gradient(145deg,#fdfaf6,#fff9f0)', borderRadius: 26, padding: '28px 30px', marginBottom: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 14px 44px rgba(192,114,32,0.1)', border: '1px solid rgba(220,180,100,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ color: '#7a4500', margin: '0 0 3px', fontSize: 17, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600 }}>Smart Grocery List</h2>
                <p style={{ color: '#9a7a55', margin: 0, fontSize: 13 }}>Auto-generated from your inventory</p>
              </div>
              <button className="pp-btn" onClick={() => { navigator.clipboard.writeText(generateGroceryList()); setGroceryCopied(true); setTimeout(() => setGroceryCopied(false), 2000); }} style={{ padding: '9px 20px', background: groceryCopied ? 'linear-gradient(135deg,#2c5f2d,#52b788)' : 'linear-gradient(135deg,#c07220,#e8935a)', color: 'white', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'Inter,sans-serif' }}>
                {groceryCopied ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>
            <pre style={{ backgroundColor: 'rgba(255,255,255,0.65)', padding: '20px 24px', borderRadius: 16, fontSize: 14, lineHeight: 2.2, color: '#3d2c1a', whiteSpace: 'pre-wrap', margin: 0, border: '1px solid rgba(220,180,100,0.2)', fontFamily: 'Inter,sans-serif' }}>
              {generateGroceryList()}
            </pre>
          </div>
        )}

        {/* ════════════════════════════════
            AI RECIPE GENERATOR
        ════════════════════════════════ */}
        {showRecipes && (
          <div className="pp-panel" style={{ background: 'linear-gradient(145deg,#fdfaf6,#faf4ff)', borderRadius: 26, padding: '28px 30px', marginBottom: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 14px 44px rgba(106,32,144,0.1)', border: '1px solid rgba(160,80,200,0.18)' }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ color: '#420a70', margin: '0 0 3px', fontSize: 17, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600 }}>AI Recipe Generator</h2>
              <p style={{ color: '#7a5a90', margin: 0, fontSize: 13 }}>Recipes tailored to your current pantry</p>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              {['high protein', 'under 500 calories', 'quick meals', 'meal prep'].map(f => (
                <button key={f} onClick={() => setRecipeFilter(f)} style={{ padding: '8px 18px', borderRadius: 20, border: `1.5px solid ${recipeFilter === f ? '#9f4cc0' : '#d4bce6'}`, backgroundColor: recipeFilter === f ? '#9f4cc0' : 'rgba(255,255,255,0.7)', color: recipeFilter === f ? 'white' : '#7a5a90', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'Inter,sans-serif', transition: 'all 0.2s ease' }}>
                  {f}
                </button>
              ))}
            </div>
            <button className="pp-btn" onClick={handleGenerateRecipes} style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#6a2090,#9f4cc0)', color: 'white', border: 'none', borderRadius: 16, cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'Inter,sans-serif', marginBottom: 20, boxShadow: '0 5px 18px rgba(106,32,144,0.3)' }}>
              {loadingRecipes ? '⏳ Generating...' : '✨ Generate Recipes'}
            </button>
            {recipes && (
              <div style={{ backgroundColor: 'rgba(255,255,255,0.65)', padding: '24px', borderRadius: 16, fontSize: 14, lineHeight: 1.9, color: '#2c1a3a', whiteSpace: 'pre-wrap', border: '1px solid rgba(160,80,200,0.18)', fontFamily: 'Inter,sans-serif' }}>
                {recipes}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════
            FILTERS BAR
        ════════════════════════════════ */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center', background: 'linear-gradient(145deg,#fdfaf6,#f5f0e6)', padding: '14px 18px', borderRadius: 20, boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(26,58,42,0.06)', border: '1px solid rgba(255,255,255,0.85)' }}>
          <span style={{ color: '#8a7f74', fontSize: 12, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Filter</span>
          <select style={{ padding: '9px 15px', borderRadius: 13, border: '1.5px solid #d4cdc3', fontSize: 13, fontFamily: 'Inter,sans-serif', backgroundColor: '#fdfaf6', color: '#1a3a2a', cursor: 'pointer', outline: 'none', minWidth: 155 }} value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">🌿 All Categories</option>
            <option value="dairy">🥛 Dairy</option>
            <option value="plant-based">🌱 Plant-Based</option>
            <option value="whole food">🥦 Whole Food</option>
          </select>
          <select style={{ padding: '9px 15px', borderRadius: 13, border: '1.5px solid #d4cdc3', fontSize: 13, fontFamily: 'Inter,sans-serif', backgroundColor: '#fdfaf6', color: '#1a3a2a', cursor: 'pointer', outline: 'none', minWidth: 155 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="">Sort by</option>
            <option value="expiration">📅 Expiration</option>
            <option value="quantity">📦 Quantity</option>
          </select>
          <button className="pp-btn" onClick={() => setShowForm(!showForm)} style={{ padding: '9px 22px', background: showForm ? 'linear-gradient(135deg,#122a1c,#2c5f2d)' : 'linear-gradient(135deg,#2c5f2d,#52b788)', color: 'white', border: 'none', borderRadius: 13, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Inter,sans-serif', boxShadow: '0 4px 16px rgba(44,95,45,0.28)', marginLeft: 'auto', letterSpacing: '0.3px' }}>
            {showForm ? '✕ Cancel' : '+ Add Item'}
          </button>
        </div>

        {/* ════════════════════════════════
            ADD ITEM FORM
        ════════════════════════════════ */}
        {showForm && (
          <div className="pp-panel" style={{ background: 'linear-gradient(145deg,#fdfaf6,#f2ede3)', padding: '32px', borderRadius: 26, boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 18px 52px rgba(26,58,42,0.1)', marginBottom: 24, border: '1px solid rgba(82,183,136,0.22)' }}>
            <h3 style={{ color: '#1a3a2a', marginBottom: 4, fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600 }}>Add New Item</h3>
            <p style={{ color: '#8a7f74', margin: '0 0 24px', fontSize: 13 }}>Track a new protein source in your pantry</p>
            {error && <p style={{ color: '#b83232', backgroundColor: '#fdecea', padding: '12px 16px', borderRadius: 12, marginBottom: 16, fontSize: 14 }}>{error}</p>}
            <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <input style={inp} placeholder="Name (e.g. Greek Yogurt)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <select style={inp} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="dairy">🥛 Dairy</option>
                <option value="plant-based">🌱 Plant-Based</option>
                <option value="whole food">🥦 Whole Food</option>
              </select>
              <input style={inp} type="number" placeholder="Quantity" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} required />
              <input style={inp} placeholder="Unit (cups, oz, lbs)" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} required />
              <input style={inp} type="date" value={form.expirationDate} onChange={e => setForm({ ...form, expirationDate: e.target.value })} required />
              <input style={inp} type="number" placeholder="Low Stock Threshold" value={form.lowStockThreshold} onChange={e => setForm({ ...form, lowStockThreshold: e.target.value })} required />
              <input style={{ ...inp, gridColumn: '1 / -1' }} type="number" placeholder="Protein per unit (grams)" value={form.proteinGrams} onChange={e => setForm({ ...form, proteinGrams: e.target.value })} />
              <button className="pp-btn" type="submit" style={{ gridColumn: '1 / -1', padding: 15, background: 'linear-gradient(135deg,#1a3a2a,#2c5f2d,#52b788)', color: 'white', border: 'none', borderRadius: 16, fontSize: 15, fontWeight: 600, fontFamily: 'Inter,sans-serif', cursor: 'pointer', boxShadow: '0 6px 24px rgba(26,58,42,0.3)', letterSpacing: '0.3px' }}>
                Add to Pantry
              </button>
            </form>
          </div>
        )}

        {/* ════════════════════════════════
            ITEMS GRID
        ════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {items.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '90px 40px' }}>
              <div style={{ width: 80, height: 80, borderRadius: 24, background: 'linear-gradient(135deg,#e6f4ed,#d4ead8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(44,95,45,0.1)' }}>🌱</div>
              <p style={{ fontSize: 22, fontWeight: 600, color: '#1a3a2a', margin: '0 0 8px', fontFamily: "'Playfair Display', Georgia, serif" }}>Your pantry awaits</p>
              <p style={{ fontSize: 14, color: '#8a7f74' }}>Click "+ Add Item" to start tracking your protein sources</p>
            </div>
          )}
          {items.map((item, idx) => {
            const cat = getCat(item.category);
            const isLow = item.quantity <= item.lowStockThreshold;
            const daysLeft = getDays(item.expirationDate);
            const expColor = getExpColor(item.expirationDate);
            return (
              <div key={item._id} className="pp-card" style={{
                background: 'linear-gradient(148deg,#fdfaf6,#f7f2ea)',
                padding: '26px',
                borderRadius: 26,
                boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 10px 36px rgba(26,58,42,0.07)',
                border: '1px solid rgba(255,255,255,0.92)',
                borderTop: `3px solid ${isLow ? '#d4845a' : '#52b788'}`,
                position: 'relative',
                overflow: 'hidden',
                animationDelay: `${idx * 0.06}s`,
              }}>
                {/* Corner glow */}
                <div style={{ position: 'absolute', top: 0, right: 0, width: 100, height: 100, background: `radial-gradient(circle at top right, ${isLow ? 'rgba(212,132,90,0.07)' : 'rgba(82,183,136,0.07)'}, transparent)`, borderRadius: '0 26px 0 0', pointerEvents: 'none' }} />

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <h3 style={{ color: '#1a3a2a', margin: '0 0 8px', fontSize: 18, fontWeight: 700, fontFamily: "'Inter', sans-serif", letterSpacing: '-0.3px', lineHeight: 1.2 }}>{item.name}</h3>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', backgroundColor: cat.bg, color: cat.color }}>
                      {cat.emoji} {cat.label}
                    </span>
                  </div>
                  {isLow && <span style={{ backgroundColor: '#fff3e0', color: '#a06000', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', flexShrink: 0 }}>LOW</span>}
                </div>

                {/* Quantity */}
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 40, fontWeight: 800, color: '#1a3a2a', letterSpacing: '-2.5px', fontFamily: "'Inter', sans-serif", lineHeight: 1 }}>{item.quantity}</span>
                  <span style={{ fontSize: 16, fontWeight: 500, color: '#9a8f83', marginLeft: 7 }}>{item.unit}</span>
                </div>

                <ProgressBar quantity={item.quantity} threshold={item.lowStockThreshold} />

                {/* Meta row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 18 }}>
                  {item.proteinGrams > 0
                    ? <span style={{ fontSize: 12, fontWeight: 600, color: '#2c7a52', background: 'rgba(44,122,82,0.09)', padding: '3px 10px', borderRadius: 10 }}>💪 {(item.proteinGrams * item.quantity).toFixed(0)}g protein</span>
                    : <span />}
                  <span style={{ fontSize: 12, fontWeight: 500, color: expColor }}>
                    {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="pp-btn" onClick={() => handleConsume(item)} style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg,#e6f4ed,#d4ead8)', color: '#1a5c38', border: '1.5px solid rgba(82,183,136,0.28)', borderRadius: 14, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'Inter,sans-serif' }}>Consume −1</button>
                  <button className="pp-btn" onClick={() => handleDelete(item._id)} style={{ padding: '10px 14px', background: 'linear-gradient(135deg,#fdecea,#fdd5d2)', color: '#b83232', border: '1.5px solid rgba(184,50,50,0.18)', borderRadius: 14, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

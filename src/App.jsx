import React, { useState, useMemo, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, 
  deleteDoc, updateDoc, getDoc, writeBatch 
} from 'firebase/firestore';
import { 
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut 
} from 'firebase/auth';

import { 
  LayoutDashboard, Package, ShoppingCart, TrendingUp, AlertTriangle, 
  Plus, Edit2, Save, ArrowUpRight, ArrowDownRight, FileText, Search, 
  ChevronRight, Clock, Calendar, Check, ChevronLeft, Filter, Layers, 
  Trash2, X, PlusSquare, Settings2, Tag, ArrowRightLeft, Loader2,
  AlertCircle, Zap, BarChart3, ListFilter, Activity, LineChart as LineChartIcon,
  TrendingDown, Star, Info, Eye, EyeOff, Lock, User, Rocket, LogOut, Sun, Moon,
  GripVertical
} from 'lucide-react';
import { 
  Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Bar, ComposedChart, Legend
} from 'recharts';

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDVFYq1pU_65OrVUnqIP59otQ4AuiQgSVA",
  authDomain: "controle-de-estoque-53b05.firebaseapp.com",
  projectId: "controle-de-estoque-53b05",
  storageBucket: "controle-de-estoque-53b05.firebasestorage.app",
  messagingSenderId: "451168347549",
  appId: "1:451168347549:web:e8527565e0daba9d483b74",
  measurementId: "G-ZZ1BBM7HRX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'varivebox-v3-final';

const MONTH_NAMES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const YEARS_LIST = ['2023', '2024', '2025', '2026', '2027', '2028'];
const CURRENT_YEAR = new Date().getFullYear().toString();

// --- COMPONENTE DE CARD ---
const StatCard = ({ title, value, sub, icon: Icon, colorClass, active, tooltipList, isDark }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      className={`relative p-5 rounded-2xl border-l-4 shadow-sm transition-all duration-300 border-2 
        ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} 
        ${active ? 'ring-2 ring-red-500 border-red-500 animate-pulse' : colorClass}
        ${showTooltip ? 'z-[60] scale-[1.02]' : 'z-10'}
      `}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
        <div className="flex justify-between items-start">
            <div>
                <p className={`text-[10px] font-black uppercase mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{title}</p>
                <h3 className={`text-2xl font-black leading-none ${active ? 'text-red-600' : isDark ? 'text-white' : 'text-slate-900'}`}>{value}</h3>
                {sub && <p className={`text-[10px] mt-2 font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{sub}</p>}
            </div>
            <div className={`p-2 rounded-xl ${active ? 'bg-red-500/10 text-red-500' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-950'}`}>
                <Icon size={18} />
            </div>
        </div>

        {showTooltip && tooltipList && tooltipList.length > 0 && (
          <div className="absolute top-[90%] left-0 w-full min-w-[240px] bg-slate-900 text-white text-[10px] p-4 rounded-xl z-[70] shadow-2xl border-2 border-orange-500/50">
            <p className="font-black border-b border-slate-700 pb-2 mb-2 uppercase text-orange-400 flex items-center gap-1">
              <Info size={12}/> Detalhes:
            </p>
            <ul className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {tooltipList.map((item, i) => (
                <li key={i} className="flex justify-between border-b border-slate-800/50 pb-1 last:border-none">
                  <span className="font-bold text-orange-100">{item.cod || "---"}</span>
                  <span className="opacity-60 truncate ml-2 text-right">{item.desc || ""}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  const [authLoading, setAuthLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [products, setProducts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [salesPeriods, setSalesPeriods] = useState([]);
  
  // Dashboard Filters (Padrão Ano Atual)
  const [dashFilterYear, setDashFilterYear] = useState(CURRENT_YEAR);
  const [dashFilterGroup, setDashFilterGroup] = useState('Todos');
  const [dashFilterModel, setDashFilterModel] = useState('Todos');
  const [dashFilterMode, setDashFilterMode] = useState('year'); 
  const [dashRangeStart, setDashRangeStart] = useState({ month: 0, year: CURRENT_YEAR });
  const [dashRangeEnd, setDashRangeEnd] = useState({ month: 11, year: CURRENT_YEAR });

  // Purchase Filters
  const [purchaseFilterYear, setPurchaseFilterYear] = useState(CURRENT_YEAR);
  const [purchaseSearch, setPurchaseSearch] = useState('');

  // UI Control
  const [selectedYears, setSelectedYears] = useState([CURRENT_YEAR]); 
  const [filterMode, setFilterMode] = useState('manual'); 
  const [rangeStart, setRangeStart] = useState({ month: 0, year: CURRENT_YEAR });
  const [rangeEnd, setRangeEnd] = useState({ month: 11, year: CURRENT_YEAR });
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [draggedItemIdx, setDraggedItemIdx] = useState(null);

  // Modals
  const [editingProduct, setEditingProduct] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [newProductData, setNewProductData] = useState({ cod: '', desc: '', groupId: '' });
  const [editingGroup, setEditingGroup] = useState(null);
  const [newGroupData, setNewGroupData] = useState({ name: '', color: '#3b82f6' });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [newPeriod, setNewPeriod] = useState({ month: new Date().getMonth(), year: new Date().getFullYear().toString() });
  const [isOrderDeleteModalOpen, setIsOrderDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isPeriodDeleteModalOpen, setIsPeriodDeleteModalOpen] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const isDark = theme === 'dark';

  // --- HANDLERS ---
  const toggleTheme = async () => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    if (user) {
        try {
            const prefRef = doc(db, 'artifacts', appId, 'public', 'data', 'userSettings', user.uid);
            await setDoc(prefRef, { theme: newTheme }, { merge: true });
        } catch (e) { console.error(e); }
    }
  };

  const handleOpenProductModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setNewProductData({ cod: product.cod, desc: product.desc, groupId: product.groupId });
    } else {
      setEditingProduct(null);
      setNewProductData({ cod: '', desc: '', groupId: groups[0]?.id || '' });
    }
    setIsProductModalOpen(true);
  };

  const deleteGroup = async (id) => {
    if (user && window.confirm("Deseja mesmo eliminar este grupo?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'groups', id));
      } catch (e) { console.error(e); }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 1500);
    } catch (err) { setLoginError('Credenciais inválidas.'); }
  };

  const confirmLogout = async () => {
    try { await signOut(auth); setEmail(''); setPassword(''); setIsLogoutModalOpen(false); } catch (err) { console.error(err); }
  };

  const handleSaveProduct = async () => {
    if (!newProductData.cod || !user) return;
    const id = editingProduct ? editingProduct.id : String(Date.now());
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id), { 
        ...newProductData, 
        sales: editingProduct?.sales || {}, 
        purchases_map: editingProduct?.purchases_map || {},
        sortOrder: editingProduct?.sortOrder || products.length
    }, { merge: true });
    setIsProductModalOpen(false);
  };
  
  const handleSaveGroup = async () => {
    if (!newGroupData.name || !user) return;
    const id = editingGroup ? editingGroup.id : `g-${Date.now()}`;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'groups', id), newGroupData);
    setNewGroupData({ name: '', color: '#3b82f6' });
    setEditingGroup(null);
  };

  const updateMonthlySale = async (id, y, m, v) => {
    const prod = products.find(p => p.id === id);
    if (!prod || !user) return;
    const salesObj = { ...(prod.sales || {}) };
    let yearArray = Array(12).fill(0);
    const existing = salesObj[y];
    if (Array.isArray(existing)) yearArray = [...existing];
    else if (typeof existing === 'object' && existing !== null) {
      Object.entries(existing).forEach(([idx, val]) => { if(parseInt(idx) < 12) yearArray[parseInt(idx)] = parseInt(val) || 0; });
    }
    yearArray[m] = parseInt(v) || 0;
    salesObj[y] = yearArray;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id), { sales: salesObj });
  };

  const updatePurchaseQty = async (id, o, v) => {
    const prod = products.find(p => p.id === id);
    if (!prod || !user) return;
    const m = { ...(prod.purchases_map || {}), [o]: parseInt(v) || 0 };
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id), { purchases_map: m });
  };

  const handleAddPeriod = async () => {
    if (!user) return;
    const pid = `p-${newPeriod.month}-${newPeriod.year}`;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'salesPeriods', pid), newPeriod);
    setIsPeriodModalOpen(false);
  };

  const confirmDeleteOrder = async () => { if(orderToDelete && user) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'purchaseOrders', orderToDelete.id)); setIsOrderDeleteModalOpen(false); };
  const confirmDeleteProduct = async () => { if(productToDelete && user) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', productToDelete.id)); setIsDeleteModalOpen(false); };
  const confirmDeletePeriod = async () => { if(periodToDelete && user) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'salesPeriods', periodToDelete.id)); setIsPeriodDeleteModalOpen(false); };

  const addNewOrder = async () => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'purchaseOrders', `order-${Date.now()}`), { order_num: (purchaseOrders.length + 1).toString(), order_date: '', arrival_date: '', invoice: '' });
  };

  const handleEditGroup = (g) => { setEditingGroup(g); setNewGroupData({ name: g.name, color: g.color }); };

  // --- DRAG & DROP ---
  const onDragStart = (idx) => setDraggedItemIdx(idx);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = async (targetIdx) => {
    if (draggedItemIdx === null || draggedItemIdx === targetIdx) return;
    const items = [...dashboardFilteredData];
    const draggedItem = items[draggedItemIdx];
    items.splice(draggedItemIdx, 1);
    items.splice(targetIdx, 0, draggedItem);
    const batch = writeBatch(db);
    items.forEach((item, index) => {
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', item.id);
        batch.update(ref, { sortOrder: index });
    });
    await batch.commit();
    setDraggedItemIdx(null);
  };

  // --- SINCRONIZAÇÃO FIREBASE ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
            const prefRef = doc(db, 'artifacts', appId, 'public', 'data', 'userSettings', u.uid);
            const prefSnap = await getDoc(prefRef);
            if (prefSnap.exists()) setTheme(prefSnap.data().theme || 'light');
        } catch (e) { console.error(e); }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const getColRef = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
    const unsubGroups = onSnapshot(getColRef('groups'), snap => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubOrders = onSnapshot(getColRef('purchaseOrders'), snap => setPurchaseOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubPeriods = onSnapshot(getColRef('salesPeriods'), snap => setSalesPeriods(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubProducts = onSnapshot(getColRef('products'), snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubGroups(); unsubOrders(); unsubPeriods(); unsubProducts(); };
  }, [user]);

  // --- LOGICA DE DADOS ---
  const sortedPeriods = useMemo(() => {
    return [...(salesPeriods || [])].sort((a, b) => {
        const yearA = parseInt(a?.year) || 0;
        const yearB = parseInt(b?.year) || 0;
        return yearA !== yearB ? yearA - yearB : (a?.month || 0) - (b?.month || 0);
    });
  }, [salesPeriods]);

  const dashPeriods = useMemo(() => {
    if (dashFilterYear === 'Todos') return sortedPeriods;
    if (dashFilterMode === 'range') {
      const sVal = (parseInt(dashRangeStart?.year) || 0) * 12 + (dashRangeStart?.month || 0);
      const eVal = (parseInt(dashRangeEnd?.year) || 0) * 12 + (dashRangeEnd?.month || 0);
      return sortedPeriods.filter(p => {
        const cur = (parseInt(p?.year) || 0) * 12 + (p?.month || 0);
        return cur >= sVal && cur <= eVal;
      });
    }
    return sortedPeriods.filter(p => String(p?.year) === String(dashFilterYear));
  }, [sortedPeriods, dashFilterMode, dashRangeStart, dashRangeEnd, dashFilterYear]);

  const filteredPurchaseOrders = useMemo(() => {
    // Novas colunas (mais recentes) sempre à direita (crescente por numeração)
    let res = [...(purchaseOrders || [])].sort((a,b) => (a?.order_num || "").localeCompare(b?.order_num || "", undefined, {numeric: true}));
    if (purchaseFilterYear !== 'Todos') res = res.filter(o => String(o?.order_date || "").startsWith(purchaseFilterYear));
    if (purchaseSearch) {
      const low = purchaseSearch.toLowerCase();
      res = res.filter(o => (o?.order_num || "").toLowerCase().includes(low) || (o?.invoice || "").toLowerCase().includes(low));
    }
    return res;
  }, [purchaseOrders, purchaseFilterYear, purchaseSearch]);

  const processedDataList = useMemo(() => {
    if (!products) return [];
    const activeOrderIds = new Set(purchaseOrders.map(o => o.id));
    const activePeriods = salesPeriods.map(p => ({ y: String(p.year), m: p.month }));

    const sortedProducts = [...products].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    return sortedProducts.map(p => {
      const groupInfo = groups.find(g => g.id === p.groupId) || { name: 'Sem Grupo', color: '#94a3b8' };
      
      const totalPurchases = Object.entries(p?.purchases_map || {}).reduce((acc, [orderId, qty]) => {
        if (activeOrderIds.has(orderId)) return acc + (parseInt(qty) || 0);
        return acc;
      }, 0);

      const totalSales = activePeriods.reduce((acc, period) => {
        const val = p?.sales?.[period.y]?.[period.m] || 0;
        return acc + (parseInt(val) || 0);
      }, 0);

      const stock = totalPurchases - totalSales;
      const turnoverPerc = totalPurchases > 0 ? (totalSales / totalPurchases) * 100 : 0;

      const getMetrics = (n) => {
        const lastN = sortedPeriods.slice(-n);
        const winSumVal = lastN.reduce((s, pr) => s + (parseInt(p?.sales?.[pr.year]?.[pr.month]) || 0), 0);
        return { units: winSumVal, perc: totalSales > 0 ? ((winSumVal / totalSales) * 100).toFixed(0) : 0 };
      };

      let activeMCount = 0;
      activePeriods.forEach(period => { if (parseInt(p?.sales?.[period.y]?.[period.m] || 0) > 0) activeMCount++; });

      const recommendation = stock <= 0 ? "CRÍTICO" : turnoverPerc >= 80 ? "URGENTE" : turnoverPerc >= 50 ? "ALERTA" : "OK";
      const recColor = stock <= 0 ? "bg-red-600 text-white animate-pulse" : turnoverPerc >= 80 ? "bg-orange-500 text-white" : turnoverPerc >= 50 ? "bg-yellow-400 text-black" : (isDark ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700");
      
      const freq = activeMCount / (salesPeriods?.length || 1);
      const constLabel = freq >= 0.8 ? "Mensal" : freq >= 0.4 ? "Trimestral" : freq >= 0.2 ? "Semestral" : "Inativo";
      const constClr = freq >= 0.8 ? "text-blue-500" : freq >= 0.4 ? "text-green-500" : freq >= 0.2 ? "text-yellow-600" : "text-red-500 font-black italic";

      return { 
        ...p, groupInfo, totalSales, totalPurchases, stock, recommendation, recColor, 
        turnoverPerc, constLabel, constClr, activeM: activeMCount,
        s3m: getMetrics(3), s6m: getMetrics(6), s12m: getMetrics(12)
      };
    });
  }, [products, groups, salesPeriods, sortedPeriods, purchaseOrders, isDark]);

  const dashboardFilteredData = useMemo(() => {
    let res = [...processedDataList];
    if (dashFilterGroup !== 'Todos') res = res.filter(p => p.groupId === dashFilterGroup);
    if (dashFilterModel !== 'Todos') res = res.filter(p => p.id === dashFilterModel);
    if (searchTerm) {
      const low = searchTerm.toLowerCase();
      res = res.filter(p => (p.cod || "").toLowerCase().includes(low) || (p.desc || "").toLowerCase().includes(low));
    }
    return res;
  }, [processedDataList, dashFilterGroup, dashFilterModel, searchTerm]);

  const dashboardKPIs = useMemo(() => {
    const data = dashboardFilteredData || [];
    const est = data.reduce((a, b) => a + (b?.stock || 0), 0);
    const ven = data.reduce((accProd, p) => {
      return accProd + (dashPeriods || []).reduce((accP, dp) => accP + (parseInt(p?.sales?.[dp.year]?.[dp.month]) || 0), 0);
    }, 0);
    const urg = data.filter(p => (p?.turnoverPerc || 0) >= 80 || (p?.stock || 0) <= 0);
    const slow = data.filter(p => p?.totalSales === 0 && p?.totalPurchases > 0);
    const top = [...data].sort((a,b) => (b.s12m?.units || 0) - (a.s12m?.units || 0))[0];
    return { est, ven, urg, slow, top };
  }, [dashboardFilteredData, dashPeriods]);

  const chartResults = useMemo(() => {
    const dataPoints = (dashPeriods || []).map((period, index) => {
        let sum = 0;
        dashboardFilteredData.forEach(prod => { sum += (parseInt(prod?.sales?.[period.year]?.[period.month]) || 0); });
        return { label: `${MONTH_NAMES[period.month]}/${String(period.year).slice(-2)}`, value: sum, x: index };
    });
    if (dataPoints.length < 2) return { points: dataPoints, forecast: 0 };
    const n = dataPoints.length;
    let sx=0, sy=0, sxy=0, sx2=0;
    dataPoints.forEach(d => { sx+=d.x; sy+=d.value; sxy+=d.x*d.value; sx2+=d.x*d.x; });
    const denominator = (n * sx2 - sx * sx);
    if (denominator === 0) return { points: dataPoints, forecast: 0 };
    const m = (n * sxy - sx * sy) / denominator;
    const b = (sy - m * sx) / n;
    return { points: dataPoints.map(d => ({ ...d, trend: Math.max(0, Math.round(m * d.x + b)) })), forecast: Math.max(0, Math.round(m * n + b)) };
  }, [dashboardFilteredData, dashPeriods]);

  const displayedPeriodsInSalesTable = useMemo(() => {
    if (filterMode === 'all') return sortedPeriods;
    if (filterMode === 'range') {
      const sVal = (parseInt(rangeStart?.year) || 0) * 12 + (rangeStart?.month || 0);
      const eVal = (parseInt(rangeEnd?.year) || 0) * 12 + (rangeEnd?.month || 0);
      return sortedPeriods.filter(p => {
        const cur = (parseInt(p?.year) || 0) * 12 + (p?.month || 0);
        return cur >= sVal && cur <= eVal;
      });
    }
    return sortedPeriods.filter(p => (selectedYears || []).includes(String(p?.year)));
  }, [sortedPeriods, filterMode, rangeStart, rangeEnd, selectedYears]);

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-orange-500" size={40}/></div>;

  return (
    <div className={`flex h-screen font-sans overflow-hidden font-bold transition-colors duration-300 ${isDark ? 'bg-slate-950 text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
      <style>{`
        .high-contrast-text, .table-header-dark th, th[class*="bg-orange-"], th[class*="bg-blue-"], .bg-orange-600 input, .bg-blue-600 input, .bg-orange-500 input, .bg-orange-500 button {
          color: #ffffff !important;
          text-shadow: 1px 1px 0px rgba(0,0,0,0.8), -0.5px -0.5px 0px rgba(0,0,0,0.8) !important;
        }
        h2, h3, p, span, td, th, label, input, select, button { text-shadow: 0.5px 0.5px 0px rgba(0,0,0,0.1); }
        .theme-select { background-color: ${isDark ? '#1e293b' : '#ffffff'} !important; color: ${isDark ? '#ffffff' : '#0f172a'} !important; border-color: ${isDark ? '#334155' : '#cbd5e1'} !important; }
        .theme-input { background-color: ${isDark ? '#0f172a' : '#ffffff'} !important; color: ${isDark ? '#ffffff' : '#0f172a'} !important; border-color: ${isDark ? '#334155' : '#cbd5e1'} !important; }
        .table-header-dark { background-color: #0f172a !important; color: #ffffff !important; }
        ${isDark ? `.text-white, td, th, h2, h3 { color: #ffffff !important; text-shadow: 0.8px 0.8px 0px #000; }` : `.text-slate-900, td, th, h2, h3 { color: #0f172a !important; }`}
        .status-badge { text-shadow: 1px 1px 0px rgba(0,0,0,0.4) !important; color: #fff !important; font-weight: 900; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #64748b; border-radius: 10px; }
        .drag-row { cursor: grab; transition: all 0.2s; }
        .drag-row:active { cursor: grabbing; opacity: 0.5; background: #e2e8f0; transform: scale(0.99); }
      `}</style>

      {!user ? (
        <div className={`min-h-screen w-full flex items-center justify-center p-6 font-bold transition-colors duration-500 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
          <div className={`max-w-md w-full space-y-8 p-10 rounded-3xl shadow-2xl border animate-in fade-in duration-500 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="text-center">
              <div className="inline-flex p-4 bg-orange-500 text-white rounded-3xl mb-4 shadow-lg shadow-orange-500/20"><Package size={40} /></div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Varivebox</h2>
              <p className="text-slate-400 text-sm mt-2 font-bold uppercase tracking-widest leading-tight">Painel de Acesso Seguro</p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              {loginError && <div className="p-4 bg-red-500/10 text-red-500 text-xs rounded-xl flex items-center gap-2 border border-red-500/20 animate-bounce"><AlertCircle size={16}/> {loginError}</div>}
              <div className="space-y-4 font-black">
                <input type="email" required className="w-full px-5 py-4 border-2 rounded-xl outline-none font-bold theme-input" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required className="w-full px-5 py-4 border-2 rounded-xl outline-none font-bold theme-input" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                </div>
              </div>
              <button type="submit" className="w-full flex justify-center py-4 rounded-2xl shadow-xl text-sm font-black text-white bg-orange-600 hover:bg-orange-500 active:scale-95 transition-all uppercase tracking-widest border-2 border-transparent">Entrar no Varivebox</button>
            </form>
          </div>
        </div>
      ) : isTransitioning ? (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white font-bold animate-in fade-in"><Rocket className="text-orange-500 animate-bounce duration-700 mb-6" size={80} /><h3 className="text-2xl font-black uppercase italic text-orange-500 animate-pulse">Segurança Ativa</h3></div>
      ) : (
        <>
          <aside className={`transition-all duration-300 flex flex-col shrink-0 z-40 shadow-2xl ${sidebarOpen ? 'w-64' : 'w-20'} ${isDark ? 'bg-slate-900' : 'bg-[#0f172a]'} text-white`}>
            <div className="p-6 flex items-center gap-3 border-b border-slate-700/50 shrink-0">
              <div className="bg-orange-500 p-2 rounded-lg shadow-inner"><Package size={22} className="text-white" /></div>
              {sidebarOpen && <span className="text-xl uppercase italic font-black">Varivebox</span>}
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
              {[
                { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
                { id: 'register', label: 'Cadastrar Itens', icon: PlusSquare },
                { id: 'purchases', label: 'Lançar Compras', icon: ShoppingCart },
                { id: 'sales', label: 'Lançar Vendas', icon: TrendingUp },
                { id: 'products', label: 'Estoque Total', icon: Package }
              ].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'text-slate-400 hover:bg-slate-800'}`}>
                  <item.icon size={20} />{sidebarOpen && <span className="text-sm">{item.label}</span>}
                </button>
              ))}
            </nav>
            <div className="p-4 flex flex-col gap-2 border-t border-slate-700/50">
                <button onClick={() => setIsLogoutModalOpen(true)} className="flex items-center gap-3 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"><LogOut size={20}/>{sidebarOpen && <span className="text-sm uppercase font-black text-red-400">Sair</span>}</button>
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-500 hover:text-white flex justify-center"><ChevronLeft size={20}/></button>
            </div>
          </aside>

          <main className="flex-1 flex flex-col overflow-hidden relative">
            <header className={`h-20 border-b flex items-center justify-between px-8 z-20 shadow-sm transition-colors ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              <h2 className="text-xl font-black uppercase italic text-orange-500">{activeTab === 'dashboard' ? "Inteligência" : activeTab}</h2>
              <div className="flex items-center gap-6">
                <div className="relative w-64 font-black">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" placeholder="Busca inteligente..." className="w-full pl-10 pr-4 py-2 rounded-full text-sm outline-none transition-all theme-input focus:ring-1 focus:ring-orange-400" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={toggleTheme} className={`p-2 rounded-full transition-all ${isDark ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {isDark ? <Sun size={20}/> : <Moon size={20}/>}
                </button>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] border-2 uppercase font-black ${isDark ? 'bg-slate-800 border-slate-700 text-green-400' : 'bg-green-50 border-green-200 text-green-700'}`}><Clock size={12} /> Cloud ON</div>
              </div>
            </header>

            <div className={`flex-1 overflow-y-auto p-6 space-y-8 transition-colors ${isDark ? 'bg-slate-950' : 'bg-slate-50/50'}`}>
              {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in font-bold">
                  {/* Filtros Dashboard */}
                  <div className={`p-4 rounded-2xl border-2 shadow-sm flex flex-wrap gap-8 items-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] uppercase font-black opacity-60">Modo Filtro</span>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                            <button onClick={() => setDashFilterMode('year')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${dashFilterMode === 'year' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500'}`}>Ano</button>
                            <button onClick={() => setDashFilterMode('range')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${dashFilterMode === 'range' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500'}`}>Intervalo</button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-black opacity-60">Janela</span>
                        <select className="block text-xs font-black rounded-lg border-2 p-2 outline-none theme-select" value={dashFilterYear} onChange={e => setDashFilterYear(e.target.value)}>
                          <option value="Todos">Ver Tudo (Histórico)</option>{YEARS_LIST.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                      {dashFilterMode === 'range' && (
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-black opacity-60">Intervalo Customizado</span>
                          <div className="flex items-center gap-2">
                            <select className="p-2 rounded-lg text-xs font-black border-2 outline-none theme-select" value={dashRangeStart.month} onChange={e => setDashRangeStart({...dashRangeStart, month: parseInt(e.target.value)})}>{MONTH_NAMES.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
                            <select className="p-2 rounded-lg text-xs font-black border-2 outline-none theme-select" value={dashRangeStart.year} onChange={e => setDashRangeStart({...dashRangeStart, year: e.target.value})}>{YEARS_LIST.map(y=><option key={y} value={y}>{y}</option>)}</select>
                            <span className="text-slate-400">até</span>
                            <select className="p-2 rounded-lg text-xs font-black border-2 outline-none theme-select" value={dashRangeEnd.month} onChange={e => setDashRangeEnd({...dashRangeEnd, month: parseInt(e.target.value)})}>{MONTH_NAMES.map((m,i)=><option key={i} value={i}>{m}</option>)}</select>
                            <select className="p-2 rounded-lg text-xs font-black border-2 outline-none theme-select" value={dashRangeEnd.year} onChange={e => setDashRangeEnd({...dashRangeEnd, year: e.target.value})}>{YEARS_LIST.map(y=><option key={y} value={y}>{y}</option>)}</select>
                          </div>
                        </div>
                      )}
                      <div className="space-y-1"><span className="text-[9px] uppercase font-black opacity-60">Grupo</span><select className="block text-xs font-black rounded-lg border-2 p-2 outline-none theme-select" value={dashFilterGroup} onChange={e => setDashFilterGroup(e.target.value)}><option value="Todos">Todos os Grupos</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                      <div className="space-y-1"><span className="text-[9px] uppercase font-black opacity-60">Modelo</span><select className="block text-xs font-black rounded-lg border-2 p-2 outline-none theme-select" value={dashFilterModel} onChange={e => setDashFilterModel(e.target.value)}><option value="Todos">Todos os Modelos</option>{products.map(p => <option key={p.id} value={p.id}>{p.cod}</option>)}</select></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
                    <StatCard title="Estoque Atual" value={dashboardKPIs.est} sub="Unidades em Mão" icon={Package} colorClass="border-blue-500" isDark={isDark} />
                    <StatCard title="Vendas no Período" value={dashboardKPIs.ven} sub="Total Unidades" icon={TrendingUp} colorClass="border-green-500" isDark={isDark} />
                    <StatCard title="Urgência" value={dashboardKPIs.urg.length} sub="Giro Crítico" icon={AlertCircle} colorClass="border-orange-500" active={dashboardKPIs.urg.length > 0} tooltipList={dashboardKPIs.urg} isDark={isDark} />
                    <StatCard title="Sem Giro" value={dashboardKPIs.slow.length} sub="Nunca Vendidos" icon={TrendingDown} colorClass="border-slate-400" tooltipList={dashboardKPIs.slow} isDark={isDark} />
                    <StatCard title="Previsão Próx" value={chartResults.forecast} sub="IA Estimativa" icon={Zap} colorClass="border-purple-500 text-purple-500" isDark={isDark} />
                    <StatCard title="Carro-Chefe" value={dashboardKPIs.top?.cod || "---"} sub="Melhor Saída" icon={Star} colorClass="border-yellow-500 text-yellow-500" isDark={isDark} />
                  </div>

                  <div className={`p-8 rounded-3xl border-2 shadow-sm h-[400px] ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <h3 className={`text-sm font-black uppercase flex items-center gap-2 mb-8 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}><BarChart3 size={20} className="text-blue-500" /> Curva de Vendas vs IA</h3>
                    <ResponsiveContainer width="100%" height="85%">
                      <ComposedChart data={chartResults.points}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                        <XAxis dataKey="label" fontSize={10} axisLine={false} tickLine={false} stroke={isDark ? '#94a3b8' : '#475569'} />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} stroke={isDark ? '#94a3b8' : '#475569'} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: isDark ? '#0f172a' : '#fff', color: isDark ? '#fff' : '#000' }} />
                        <Legend verticalAlign="top" align="right" wrapperStyle={{fontSize: '10px'}} />
                        <Bar dataKey="value" name="Vendas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={35} />
                        <Line type="monotone" dataKey="trend" name="Tendência IA" stroke="#f97316" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* TABELA DE INTELIGÊNCIA RESTAURADA */}
                  <div className={`rounded-3xl border-2 shadow-sm overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className={`p-4 flex items-center gap-2 font-black uppercase text-xs border-b ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-950 text-white'}`}><ListFilter size={18} className="text-orange-500" /> Inteligência de Performance</div>
                      <table className="w-full text-xs text-left font-black">
                        <thead className="uppercase text-[10px] font-black table-header-dark text-white">
                          <tr>
                            <th className="p-4 high-contrast-text">Modelo</th>
                            <th className="text-center high-contrast-text">Giro Total %</th>
                            <th className="text-center high-contrast-text">Janela 3m</th>
                            <th className="text-center high-contrast-text">Janela 6m</th>
                            <th className="text-center high-contrast-text">Janela 12m</th>
                            <th className="text-center high-contrast-text">Constância</th>
                            <th className="text-center high-contrast-text">Status</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                          {dashboardFilteredData.sort((a,b) => (b.turnoverPerc || 0) - (a.turnoverPerc || 0)).map(p => (
                            <tr key={p.id} className={`${p.turnoverPerc >= 80 ? isDark ? 'bg-orange-500/5' : 'bg-orange-50' : p.stock <= 0 ? isDark ? 'bg-red-500/5' : 'bg-red-50' : ''} transition-all group`}>
                              <td className="p-4 border-l-4 font-black" style={{ borderLeftColor: p.groupInfo.color }}>
                                  <div className={isDark ? 'text-white' : 'text-slate-900'}>{p.cod}</div>
                                  <div className="text-[9px] text-slate-500 uppercase font-bold">{p.groupInfo.name}</div>
                              </td>
                              <td className={`p-4 text-center font-black ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>{p.turnoverPerc.toFixed(1)}%</td>
                              <td className="p-4 text-center">
                                <div className="text-[10px] text-blue-500">{p.s3m.perc}%</div>
                                <div className="text-[9px] opacity-50">{p.s3m.units} un</div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="text-[10px] text-blue-500">{p.s6m.perc}%</div>
                                <div className="text-[9px] opacity-50">{p.s6m.units} un</div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="text-[10px] text-blue-500">{p.s12m.perc}%</div>
                                <div className="text-[9px] opacity-50">{p.s12m.units} un</div>
                              </td>
                              <td className="p-4 text-center font-black"><div className={p.constClr}>{p.constLabel}</div></td>
                              <td className="p-4 text-center"><span className={`status-badge px-3 py-1 rounded-full text-[9px] uppercase shadow-sm ${p.recColor}`}>{p.recommendation}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                </div>
              )}

              {activeTab === 'purchases' && (
                <div className="space-y-6 animate-in slide-in-from-left-4 font-bold">
                    <div className={`p-6 rounded-2xl border-2 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="flex flex-wrap items-center gap-6">
                        <h3 className="text-xl font-black italic uppercase text-orange-500 flex items-center gap-2"><ShoppingCart size={24} /> Compras China</h3>
                        <div className="flex items-center gap-2 border-l pl-6 border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] uppercase opacity-70">Ano:</span>
                          <select className="p-2 rounded-lg text-xs font-black border-2 outline-none theme-select" value={purchaseFilterYear} onChange={e => setPurchaseFilterYear(e.target.value)}>
                            <option value="Todos">Ver Tudo</option>{YEARS_LIST.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input type="text" placeholder="Busca de Lote / NF..." className="pl-10 pr-4 py-2 rounded-xl text-xs font-black border-2 outline-none theme-select focus:border-orange-500 transition-all" value={purchaseSearch} onChange={e => setPurchaseSearch(e.target.value)} />
                        </div>
                      </div>
                      <button onClick={addNewOrder} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase shadow-lg hover:bg-blue-700 active:scale-95 border-2 border-transparent flex items-center gap-2"><Plus size={16} /> Novo Lote</button>
                    </div>

                    <div className={`rounded-2xl border-2 shadow-xl overflow-hidden font-black ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div className="overflow-x-auto font-black custom-scrollbar">
                        <table className="w-full text-sm border-collapse font-black">
                          <thead className="uppercase text-[10px] font-black table-header-dark text-white">
                            <tr className="border-b border-slate-700">
                              <th className="p-4 text-left bg-[#0f172a] text-blue-400 sticky left-0 z-20 font-black min-w-[200px] high-contrast-text">Nº COMPRA:</th>
                              {filteredPurchaseOrders.map(o => (
                                <th className="p-4 text-center bg-orange-600 text-white border-l border-orange-700 group relative min-w-[140px] font-black" key={o.id}>
                                  <input className="w-full bg-transparent text-center outline-none font-black text-lg high-contrast-text" value={o.order_num || ''} onChange={e => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'purchaseOrders', o.id), {order_num: e.target.value})} />
                                  <button onClick={() => { setOrderToDelete(o); setIsOrderDeleteModalOpen(true); }} className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 transition-opacity"><Trash2 size={12} /></button>
                                </th>
                              ))}
                              <th rowSpan={4} className="p-4 text-center text-white border-l-2 border-slate-700 bg-[#0f172a] high-contrast-text">TOTAL</th>
                            </tr>
                            {['order_date', 'arrival_date', 'invoice'].map((f) => (
                              <tr key={f} className="border-b border-slate-700">
                                <th className={`p-3 text-left font-black sticky left-0 z-20 uppercase tracking-tighter bg-[#0f172a] text-white/80 high-contrast-text`}>{f === 'order_date' ? 'PEDIDO' : f === 'arrival_date' ? 'CHEGADA' : 'NF'}</th>
                                {filteredPurchaseOrders.map(o => (
                                  <th key={o.id} className="p-2 border-l border-slate-700 font-black bg-slate-800/40">
                                    <input type={f.includes('date') ? 'date' : 'text'} className="w-full bg-transparent text-center font-black text-[10px] text-white uppercase outline-none high-contrast-text" value={o[f] || ''} onChange={e => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'purchaseOrders', o.id), {[f]: e.target.value})} />
                                  </th>
                                ))}
                              </tr>
                            ))}
                          </thead>
                          <tbody className={`divide-y-2 ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                            {dashboardFilteredData.map(p => (
                              <tr key={p.id} className="hover:bg-blue-500/5 transition-colors font-black">
                                <td className={`p-4 sticky left-0 z-10 border-r-2 border-l-4 font-black ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`} style={{ borderLeftColor: p.groupInfo.color }}>{p.cod}</td>
                                {filteredPurchaseOrders.map(o => (
                                  <td key={o.id} className="p-2 border-l border-slate-200/10 text-center font-black">
                                    <input type="number" min="0" value={p?.purchases_map?.[o.id] || 0} onChange={(e) => updatePurchaseQty(p.id, o.id, e.target.value)} className="w-16 text-center rounded-lg border-2 font-black text-blue-600 outline-none theme-select" />
                                  </td>
                                ))}
                                <td className={`p-4 text-center font-black ${isDark ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-900'}`}>{p.totalPurchases}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                </div>
              )}

              {activeTab === 'sales' && (
                 <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 font-bold">
                   <div className={`p-6 rounded-2xl border-2 shadow-sm space-y-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                       <div className="flex flex-wrap items-center gap-4">
                         <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                            <button onClick={() => setFilterMode('manual')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${filterMode === 'manual' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500'}`}>Ano</button>
                            <button onClick={() => setFilterMode('range')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${filterMode === 'range' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500'}`}>Intervalo</button>
                            <button onClick={() => setFilterMode('all')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${filterMode === 'all' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500'}`}>Tudo</button>
                         </div>
                         {filterMode === 'manual' && (
                           <select className="p-2 rounded-xl text-xs font-black border-2 outline-none theme-select" value={selectedYears[0]} onChange={e => setSelectedYears([e.target.value])}>{YEARS_LIST.map(y => <option key={y} value={y}>{y}</option>)}</select>
                         )}
                       </div>
                       <button onClick={() => setIsPeriodModalOpen(true)} className="bg-orange-500 text-white px-5 py-2 rounded-xl text-xs flex items-center gap-2 font-black uppercase hover:bg-orange-600 transition-all shadow-lg border-2 border-transparent"><PlusSquare size={16}/> Novo Mês</button>
                     </div>
                   </div>
                   
                   <div className={`rounded-2xl border-2 shadow-xl overflow-hidden font-black ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                     <div className="overflow-x-auto font-black custom-scrollbar">
                       <table className="w-full text-sm border-collapse font-black">
                         <thead className="uppercase text-[10px] font-black table-header-dark text-white sticky top-0 z-10">
                           <tr>
                             <th className="p-5 text-left sticky left-0 z-20 bg-[#0f172a] border-r border-slate-700 min-w-[180px] high-contrast-text">Produto</th>
                             {displayedPeriodsInSalesTable.map(p => (
                               <th key={p.id} className="p-4 text-center text-orange-400 border-l border-slate-700 group font-black whitespace-nowrap min-w-[100px] bg-[#0f172a]">
                                  <span className="high-contrast-text">{MONTH_NAMES[p.month]}/{String(p.year).slice(-2)}</span>
                                  <button onClick={() => { setPeriodToDelete(p); setIsPeriodDeleteModalOpen(true); }} className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                               </th>
                             ))}
                             <th className="p-5 text-center bg-orange-700 text-white border-l border-orange-800 uppercase high-contrast-text">Total</th>
                             <th className="p-5 text-center bg-blue-700 text-white border-l border-blue-800 uppercase high-contrast-text">Saldo</th>
                           </tr>
                         </thead>
                         <tbody className={`divide-y-2 ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                           {dashboardFilteredData.map(p => {
                             const totalFilteredSales = displayedPeriodsInSalesTable.reduce((acc, dp) => acc + (parseInt(p?.sales?.[dp.year]?.[dp.month]) || 0), 0);
                             return (
                               <tr key={p.id} className="hover:bg-blue-500/5 transition-colors font-black">
                                 <td className={`p-4 font-black border-l-4 sticky left-0 z-10 border-r-2 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`} style={{ borderLeftColor: p.groupInfo.color }}>
                                    <div className="text-sm">{p.cod}</div>
                                    <div className="text-[9px] text-slate-500 italic uppercase font-black truncate max-w-[150px]">{p.desc}</div>
                                 </td>
                                 {displayedPeriodsInSalesTable.map(dp => (
                                   <td key={dp.id} className="p-2 border-l border-slate-200/10 text-center">
                                     <input type="number" min="0" defaultValue={p?.sales?.[dp.year]?.[dp.month] || 0} onBlur={(e) => updateMonthlySale(p.id, dp.year, dp.month, e.target.value)} className="w-16 text-center border-2 rounded-lg p-1.5 font-black outline-none focus:ring-1 focus:ring-orange-400 theme-select" />
                                   </td>
                                 ))}
                                 <td className={`p-4 text-center font-black ${isDark ? 'text-orange-400 bg-orange-500/5' : 'text-orange-700 bg-orange-50'}`}>{totalFilteredSales}</td>
                                 <td className={`p-4 text-center font-black text-lg ${p.stock <= 5 ? 'text-red-500 animate-pulse' : isDark ? 'text-blue-400' : 'text-blue-600'}`}>{p.stock}</td>
                               </tr>
                             );
                           })}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 </div>
              )}

              {activeTab === 'products' && (
                <div className="max-w-7xl mx-auto animate-in fade-in space-y-6 font-black">
                  <div className={`rounded-2xl border-2 shadow-sm overflow-hidden font-black ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <table className="w-full text-left font-black border-collapse">
                        <thead className="uppercase text-[10px] font-black table-header-dark text-white">
                            <tr>
                                <th className="px-8 py-5 high-contrast-text">Item / Descrição</th>
                                <th className="text-center font-black high-contrast-text">Entradas</th>
                                <th className="text-center font-black high-contrast-text">Saídas</th>
                                <th className="high-contrast-text">Saldo</th>
                                <th className="high-contrast-text">Situação Preditiva</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y-2 ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                            {dashboardFilteredData.map(p => (
                                <tr key={p.id} className="hover:bg-blue-500/5 transition-colors font-black">
                                    <td className={`px-8 py-6 border-l-4 font-black ${isDark ? 'text-slate-300' : 'text-slate-900'}`} style={{ borderLeftColor: p.groupInfo.color }}>
                                        <div className={isDark ? 'text-white' : 'text-slate-900 text-lg'}>{p.cod}</div>
                                        <span className="text-[10px] uppercase italic text-slate-500 font-bold">{p.desc}</span>
                                    </td>
                                    <td className="px-8 py-6 text-center font-black text-blue-500 text-base">{p.totalPurchases}</td>
                                    <td className="px-8 py-6 text-center font-black text-orange-500 text-base">- {p.totalSales}</td>
                                    <td className={`px-8 py-6 text-2xl font-black ${p.stock < 15 ? 'text-red-500' : isDark ? 'text-white' : 'text-slate-900'}`}>{p.stock}</td>
                                    <td className="px-8 py-6 font-black"><span className={`status-badge px-4 py-1.5 rounded-full text-[9px] uppercase shadow-sm ${p.recColor}`}>{p.recommendation}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'register' && (
                <div className="space-y-8 animate-in fade-in font-bold">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-black">
                    <div className={`p-6 rounded-2xl border-2 shadow-sm space-y-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <h3 className="text-lg font-black flex items-center gap-2 italic text-orange-500"><Tag size={20} /> Novo Grupo</h3>
                        <input type="text" placeholder="Nome" className="w-full p-3 rounded-xl outline-none uppercase font-black border-2 theme-input" value={newGroupData.name} onChange={e => setNewGroupData({...newGroupData, name: e.target.value.toUpperCase()})} />
                        <div className="flex gap-2">
                            <input type="color" className="w-12 h-10 border-none bg-transparent" value={newGroupData.color} onChange={e => setNewGroupData({...newGroupData, color: e.target.value})} />
                            <button onClick={handleSaveGroup} className="flex-1 bg-orange-600 text-white rounded-xl text-xs uppercase font-black hover:bg-orange-500 transition-all border-2 border-transparent">Salvar</button>
                        </div>
                    </div>
                    <div className={`lg:col-span-2 p-6 rounded-2xl border-2 shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <h3 className="text-[10px] uppercase mb-4 font-black text-slate-500">Grupos</h3>
                        <div className="flex flex-wrap gap-4">{groups.map(g => (<div key={g.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 font-black theme-select"><div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: g.color }} /><span>{g.name}</span><div className="flex gap-2 ml-4"><button onClick={() => handleEditGroup(g)} className="text-blue-600"><Edit2 size={16}/></button><button onClick={() => deleteGroup(g.id)} className="text-red-500"><Trash2 size={16}/></button></div></div>))}</div>
                    </div>
                  </div>
                  <div className={`rounded-2xl border-2 shadow-sm overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div className={`p-6 border-b-2 flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}><h3 className="text-xl font-black uppercase italic text-orange-500">Catálogo (Arraste para Ordenar)</h3><button onClick={() => handleOpenProductModal()} className="bg-orange-500 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg uppercase flex items-center gap-2 hover:bg-orange-600 border-2 border-transparent high-contrast-text"><Plus size={18} /> Novo Produto</button></div>
                    <table className="w-full text-left font-black border-collapse">
                        <thead className="uppercase text-[10px] font-black table-header-dark text-white">
                            <tr>
                                <th className="p-5 high-contrast-text w-12 text-center">#</th>
                                <th className="p-5 high-contrast-text">Cód</th>
                                <th className="high-contrast-text">Descrição</th>
                                <th className="text-center high-contrast-text">Grupo</th>
                                <th className="text-center high-contrast-text">Ações</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y-2 ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                            {dashboardFilteredData.map((p, idx) => (
                                <tr 
                                  key={p.id} 
                                  draggable 
                                  onDragStart={() => onDragStart(idx)}
                                  onDragOver={onDragOver}
                                  onDrop={() => onDrop(idx)}
                                  className="hover:bg-blue-500/5 transition-colors font-black drag-row"
                                >
                                    <td className="p-4 text-slate-400 text-center"><GripVertical size={16} /></td>
                                    <td className={`p-6 border-l-4 font-black ${isDark ? 'text-slate-300' : 'text-slate-900'}`} style={{ borderLeftColor: p.groupInfo.color }}>{p.cod}</td>
                                    <td className={`font-black uppercase text-xs ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>{p.desc}</td>
                                    <td className="text-center font-bold">
                                        <span className="px-3 py-1 rounded-lg text-[10px] uppercase border-2 font-black" style={{ color: p.groupInfo.color, borderColor: p.groupInfo.color + '40' }}>{p.groupInfo.name}</span>
                                    </td>
                                    <td className="text-center font-black">
                                        <div className="flex justify-center gap-4">
                                            <button onClick={() => handleOpenProductModal(p)} className="p-2 text-blue-600"><Edit2 size={18}/></button>
                                            <button onClick={() => { setProductToDelete(p); setIsDeleteModalOpen(true); }} className="p-2 text-red-500"><Trash2 size={18}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </main>
        </>
      )}

      {/* Modais */}
      {isPeriodModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in zoom-in-95 font-black">
          <div className={`rounded-3xl shadow-2xl w-full max-w-md p-8 border-2 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <h3 className="text-2xl font-black uppercase italic mb-6 text-orange-500 border-b-2 pb-2 inline-block">Novo Período</h3>
            <div className="space-y-4 font-black">
              <div className="space-y-1"><label className="text-[10px] uppercase text-slate-500">Mês</label><select className="w-full p-4 rounded-xl outline-none font-black border-2 theme-select" value={newPeriod.month} onChange={e => setNewPeriod({...newPeriod, month: parseInt(e.target.value)})}>{MONTH_NAMES.map((name, idx) => <option key={idx} value={idx}>{name}</option>)}</select></div>
              <div className="space-y-1"><label className="text-[10px] uppercase text-slate-500">Ano</label><select className="w-full p-4 rounded-xl outline-none font-black border-2 theme-select" value={newPeriod.year} onChange={e => setNewPeriod({...newPeriod, year: e.target.value})}>{YEARS_LIST.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
              <div className="flex gap-4 mt-6"><button onClick={() => setIsPeriodModalOpen(false)} className={`flex-1 py-4 uppercase font-black ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>Cancelar</button><button onClick={handleAddPeriod} className="flex-1 py-4 bg-orange-600 text-white rounded-xl uppercase font-black shadow-lg border-2 border-transparent high-contrast-text">Adicionar</button></div>
            </div>
          </div>
        </div>
      )}

      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm font-black">
          <div className={`rounded-3xl shadow-2xl w-full max-sm p-10 text-center border-2 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
             <div className="inline-flex p-5 bg-red-100 text-red-600 rounded-full mb-6 border-2 border-red-200"><LogOut size={48}/></div>
             <h3 className="text-2xl font-black uppercase italic mb-2">Sair do Sistema?</h3>
             <p className={`mb-8 font-black ${isDark ? 'text-slate-400' : 'text-slate-900'}`}>Tem certeza de que deseja encerrar a sessão?</p>
             <div className="flex gap-4"><button onClick={() => setIsLogoutModalOpen(false)} className={`flex-1 py-4 border-2 rounded-2xl uppercase font-black theme-select`}>Voltar</button><button onClick={confirmLogout} className="flex-1 py-4 bg-red-600 text-white rounded-2xl uppercase font-black border-2 border-transparent high-contrast-text">Sair Agora</button></div>
          </div>
        </div>
      )}

      {isProductModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in zoom-in-95 font-black">
          <div className={`rounded-3xl shadow-2xl w-full max-w-md p-8 border-2 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <h3 className="text-2xl font-black uppercase italic mb-6 text-orange-500 border-b-2 pb-2 inline-block">Dados do Item</h3>
            <div className="space-y-4 font-black">
              <input type="text" className="w-full p-4 rounded-xl outline-none font-black border-2 theme-input" value={newProductData.cod} onChange={e => setNewProductData({...newProductData, cod: e.target.value.toUpperCase()})} placeholder="Código" />
              <input type="text" className="w-full p-4 rounded-xl outline-none font-black border-2 theme-input" value={newProductData.desc} onChange={e => setNewProductData({...newProductData, desc: e.target.value.toUpperCase()})} placeholder="Descrição" />
              <select className="w-full p-4 rounded-xl outline-none font-black border-2 theme-select" value={newProductData.groupId} onChange={e => setNewProductData({...newProductData, groupId: e.target.value})}>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
              <div className="flex gap-4 mt-6"><button onClick={() => setIsProductModalOpen(false)} className={`flex-1 py-4 uppercase font-black ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>Cancelar</button><button onClick={handleSaveProduct} className="flex-1 py-4 bg-orange-600 text-white rounded-xl uppercase font-black shadow-lg border-2 border-transparent high-contrast-text">Salvar</button></div>
            </div>
          </div>
        </div>
      )}

      {/* Modais de Exclusão */}
      {[
        { open: isDeleteModalOpen, setOpen: setIsDeleteModalOpen, confirm: confirmDeleteProduct, title: "Excluir Permanente?", body: `Remover ${productToDelete?.cod}?` },
        { open: isOrderDeleteModalOpen, setOpen: setIsOrderDeleteModalOpen, confirm: confirmDeleteOrder, title: "Excluir Lote?", body: `Remover lote ${orderToDelete?.order_num}?` },
        { open: isPeriodDeleteModalOpen, setOpen: setIsPeriodDeleteModalOpen, confirm: confirmDeletePeriod, title: "Excluir Período?", body: `Remover mês ${MONTH_NAMES[periodToDelete?.month]} / ${periodToDelete?.year}?` }
      ].map((m, i) => m.open && (
        <div key={i} className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm font-black animate-in fade-in">
          <div className={`rounded-3xl shadow-2xl w-full max-sm p-10 text-center border-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 text-slate-900'}`}>
            <AlertTriangle className="mx-auto text-red-600 mb-4 animate-bounce" size={48} />
            <h3 className="text-xl font-black uppercase mb-8 text-red-500">{m.title}</h3>
            <p className="mb-8 font-black">{m.body}</p>
            <div className="flex gap-3"><button onClick={() => m.setOpen(false)} className="flex-1 py-3 border-2 rounded-xl uppercase font-black theme-select">Não</button><button onClick={m.confirm} className="flex-1 py-3 bg-red-600 text-white rounded-xl uppercase font-black shadow-lg border-2 border-transparent high-contrast-text">Deletar</button></div>
          </div>
        </div>
      ))}
    </div>
  );
}
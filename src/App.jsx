import React, { useState, useMemo, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, onSnapshot, 
  deleteDoc, updateDoc, getDoc 
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
  TrendingDown, Star, Info, Eye, EyeOff, Lock, User, Rocket, LogOut, Sun, Moon
} from 'lucide-react';
import { 
  Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Area, Bar, ComposedChart, Legend
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

// --- COMPONENTE DE CARD COM HOVER CORRIGIDO ---
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
                <h3 className={`text-2xl font-black leading-none ${active ? 'text-red-600' : isDark ? 'text-white' : 'text-black'}`}>{value}</h3>
                {sub && <p className={`text-[10px] mt-2 font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{sub}</p>}
            </div>
            <div className={`p-2 rounded-xl ${active ? 'bg-red-500/10 text-red-500' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-950'}`}>
                <Icon size={18} />
            </div>
        </div>

        {showTooltip && tooltipList && tooltipList.length > 0 && (
          <div className="absolute top-[90%] left-0 w-full min-w-[240px] bg-slate-900 text-white text-[10px] p-4 rounded-xl z-[70] shadow-2xl animate-in fade-in zoom-in-95 border-2 border-orange-500/50">
            <p className="font-black border-b border-slate-700 pb-2 mb-2 uppercase text-orange-400 flex items-center gap-1">
              <Info size={12}/> Detalhes:
            </p>
            <ul className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {tooltipList.map((item, i) => (
                <li key={i} className="flex justify-between border-b border-slate-800/50 pb-1 last:border-none">
                  <span className="font-bold text-orange-100">{item.cod}</span>
                  <span className="opacity-60 truncate ml-2 text-right">{item.desc}</span>
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
  const [dataLoading, setDataLoading] = useState(true);
  
  // Login States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Data States
  const [products, setProducts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [salesPeriods, setSalesPeriods] = useState([]);
  
  // UI Control
  const [selectedYears, setSelectedYears] = useState(['2025']); 
  const [filterMode, setFilterMode] = useState('manual'); 
  const [rangeStart, setRangeStart] = useState({ month: 0, year: '2025' });
  const [rangeEnd, setRangeEnd] = useState({ month: 11, year: '2025' });
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Dash Filters
  const [dashFilterYear, setDashFilterYear] = useState('Todos');
  const [dashFilterGroup, setDashFilterGroup] = useState('Todos');
  const [dashFilterModel, setDashFilterModel] = useState('Todos');

  // Modals / Editing
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

  // 1. Auth & Theme Prefs
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
            const prefRef = doc(db, 'artifacts', appId, 'public', 'data', 'userSettings', u.uid);
            const prefSnap = await getDoc(prefRef);
            if (prefSnap.exists()) setTheme(prefSnap.data().theme || 'light');
        } catch (e) { console.warn("Preferências não encontradas."); }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Sincronização de Dados
  useEffect(() => {
    if (!user) return;
    const getColRef = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);
    const unsubGroups = onSnapshot(getColRef('groups'), snap => setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubOrders = onSnapshot(getColRef('purchaseOrders'), snap => setPurchaseOrders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubPeriods = onSnapshot(getColRef('salesPeriods'), snap => setSalesPeriods(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubProducts = onSnapshot(getColRef('products'), snap => {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setDataLoading(false);
    });
    return () => { unsubGroups(); unsubOrders(); unsubPeriods(); unsubProducts(); };
  }, [user]);

  // --- LOGICA DE NEGÓCIO ---
  const sortedPeriods = useMemo(() => {
    return [...salesPeriods].sort((a, b) => (a.year !== b.year ? parseInt(a.year) - parseInt(b.year) : a.month - b.month));
  }, [salesPeriods]);

  const displayedPeriodsInSales = useMemo(() => {
    if (filterMode === 'range') {
      const sVal = parseInt(rangeStart.year) * 12 + rangeStart.month;
      const eVal = parseInt(rangeEnd.year) * 12 + rangeEnd.month;
      return sortedPeriods.filter(p => {
        const cur = parseInt(p.year) * 12 + p.month;
        return cur >= sVal && cur <= eVal;
      });
    }
    return sortedPeriods.filter(p => selectedYears.includes(p.year));
  }, [sortedPeriods, filterMode, rangeStart, rangeEnd, selectedYears]);

  const processedDataList = useMemo(() => {
    return products.map(p => {
      const groupInfo = groups.find(g => g.id === p.groupId) || { name: 'S/ Grupo', color: '#94a3b8' };
      const totalSales = Object.values(p.sales || {}).reduce((acc, y) => acc + (Array.isArray(y) ? y.reduce((s, v) => s + (v || 0), 0) : 0), 0);
      const totalPurchases = Object.entries(p.purchases_map || {}).reduce((acc, [_, q]) => acc + (q || 0), 0);
      const stock = totalPurchases - totalSales;
      const turnoverPerc = totalPurchases > 0 ? (totalSales / totalPurchases) * 100 : 0;

      let recommendation = "OK";
      let recColor = isDark ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-green-100 text-green-700 border-green-200";
      if (stock <= 0) { 
        recommendation = "CRÍTICO"; recColor = "bg-red-600 text-white animate-pulse border-red-700"; 
      } else if (turnoverPerc >= 80) { 
        recommendation = "URGENTE"; recColor = isDark ? "bg-orange-600 text-white animate-bounce border-orange-700" : "bg-orange-500 text-white animate-bounce border-orange-600"; 
      } else if (turnoverPerc >= 50) { 
        recommendation = "ALERTA"; recColor = isDark ? "bg-yellow-500 text-black font-black border-yellow-600" : "bg-yellow-400 text-black font-black border-yellow-500"; 
      }

      const getMetrics = (n) => {
        const lastN = sortedPeriods.slice(-n);
        const winSumVal = lastN.reduce((s, pr) => s + (p.sales?.[pr.year]?.[pr.month] || 0), 0);
        return { units: winSumVal, perc: totalSales > 0 ? ((winSumVal / totalSales) * 100).toFixed(0) : 0 };
      };

      const last6 = sortedPeriods.slice(-6);
      const soldLast6 = last6.reduce((s, pr) => s + (p.sales?.[pr.year]?.[pr.month] || 0), 0);
      const isSlowMover = turnoverPerc < 20 || (last6.length >= 6 && soldLast6 === 0);

      let activeM = 0;
      Object.values(p.sales || {}).forEach(arr => { if(Array.isArray(arr)) arr.forEach(v => { if(v > 0) activeM++; }); });
      const freq = activeM / (salesPeriods.length || 1);
      
      // Ajuste: Mudança de "Promoção" para "Inativo"
      const constLabel = freq >= 0.8 ? "Mensal" : freq >= 0.4 ? "Trimestral" : freq >= 0.2 ? "Semestral" : "Inativo";
      const constClr = freq >= 0.8 ? "text-blue-500" : freq >= 0.4 ? "text-green-500" : freq >= 0.2 ? "text-yellow-500" : "text-red-600 font-black italic";

      return { 
        ...p, groupInfo, totalSales, totalPurchases, stock, recommendation, recColor, 
        turnoverPerc, isSlowMover, constLabel, constClr, activeM,
        s3m: getMetrics(3), s6m: getMetrics(6), s12m: getMetrics(12)
      };
    });
  }, [products, groups, salesPeriods, sortedPeriods, isDark]);

  const dashboardFilteredData = useMemo(() => {
    let res = processedDataList;
    if (dashFilterGroup !== 'Todos') res = res.filter(p => p.groupId === dashFilterGroup);
    if (dashFilterModel !== 'Todos') res = res.filter(p => p.id === dashFilterModel);
    return res;
  }, [processedDataList, dashFilterGroup, dashFilterModel]);

  const dashboardKPIs = useMemo(() => {
    const data = dashboardFilteredData;
    const est = data.reduce((a, b) => a + b.stock, 0);
    const ven = data.reduce((a, b) => a + b.totalSales, 0);
    const urg = data.filter(p => p.turnoverPerc >= 80 || p.stock <= 0);
    const slow = data.filter(p => p.isSlowMover);
    const top = [...data].sort((a,b) => (b.s12m.units * b.activeM) - (a.s12m.units * a.activeM))[0];
    return { est, ven, urg, slow, top };
  }, [dashboardFilteredData]);

  const chartResults = useMemo(() => {
    const timeData = sortedPeriods
      .filter(p => dashFilterYear === 'Todos' || p.year === dashFilterYear)
      .map((period, index) => {
        let sum = 0;
        dashboardFilteredData.forEach(prod => { sum += (prod.sales?.[period.year]?.[period.month] || 0); });
        return { label: `${MONTH_NAMES[period.month]}/${period.year.slice(2)}`, value: sum, x: index };
      });

    if (timeData.length < 2) return { points: timeData, forecast: 0 };
    const n = timeData.length;
    let sx=0, sy=0, sxy=0, sx2=0;
    timeData.forEach(d => { sx+=d.x; sy+=d.value; sxy+=d.x*d.value; sx2+=d.x*d.x; });
    const m = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
    const b = (sy - m * sx) / n;
    return { points: timeData.map(d => ({ ...d, trend: Math.max(0, Math.round(m * d.x + b)) })), forecast: Math.max(0, Math.round(m * n + b)) };
  }, [dashboardFilteredData, sortedPeriods, dashFilterYear]);

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setIsTransitioning(true);
      setTimeout(() => setIsTransitioning(false), 2000);
    } catch (err) { setLoginError('Credenciais inválidas.'); }
  };

  const confirmLogout = async () => {
    try { 
      await signOut(auth); 
      setEmail(''); 
      setPassword(''); 
      setIsLogoutModalOpen(false); 
    } catch (err) { console.error(err); }
  };

  const handleSaveProduct = async () => {
    if (!newProductData.cod || !user) return;
    const id = editingProduct ? editingProduct.id : Date.now().toString();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id), { ...newProductData, sales: editingProduct?.sales || {}, purchases_map: editingProduct?.purchases_map || {} });
    setIsProductModalOpen(false);
  };
  
  const handleSaveGroup = async () => {
    if (!newGroupData.name || !user) return;
    const id = editingGroup ? editingGroup.id : `g-${Date.now()}`;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'groups', id), newGroupData);
    setNewGroupData({ name: '', color: '#3b82f6' });
    setEditingGroup(null);
  };

  const deleteGroup = async (id) => { if(user && window.confirm("Excluir grupo?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'groups', id)); };
  const handleEditGroup = (g) => { setEditingGroup(g); setNewGroupData({ name: g.name, color: g.color }); };

  const updateMonthlySale = async (id, y, m, v) => {
    const prod = products.find(p => p.id === id);
    if (!prod || !user) return;
    const s = { ...prod.sales }; if(!s[y]) s[y] = Array(12).fill(0); s[y][m] = parseInt(v) || 0;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id), { sales: s });
  };

  const updatePurchaseQty = async (id, o, v) => {
    const prod = products.find(p => p.id === id);
    if (!prod || !user) return;
    const m = { ...prod.purchases_map, [o]: parseInt(v) || 0 };
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id), { purchases_map: m });
  };

  const addNewOrder = async () => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'purchaseOrders', `order-${Date.now()}`), { order_num: (purchaseOrders.length + 1).toString(), order_date: '', arrival_date: '', invoice: '' });
  };

  const handleAddPeriod = async () => {
    if (!user) return;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'salesPeriods', `p-${newPeriod.month}-${newPeriod.year}`), newPeriod);
    setIsPeriodModalOpen(false);
  };

  const confirmDeleteOrder = async () => { if(orderToDelete && user) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'purchaseOrders', orderToDelete.id)); setIsOrderDeleteModalOpen(false); };
  const confirmDeleteProduct = async () => { if(productToDelete && user) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', productToDelete.id)); setIsDeleteModalOpen(false); };
  const confirmDeletePeriod = async () => { if(periodToDelete && user) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'salesPeriods', periodToDelete.id)); setIsPeriodDeleteModalOpen(false); };

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

  // --- UI RENDER ---

  if (authLoading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="animate-spin text-orange-500" size={40}/></div>;

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 font-bold transition-colors duration-500 ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-black'}`}>
        <div className={`max-w-md w-full space-y-8 p-10 rounded-3xl shadow-2xl border animate-in fade-in zoom-in-95 duration-500 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="text-center">
            <div className="inline-flex p-4 bg-orange-500 text-white rounded-3xl mb-4 shadow-lg shadow-orange-500/20"><Package size={40} /></div>
            <h2 className={`text-3xl font-black uppercase italic tracking-tighter ${isDark ? 'text-white' : 'text-black'}`}>Varivebox</h2>
            <p className="text-slate-400 text-sm mt-2 font-bold uppercase tracking-widest leading-tight">Painel de Acesso Seguro</p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            {loginError && <div className="p-4 bg-red-500/10 text-red-500 text-xs rounded-xl flex items-center gap-2 border border-red-500/20 animate-in slide-in-from-top-2"><AlertCircle size={16}/> {loginError}</div>}
            <div className="space-y-4 font-black">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-500 transition-colors"><User size={18}/></div>
                <input type="email" required className={`w-full pl-10 pr-4 py-3 border-none rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold ${isDark ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-slate-100 text-black placeholder-slate-400'}`} placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-orange-500 transition-colors"><Lock size={18}/></div>
                <input type={showPassword ? "text" : "password"} required className={`w-full pl-10 pr-12 py-3 border-none rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold ${isDark ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-slate-100 text-black placeholder-slate-400'}`} placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-orange-500 transition-colors">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
              </div>
            </div>
            <button type="submit" className="w-full flex justify-center py-4 px-4 rounded-2xl shadow-xl text-sm font-black text-white bg-slate-950 hover:bg-black dark:bg-orange-600 dark:hover:bg-orange-500 transition-all active:scale-95 uppercase tracking-widest border-2 border-transparent">Entrar no Varivebox</button>
          </form>
        </div>
      </div>
    );
  }

  if (isTransitioning) {
    return <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-bold animate-in fade-in"><Rocket className="text-orange-500 animate-bounce duration-700 mb-6" size={80} /><h3 className="text-2xl font-black uppercase italic text-orange-500 animate-pulse">Segurança Ativa</h3></div>;
  }

  return (
    <div className={`flex h-screen font-sans overflow-hidden font-bold transition-colors duration-300 ${isDark ? 'bg-slate-950 text-white' : 'bg-[#f8fafc] text-black'}`}>
      {/* Sidebar */}
      <aside className={`transition-all duration-300 flex flex-col shrink-0 z-40 shadow-2xl ${sidebarOpen ? 'w-64' : 'w-20'} ${isDark ? 'bg-slate-900 text-white' : 'bg-[#0f172a] text-white'}`}>
        <div className={`p-6 flex items-center gap-3 border-b shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-800/50'}`}>
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
        <div className={`p-4 flex flex-col gap-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-800/50'}`}>
            <button onClick={() => setIsLogoutModalOpen(true)} className="flex items-center gap-3 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"><LogOut size={20}/>{sidebarOpen && <span className="text-sm uppercase font-black">Sair</span>}</button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-500 hover:text-white flex justify-center"><ChevronLeft size={20}/></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className={`h-20 border-b flex items-center justify-between px-8 z-20 shadow-sm transition-colors ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'}`}>
          <h2 className="text-xl font-black uppercase italic text-orange-500">{activeTab === 'dashboard' ? "Inteligência" : activeTab}</h2>
          <div className="flex items-center gap-6">
             <div className="relative w-64 font-black">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
               <input type="text" placeholder="Busca inteligente..." className={`w-full pl-10 pr-4 py-2 rounded-full text-sm outline-none transition-all ${isDark ? 'bg-slate-800 text-white focus:bg-slate-700' : 'bg-slate-100 text-black focus:bg-slate-200 focus:ring-1 focus:ring-orange-400'}`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
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
              {/* Filtros Reativos */}
              <div className={`p-4 rounded-2xl border-2 shadow-sm flex flex-wrap gap-6 items-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="space-y-1"><span className={`text-[9px] uppercase font-black ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Janela</span><select className={`block text-xs font-black rounded-lg border-2 p-2 outline-none ${isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-black border-slate-200'}`} value={dashFilterYear} onChange={e => setDashFilterYear(e.target.value)}><option value="Todos">Todo Histórico</option>{YEARS_LIST.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                  <div className="space-y-1"><span className={`text-[9px] uppercase font-black ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Grupo</span><select className={`block text-xs font-black rounded-lg border-2 p-2 outline-none ${isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-black border-slate-200'}`} value={dashFilterGroup} onChange={e => setDashFilterGroup(e.target.value)}><option value="Todos">Todos os Grupos</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                  <div className="space-y-1"><span className={`text-[9px] uppercase font-black ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Modelo</span><select className={`block text-xs font-black rounded-lg border-2 p-2 outline-none ${isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-50 text-black border-slate-200'}`} value={dashFilterModel} onChange={e => setDashFilterModel(e.target.value)}><option value="Todos">Todos os Modelos</option>{products.map(p => <option key={p.id} value={p.id}>{p.cod}</option>)}</select></div>
              </div>

              {/* KPIs Reativos com Z-Index Ajustado no StatCard */}
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard title="Estoque" value={dashboardKPIs.est} sub="Unidades" icon={Package} colorClass="border-blue-500" isDark={isDark} />
                <StatCard title="Vendas" value={dashboardKPIs.ven} sub="Total Filtro" icon={TrendingUp} colorClass="border-green-500" isDark={isDark} />
                <StatCard title="Urgência" value={dashboardKPIs.urg.length} sub="Giro Crítico" icon={AlertCircle} colorClass="border-orange-500" active={dashboardKPIs.urg.length > 0} tooltipList={dashboardKPIs.urg} isDark={isDark} />
                <StatCard title="Baixo Giro" value={dashboardKPIs.slow.length} sub="Sem Saída" icon={TrendingDown} colorClass="border-slate-400" tooltipList={dashboardKPIs.slow} isDark={isDark} />
                <StatCard title="Previsão Próx" value={chartResults.forecast} sub="Estimativa" icon={Zap} colorClass="border-purple-500 text-purple-500" isDark={isDark} />
                <StatCard title="Carro-Chefe" value={dashboardKPIs.top?.cod || "---"} sub="Melhor Saída" icon={Star} colorClass="border-yellow-500 text-yellow-500" isDark={isDark} />
              </div>

              {/* Gráfico */}
              <div className={`p-8 rounded-3xl border-2 shadow-sm h-[400px] ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <h3 className={`text-sm font-black uppercase flex items-center gap-2 mb-8 ${isDark ? 'text-slate-200' : 'text-black'}`}><BarChart3 size={20} className="text-blue-500" /> Vendas vs Tendência Preditiva</h3>
                <ResponsiveContainer width="100%" height="85%">
                  <ComposedChart data={chartResults.points}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                    <XAxis dataKey="label" fontSize={10} axisLine={false} tickLine={false} stroke={isDark ? '#94a3b8' : '#475569'} />
                    <YAxis fontSize={10} axisLine={false} tickLine={false} stroke={isDark ? '#94a3b8' : '#475569'} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: isDark ? '#0f172a' : '#fff', color: isDark ? '#fff' : '#000' }} />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{fontSize: '10px'}} />
                    <Bar dataKey="value" name="Vendas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={35} />
                    <Line type="monotone" dataKey="trend" name="Tendência IA" stroke="#f97316" strokeWidth={3} dot={false} strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Tabela Intelligence Reativa */}
              <div className={`rounded-3xl border-2 shadow-sm overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                   <div className={`p-4 flex items-center gap-2 font-black uppercase text-xs border-b ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-950 text-white'}`}><ListFilter size={18} className="text-orange-500" /> Inteligência de Performance</div>
                   <table className="w-full text-xs text-left font-black">
                     <thead className={`${isDark ? 'bg-slate-800/50 text-slate-400' : 'bg-slate-100 text-slate-700'} uppercase font-black border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                       <tr><th className="p-4">Modelo</th><th className="text-center">Giro Total %</th><th className="text-center">3m %</th><th className="text-center">6m %</th><th className="text-center">12m %</th><th className="text-center">Constância</th><th className="text-center">Status</th></tr>
                     </thead>
                     <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                       {dashboardFilteredData.sort((a,b) => b.turnoverPerc - a.turnoverPerc).map(p => (
                         <tr key={p.id} className={`${p.turnoverPerc >= 80 ? isDark ? 'bg-orange-500/5' : 'bg-orange-50' : p.stock <= 0 ? isDark ? 'bg-red-500/5' : 'bg-red-50' : ''} transition-all group`}>
                           <td className="p-4 border-l-4 font-black" style={{ borderLeftColor: p.groupInfo.color }}>
                              <div className={isDark ? 'text-white' : 'text-black'}>{p.cod}</div>
                              <div className="text-[9px] text-slate-500 uppercase">{p.groupInfo.name}</div>
                           </td>
                           <td className={`p-4 text-center font-black ${isDark ? 'text-slate-300' : 'text-black'}`}>{p.turnoverPerc.toFixed(1)}%</td>
                           {[p.s3m, p.s6m, p.s12m].map((win, idx) => (<td key={idx} className="p-4 text-center cursor-help group-hover:text-blue-500 transition-colors" title={`${win.units} unidades`}><span className="font-black">{win.perc}%</span></td>))}
                           <td className="p-4 text-center font-black"><div className={p.constClr}>{p.constLabel}</div></td>
                           <td className="p-4 text-center"><span className={`px-3 py-1 rounded-full text-[9px] font-black border uppercase shadow-sm ${p.recColor}`}>{p.recommendation}</span></td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
            </div>
          )}

          {/* REGISTER */}
          {activeTab === 'register' && (
            <div className="space-y-8 animate-in fade-in font-bold">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-black">
                <div className={`p-6 rounded-2xl border-2 shadow-sm space-y-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <h3 className="text-lg font-black flex items-center gap-2 italic text-orange-500"><Tag size={20} /> {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}</h3>
                    <input type="text" placeholder="Nome" className={`w-full p-3 rounded-xl outline-none uppercase font-black border-2 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-black'}`} value={newGroupData.name} onChange={e => setNewGroupData({...newGroupData, name: e.target.value.toUpperCase()})} />
                    <div className="flex gap-2">
                        <input type="color" className="w-12 h-10 border-none bg-transparent" value={newGroupData.color} onChange={e => setNewGroupData({...newGroupData, color: e.target.value})} />
                        <button onClick={handleSaveGroup} className="flex-1 bg-slate-950 text-white rounded-xl text-xs uppercase font-black hover:opacity-80 transition-all dark:bg-orange-600 shadow-md border-2 border-transparent">{editingGroup ? 'Salvar' : 'Criar'}</button>
                    </div>
                </div>
                <div className={`lg:col-span-2 p-6 rounded-2xl border-2 shadow-sm ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <h3 className="text-[10px] text-slate-500 uppercase mb-4 font-black">Grupos Cadastrados</h3>
                    <div className="flex flex-wrap gap-4">{groups.map(g => (<div key={g.id} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 group transition-all font-black ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 hover:border-orange-500 shadow-sm'}`}>
                        <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: g.color }} /><span className={isDark ? 'text-white' : 'text-black'}>{g.name}</span>
                        <div className="flex gap-2 ml-4">
                            <button onClick={() => handleEditGroup(g)} className="text-blue-600 hover:scale-110 transition-transform"><Edit2 size={16}/></button>
                            <button onClick={() => deleteGroup(g.id)} className="text-red-500 hover:scale-110 transition-transform"><Trash2 size={16}/></button>
                        </div>
                    </div>))}</div>
                </div>
              </div>
              <div className={`rounded-2xl border-2 shadow-sm overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className={`p-6 border-b-2 flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}><h3 className="text-xl font-black uppercase italic text-orange-500">Catálogo</h3><button onClick={() => handleOpenProductModal()} className="bg-orange-500 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg uppercase flex items-center gap-2 hover:bg-orange-600 transition-all border-2 border-transparent"><Plus size={18} /> Novo Produto</button></div>
                <table className="w-full text-left font-black border-collapse"><thead className={`uppercase text-[10px] ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-950 text-white'}`}><tr><th className="p-5">Cód</th><th>Descrição</th><th className="text-center">Grupo</th><th className="text-center">Ações</th></tr></thead><tbody className={`divide-y-2 ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>{dashboardFilteredData.map(p => (<tr key={p.id} className="hover:bg-blue-500/5 transition-colors font-black"><td className="p-6 border-l-4 font-black" style={{ borderLeftColor: p.groupInfo.color }}>{p.cod}</td><td className={`font-black uppercase text-xs ${isDark ? 'text-slate-300' : 'text-black'}`}>{p.desc}</td><td className="text-center font-bold"><span className="px-3 py-1 rounded-lg text-[10px] uppercase border-2 font-black" style={{ color: p.groupInfo.color, borderColor: p.groupInfo.color + '40' }}>{p.groupInfo.name}</span></td><td className="text-center font-black"><div className="flex justify-center gap-4 font-black"><button onClick={() => handleOpenProductModal(p)} className="p-2 text-blue-600 hover:scale-125 transition-transform"><Edit2 size={18}/></button><button onClick={() => { setProductToDelete(p); setIsDeleteModalOpen(true); }} className="p-2 text-red-500 hover:scale-125 transition-transform"><Trash2 size={18}/></button></div></td></tr>))}</tbody></table>
              </div>
            </div>
          )}

          {/* ESTOQUE TOTAL TAB */}
          {activeTab === 'products' && (
            <div className="max-w-7xl mx-auto animate-in fade-in space-y-6 font-black">
              <div className={`rounded-2xl border-2 shadow-sm overflow-hidden font-black ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <table className="w-full text-left font-black border-collapse"><thead className={`text-slate-400 text-[9px] uppercase font-black border-b ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-950'}`}><tr><th className="px-8 py-5">Item / Descrição</th><th className="text-center font-black">Entradas</th><th className="text-center font-black">Saídas</th><th>Saldo</th><th>Situação Preditiva</th></tr></thead><tbody className={`divide-y-2 ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>{dashboardFilteredData.map(p => (<tr key={p.id} className="hover:bg-blue-500/5"><td className="px-8 py-6 border-l-4 font-black" style={{ borderLeftColor: p.groupInfo.color }}><div className={isDark ? 'text-white' : 'text-black text-lg'}>{p.cod}</div><span className="text-[10px] uppercase italic text-slate-500 font-black">{p.desc}</span></td><td className={`px-8 py-6 text-center font-black ${isDark ? 'text-slate-300' : 'text-black text-base'}`}>{p.totalPurchases}</td><td className="px-8 py-6 text-center font-black text-orange-500 text-base">- {p.totalSales}</td><td className={`px-8 py-6 text-2xl font-black ${p.stock < 15 ? 'text-red-500' : isDark ? 'text-white' : 'text-black'}`}>{p.stock}</td><td className="px-8 py-6 font-black font-black"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black border uppercase tracking-widest shadow-sm ${p.recColor}`}>{p.recommendation}</span></td></tr>))}</tbody></table>
              </div>
            </div>
          )}

          {/* PURCHASES & SALES ... */}
          {activeTab === 'purchases' && (
            <div className="space-y-6 animate-in slide-in-from-left-4 font-black">
                <div className={`p-6 rounded-2xl border-2 shadow-sm flex justify-between items-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}><h3 className="text-xl font-black italic uppercase text-orange-500"><ShoppingCart size={24} className="mr-2 inline" /> Entradas China</h3><button onClick={addNewOrder} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase shadow-lg hover:bg-blue-700 transition-all border-2 border-transparent shadow-blue-100"><Plus size={16} /> Novo Lote</button></div>
                <div className={`rounded-2xl border-2 shadow-xl overflow-hidden font-black ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}><div className="overflow-x-auto font-black"><table className="w-full text-sm border-collapse font-black"><thead className={`text-slate-400 uppercase text-[10px] font-black ${isDark ? 'bg-slate-800' : 'bg-slate-950'}`}><tr className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-800'}`}><th className="p-4 text-left bg-transparent text-blue-400 sticky left-0 z-20 font-black">Nº COMPRA:</th>{purchaseOrders.map(o => (<th key={o.id} className="p-4 text-center bg-orange-500 text-white border-l border-orange-600 group relative min-w-[140px] font-black"><input className="w-full bg-transparent text-center outline-none font-black text-lg" value={o.order_num || ''} onChange={e => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'purchaseOrders', o.id), {order_num: e.target.value})} /><button onClick={() => { setOrderToDelete(o); setIsOrderDeleteModalOpen(true); }} className="opacity-0 group-hover:opacity-100 absolute top-1 right-1"><Trash2 size={12} /></button></th>))}<th rowSpan={4} className={`p-4 text-center text-white border-l-2 font-black ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-blue-900 border-slate-700'}`}>TOTAL</th></tr>{['order_date', 'arrival_date', 'invoice'].map((f) => (<tr key={f} className={`border-b ${isDark ? 'border-slate-700' : 'border-slate-800'}`}><th className={`p-3 text-left font-black sticky left-0 z-20 uppercase tracking-tighter ${isDark ? 'bg-slate-900' : 'bg-slate-950'}`}>{f === 'order_date' ? 'PEDIDO' : f === 'arrival_date' ? 'CHEGADA' : 'NF'}</th>{purchaseOrders.map(o => (<th key={o.id} className="p-2 border-l border-slate-700 font-black"><input type={f.includes('date') ? 'date' : 'text'} className="w-full bg-transparent text-center font-black text-[10px] text-white uppercase outline-none" value={o[f] || ''} onChange={e => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'purchaseOrders', o.id), {[f]: e.target.value})} /></th>))}</tr>))}</thead><tbody className={`divide-y-2 ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>{dashboardFilteredData.map(p => (<tr key={p.id} className="hover:bg-blue-500/5 transition-colors font-black"><td className={`p-4 sticky left-0 z-10 border-r-2 border-l-4 font-black ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'}`} style={{ borderLeftColor: p.groupInfo.color }}>{p.cod}</td>{purchaseOrders.map(o => (<td key={o.id} className="p-2 border-l border-slate-200/10 text-center font-black font-black"><input type="number" value={p.purchases_map?.[o.id] || 0} onChange={(e) => updatePurchaseQty(p.id, o.id, e.target.value)} className={`w-16 text-center rounded-lg border-2 font-black text-blue-600 focus:ring-1 focus:ring-blue-500 outline-none ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} /></td>))}<td className={`p-4 text-center font-black ${isDark ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-900'}`}>{p.totalPurchases}</td></tr>))}</tbody></table></div></div>
            </div>
          )}

          {activeTab === 'sales' && (
             <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 font-bold">
               <div className={`p-6 rounded-2xl border-2 shadow-sm space-y-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                 <div className="flex justify-between items-center gap-4">
                   <div className="flex items-center gap-2">
                     <button onClick={() => setFilterMode('manual')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${filterMode === 'manual' ? 'bg-orange-500 text-white shadow-lg' : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>Filtro Ano</button>
                     <button onClick={() => setFilterMode('range')} className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${filterMode === 'range' ? 'bg-orange-500 text-white shadow-lg' : isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>Filtro Range</button>
                   </div>
                   <button onClick={() => setIsPeriodModalOpen(true)} className="bg-slate-950 text-white px-4 py-2 rounded-xl text-xs flex items-center gap-2 font-black uppercase hover:opacity-80 transition-all dark:bg-orange-600 shadow-lg border-2 border-transparent"><PlusSquare size={16}/> Novo Mês</button>
                 </div>
               </div>
               <div className={`rounded-2xl border-2 shadow-xl overflow-hidden font-black ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                 <div className="overflow-x-auto font-black">
                   <table className="w-full text-sm border-collapse font-black">
                     <thead className={`uppercase text-[10px] font-black sticky top-0 z-10 ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-950 text-white'}`}>
                       <tr><th className="p-5 text-left sticky left-0 z-20 bg-inherit border-r-2 border-slate-800/30">Produto</th>{displayedPeriodsInSales.map(p => (<th key={p.id} className="p-4 text-center text-orange-400 border-l border-slate-700/30 group font-black">{MONTH_NAMES[p.month]}/{p.year.slice(2)}<button onClick={() => { setPeriodToDelete(p); setIsPeriodDeleteModalOpen(true); }} className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button></th>))}<th className="p-5 text-center bg-orange-950 text-white font-black uppercase border-l-2 border-slate-800/30">Vendas</th><th className="p-5 text-center bg-blue-950 text-white font-black uppercase border-l-2 border-slate-800/30">Saldo</th></tr>
                     </thead>
                     <tbody className={`divide-y-2 ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                       {dashboardFilteredData.map(p => (<tr key={p.id} className="hover:bg-blue-500/5 transition-colors font-black"><td className={`p-6 font-black border-l-4 sticky left-0 z-10 border-r-2 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'}`} style={{ borderLeftColor: p.groupInfo.color }}>{p.cod} <div className="text-[10px] text-slate-500 italic uppercase font-black">{p.desc}</div></td>{displayedPeriodsInSales.map(dp => (<td key={dp.id} className="p-2 border-l border-slate-200/10 text-center"><input type="number" value={p.sales?.[dp.year]?.[dp.month] || 0} onChange={(e) => updateMonthlySale(p.id, dp.year, dp.month, e.target.value)} className={`w-16 text-center border-2 rounded-lg p-1.5 font-black outline-none focus:ring-1 focus:ring-orange-400 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-black focus:bg-white'}`} /></td>))}<td className={`p-4 text-center font-black ${isDark ? 'text-orange-400 bg-orange-500/5' : 'text-orange-700 bg-orange-50'}`}>{displayedPeriodsInSales.reduce((acc, dp) => acc + (p.sales?.[dp.year]?.[dp.month] || 0), 0)}</td><td className={`p-4 text-center font-black text-lg ${p.stock <= 5 ? 'text-red-500 animate-pulse' : isDark ? 'text-blue-400' : 'text-blue-600'}`}>{p.stock}</td></tr>))}
                     </tbody>
                   </table>
                 </div>
               </div>
             </div>
          )}
        </div>
      </main>

      {/* MODAL DE LOGOUT */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm font-black">
          <div className={`rounded-3xl shadow-2xl w-full max-sm p-10 text-center border-2 animate-in zoom-in-95 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'}`}>
             <div className="inline-flex p-5 bg-red-100 text-red-600 rounded-full mb-6 animate-bounce border-2 border-red-200"><LogOut size={48}/></div>
             <h3 className="text-2xl font-black uppercase italic mb-2">Que pena!</h3>
             <p className={`mb-8 font-black ${isDark ? 'text-slate-400' : 'text-slate-900'}`}>Tem certeza de que deseja encerrar a sessão do sistema?</p>
             <div className="flex gap-4">
                <button onClick={() => setIsLogoutModalOpen(false)} className={`flex-1 py-4 border-2 rounded-2xl uppercase font-black transition-colors ${isDark ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-100'}`}>Voltar</button>
                <button onClick={confirmLogout} className="flex-1 py-4 bg-red-600 text-white rounded-2xl uppercase font-black shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all border-2 border-transparent">Sair Agora</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT PROD */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in zoom-in-95 font-black">
          <div className={`rounded-3xl shadow-2xl w-full max-w-md p-8 border-2 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'}`}>
            <h3 className="text-2xl font-black uppercase italic mb-6 text-orange-500 border-b-2 pb-2 inline-block">Dados do Item</h3>
            <div className="space-y-4 font-black">
              <input type="text" className={`w-full p-4 rounded-xl outline-none font-black border-2 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-black focus:bg-white'}`} value={newProductData.cod} onChange={e => setNewProductData({...newProductData, cod: e.target.value.toUpperCase()})} placeholder="Código" />
              <input type="text" className={`w-full p-4 rounded-xl outline-none font-black border-2 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-black focus:bg-white'}`} value={newProductData.desc} onChange={e => setNewProductData({...newProductData, desc: e.target.value.toUpperCase()})} placeholder="Descrição" />
              <select className={`w-full p-4 rounded-xl outline-none font-black border-2 ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-black focus:bg-white'}`} value={newProductData.groupId} onChange={e => setNewProductData({...newProductData, groupId: e.target.value})}>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
              <div className="flex gap-4 mt-6"><button onClick={() => setIsProductModalOpen(false)} className="flex-1 py-4 text-slate-500 uppercase font-black hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button><button onClick={handleSaveProduct} className="flex-1 py-4 bg-orange-600 text-white rounded-xl uppercase font-black shadow-lg shadow-orange-200 active:scale-95 border-2 border-transparent">Salvar</button></div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DELETE PROD */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm font-black animate-in fade-in">
          <div className={`rounded-3xl shadow-2xl w-full max-sm p-10 text-center border-2 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'}`}>
            <AlertTriangle className="mx-auto text-red-600 mb-4 animate-bounce" size={48} />
            <h3 className="text-xl font-black uppercase mb-8 text-red-500">Excluir Permanente?</h3>
            <p className={`mb-8 font-black ${isDark ? 'text-slate-400' : 'text-slate-900'}`}>Deseja remover <span className="underline font-black">{productToDelete?.cod}</span> do sistema?</p>
            <div className="flex gap-3"><button onClick={() => setIsDeleteModalOpen(false)} className={`flex-1 py-3 border-2 rounded-xl uppercase font-black ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>Não</button><button onClick={confirmDeleteProduct} className="flex-1 py-3 bg-red-600 text-white rounded-xl uppercase font-black shadow-lg border-2 border-transparent">Deletar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
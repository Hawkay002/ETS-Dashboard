import React, { useEffect, useState, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, orderBy, doc, deleteDoc, writeBatch, updateDoc, setDoc, where, getDocs } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  LayoutDashboard, Users, Activity, Settings, Search, Shield, Ticket, 
  UserCheck, Clock, Lock, LogOut, Menu, X, ChevronRight, Smartphone, LogIn,
  Filter, Download, Upload, Trash2, MoreVertical, CheckSquare, Square, Crown, FileText, ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

// --- 1. FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyBYzmAZQ8sKHjXgVh_t-vbtYN_gRzBstw8",
    authDomain: "ticket-backend-5ee83.firebaseapp.com",
    projectId: "ticket-backend-5ee83",
    storageBucket: "ticket-backend-5ee83.firebasestorage.app",
    messagingSenderId: "370130815796",
    appId: "1:370130815796:web:33df8249fcc68ddc0f7361",
    measurementId: "G-CED9W20PBK"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- 2. CONSTANTS ---
const APP_COLLECTION_ROOT = 'ticket_events_data';
const SHARED_DATA_ID = 'shared_event_db';
const ADMIN_EMAIL = 'admin.test@gmail.com'; 

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  if (authLoading) return <div className="h-screen w-full bg-slate-950 flex items-center justify-center text-blue-500 animate-pulse">Initializing...</div>;

  if (!user) return <LoginScreen />;

  return <DashboardLayout user={user} />;
}

// --- 3. LOGIN SCREEN ---
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Invalid Credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-slate-900/50 border border-white/10 p-6 rounded-2xl backdrop-blur-xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Lock className="w-6 h-6 text-blue-500" />
          </div>
          <h1 className="text-2xl font-light text-white tracking-tight">Command Center</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase text-slate-500 ml-1">Email</label>
            <input 
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
              placeholder="admin@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase text-slate-500 ml-1">Password</label>
            <input 
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
              placeholder="••••••••"
            />
          </div>

          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs text-center font-medium">{error}</div>}

          <button 
            type="submit" disabled={loading}
            className="w-full bg-blue-600 active:bg-blue-700 text-white font-medium py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 mt-2 touch-manipulation"
          >
            {loading ? 'Verifying...' : 'Authenticate'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- 4. DASHBOARD LAYOUT ---
function DashboardLayout({ user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [tickets, setTickets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // SHARED FILTER STATES
  const [guestFilterStatus, setGuestFilterStatus] = useState('all'); 
  const [guestFilterType, setGuestFilterType] = useState('all'); 
  const [guestSort, setGuestSort] = useState('newest'); 

  // Data Fetching
  useEffect(() => {
    const unsubTickets = onSnapshot(query(collection(db, APP_COLLECTION_ROOT, SHARED_DATA_ID, 'tickets')), 
      (snap) => setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubLogs = onSnapshot(query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc')), 
      (snap) => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))); 

    const unsubSettings = onSnapshot(doc(db, APP_COLLECTION_ROOT, SHARED_DATA_ID, 'settings', 'config'), 
      (doc) => doc.exists() && setSettings(doc.data()));

    return () => { unsubTickets(); unsubLogs(); unsubSettings(); };
  }, []);

  const stats = useMemo(() => ({
    total: tickets.length,
    arrived: tickets.filter(t => t.status === 'arrived').length,
    pending: tickets.filter(t => t.status === 'coming-soon').length,
    special: tickets.filter(t => ['Diamond', 'Gold'].includes(t.ticketType)).length
  }), [tickets]);

  const statusData = [
    { name: 'Arrived', value: stats.arrived, color: '#10b981' },
    { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    { name: 'Absent', value: tickets.filter(t => t.status === 'absent').length, color: '#ef4444' },
  ];

  const handleCardClick = (type) => {
      setActiveTab('guests');
      setGuestFilterStatus('all');
      setGuestFilterType('all');
      setGuestSort('newest');

      if (type === 'arrived') setGuestFilterStatus('arrived');
      else if (type === 'pending') setGuestFilterStatus('coming-soon');
      else if (type === 'special') {
          setGuestFilterType('Special'); 
          setGuestSort('type');
      }
  };

  const UserProfileDropdown = () => (
    <div className="absolute right-0 top-12 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-4 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-4 pb-4 border-b border-white/10">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Signed in as</p>
            <p className="text-sm text-white font-medium truncate">{user.email}</p>
        </div>
        <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
        </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden flex-col md:flex-row">
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 border-r border-white/10 bg-slate-900/50 backdrop-blur-md flex-col">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-light tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            Ticketing<span className="font-bold">Cmd</span>.
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <DesktopNavItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <DesktopNavItem icon={Users} label="Guests" active={activeTab === 'guests'} onClick={() => setActiveTab('guests')} />
          <DesktopNavItem icon={Activity} label="Logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <DesktopNavItem icon={Settings} label="Config" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden h-16 border-b border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30">
        <div className="text-lg font-light tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            Ticketing<span className="font-bold">Cmd</span>.
        </div>
        <div className="relative">
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-3 focus:outline-none">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 border border-white/20 shadow-lg"></div>
          </button>
          {isProfileOpen && <UserProfileDropdown />}
        </div>
      </header>

      {/* DESKTOP HEADER */}
      <header className="hidden md:flex h-16 border-b border-white/5 bg-slate-950/50 sticky top-0 backdrop-blur z-10 items-center justify-between px-8">
         <h2 className="font-medium text-lg capitalize">{activeTab}</h2>
         <div className="relative flex items-center gap-4">
             {settings && (
               <div className="px-3 py-1 bg-white/5 rounded-full text-xs border border-white/10">
                 Event: <span className="text-blue-400">{settings.name}</span>
               </div>
             )}
             <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="focus:outline-none">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 border border-white/20 cursor-pointer"></div>
             </button>
             {isProfileOpen && <UserProfileDropdown />}
         </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto bg-slate-950 pb-20 md:pb-0 scroll-smooth">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <StatCard title="Total Guests" value={stats.total} icon={Users} onClick={() => handleCardClick('total')} />
                <StatCard title="Checked In" value={stats.arrived} icon={UserCheck} color="text-emerald-500" onClick={() => handleCardClick('arrived')} />
                <StatCard title="Pending" value={stats.pending} icon={Clock} color="text-amber-500" onClick={() => handleCardClick('pending')} />
                <StatCard title="Special" value={stats.special} icon={Crown} color="text-purple-500" onClick={() => handleCardClick('special')} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Live Attendance</h3>
                  <div className="h-48 md:h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                          {statusData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }} itemStyle={{ color: '#e2e8f0' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 text-xs mt-[-10px]">
                    {statusData.map(d => (
                      <div key={d.name} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></div>
                        <span className="text-slate-400">{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 shadow-sm flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Activity Feed</h3>
                    <button onClick={() => setActiveTab('logs')} className="text-xs text-blue-400">View All</button>
                  </div>
                  <div className="flex-1 space-y-3 overflow-hidden">
                    {logs.slice(0, 5).map(log => (
                      <div key={log.id} className="flex gap-3 text-sm py-1">
                        <div className="mt-1"><StatusDot action={log.action} /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-slate-300 truncate text-xs md:text-sm">{log.details}</p>
                          <p className="text-[10px] text-slate-600 mt-0.5">{new Date(log.timestamp).toLocaleTimeString()} • {log.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: GUESTS */}
          {activeTab === 'guests' && (
            <GuestListModule 
                tickets={tickets} 
                initialFilterStatus={guestFilterStatus}
                initialFilterType={guestFilterType}
                initialSort={guestSort}
                setFilterStatus={setGuestFilterStatus}
                setFilterType={setGuestFilterType}
                setSort={setGuestSort}
                currentUser={user}
            />
          )}

          {/* TAB: LOGS */}
          {activeTab === 'logs' && (
             <LogsModule logs={logs} />
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && (
             <SettingsModule settings={settings} currentUser={user} />
          )}

        </div>
      </main>

      {/* MOBILE NAV */}
      <nav className="md:hidden fixed bottom-0 w-full h-16 bg-slate-900/90 backdrop-blur-lg border-t border-white/10 flex justify-around items-center px-2 z-40 safe-area-pb">
        <MobileNavItem icon={LayoutDashboard} label="Home" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <MobileNavItem icon={Users} label="Guests" active={activeTab === 'guests'} onClick={() => setActiveTab('guests')} />
        <MobileNavItem icon={Activity} label="Logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
        <MobileNavItem icon={Settings} label="Config" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
}

// ===========================================
// SUB-MODULE: GUEST LIST
// ===========================================
function GuestListModule({ tickets, initialFilterStatus, initialFilterType, initialSort, setFilterStatus, setFilterType, setSort, currentUser }) {
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    // -- Filter Logic --
    const filteredTickets = useMemo(() => {
        let res = tickets.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.phone.includes(search));
        
        if (initialFilterStatus !== 'all') res = res.filter(t => t.status === initialFilterStatus);
        
        if (initialFilterType === 'Special') {
            res = res.filter(t => ['Diamond', 'Gold'].includes(t.ticketType));
        } else if (initialFilterType !== 'all') {
            res = res.filter(t => (t.ticketType || 'Classic') === initialFilterType);
        }

        res.sort((a, b) => {
            if (initialSort === 'newest') return b.createdAt - a.createdAt;
            if (initialSort === 'oldest') return a.createdAt - b.createdAt;
            if (initialSort === 'name-asc') return a.name.localeCompare(b.name);
            if (initialSort === 'type') {
                 const rank = { 'Gold': 2, 'Diamond': 1, 'Classic': 0 };
                 return (rank[b.ticketType] || 0) - (rank[a.ticketType] || 0);
            }
            return 0;
        });

        return res;
    }, [tickets, search, initialFilterStatus, initialFilterType, initialSort]);

    // -- Selection Logic --
    const toggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredTickets.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredTickets.map(t => t.id)));
    };

    const toggleSelectionMode = () => {
        if (isSelectionMode) {
            // If turning OFF, clear selections
            setSelectedIds(new Set());
        }
        setIsSelectionMode(!isSelectionMode);
    };

    const handleDelete = async () => {
        if (!confirm(`Delete ${selectedIds.size} guests?`)) return;
        const batch = writeBatch(db);
        selectedIds.forEach(id => batch.delete(doc(db, APP_COLLECTION_ROOT, SHARED_DATA_ID, 'tickets', id)));
        await batch.commit();
        setSelectedIds(new Set());
        setIsSelectionMode(false);
    };

    // -- EXPORT HANDLER (Full Schema) --
    const handleExport = async (format) => {
        setIsExportMenuOpen(false);
        const exportSubset = tickets.filter(t => selectedIds.has(t.id));
        if (exportSubset.length === 0) return;

        const data = exportSubset.map((t, index) => {
            let displayType = 'Classic';
            if (t.ticketType === 'Gold') displayType = 'VVIP';
            else if (t.ticketType === 'Diamond') displayType = 'VIP';

            return {
                s_no: index + 1,
                ticket_type: displayType,
                id: t.id,
                age: t.age || '',
                scannedAt: t.scannedAt || null,
                status: t.status,
                phone: t.phone,
                ticketType: t.ticketType || 'Classic',
                createdAt: t.createdAt,
                gender: t.gender || '',
                name: t.name,
                createdBy: t.createdBy || 'ADMIN',
                scanned: t.status === 'arrived',
                scannedBy: t.scannedBy || ''
            };
        });

        const fileName = `GuestList_Selected_${new Date().toISOString().split('T')[0]}`;
        const fields = ['s_no', 'ticket_type', 'id', 'age', 'scannedAt', 'status', 'phone', 'ticketType', 'createdAt', 'gender', 'name', 'createdBy', 'scanned', 'scannedBy'];

        switch (format) {
            case 'json': {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                saveAs(blob, `${fileName}.json`);
                break;
            }
            case 'csv': {
                const ws = XLSX.utils.json_to_sheet(data, { header: fields });
                const csv = XLSX.utils.sheet_to_csv(ws);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                saveAs(blob, `${fileName}.csv`);
                break;
            }
            case 'xlsx': {
                const ws = XLSX.utils.json_to_sheet(data, { header: fields });
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Guests");
                XLSX.writeFile(wb, `${fileName}.xlsx`);
                break;
            }
            case 'txt': {
                const txt = data.map(row => 
                    Object.entries(row).map(([k, v]) => `${k}: ${v}`).join(' | ')
                ).join('\n');
                const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
                saveAs(blob, `${fileName}.txt`);
                break;
            }
            case 'pdf': {
                const doc = new jsPDF('l', 'mm', 'a4');
                doc.setFontSize(8);
                doc.text("Guest List Data Export", 14, 15);
                const rows = data.map(row => Object.values(row).map(v => String(v)));
                doc.autoTable({
                    head: [fields],
                    body: rows,
                    startY: 20,
                    styles: { fontSize: 6, cellPadding: 1, overflow: 'linebreak' },
                    columnStyles: { 2: { cellWidth: 15 } } 
                });
                doc.save(`${fileName}.pdf`);
                break;
            }
            case 'docx': {
                const headerRow = new TableRow({
                    children: fields.map(f => 
                        new TableCell({ 
                            children: [new Paragraph({ text: f, bold: true, size: 12 })],
                            width: { size: 100 / fields.length, type: WidthType.PERCENTAGE }
                        })
                    )
                });
                const dataRows = data.map(row => 
                    new TableRow({
                        children: Object.values(row).map(val => 
                            new TableCell({ 
                                children: [new Paragraph({ text: String(val || ""), size: 12 })],
                                width: { size: 100 / fields.length, type: WidthType.PERCENTAGE }
                            })
                        )
                    })
                );
                const doc = new Document({
                    sections: [{
                        properties: {},
                        children: [
                            new Paragraph({ text: "Guest List Data Export", heading: HeadingLevel.HEADING_1 }),
                            new Table({
                                rows: [headerRow, ...dataRows],
                                width: { size: 100, type: WidthType.PERCENTAGE },
                            }),
                        ],
                    }],
                });
                const blob = await Packer.toBlob(doc);
                saveAs(blob, `${fileName}.docx`);
                break;
            }
        }
    };

    return (
        <div className="space-y-4">
            {/* Toolbar - Split into 2 rows, z-20 for dropdown overlap */}
            <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex flex-col gap-4 relative z-20">
                
                {/* ROW 1: Search & Filters */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="relative flex-1 w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input type="text" placeholder="Search guests..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 text-white placeholder:text-slate-600" />
                    </div>
                    
                    <div className="flex gap-2 flex-wrap w-full md:w-auto justify-end">
                        <select value={initialFilterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-950 border border-white/10 rounded-lg text-xs px-3 py-2 text-slate-300 focus:outline-none">
                            <option value="all">All Status</option>
                            <option value="arrived">Arrived</option>
                            <option value="coming-soon">Pending</option>
                            <option value="absent">Absent</option>
                        </select>
                        <select value={initialFilterType} onChange={(e) => setFilterType(e.target.value)} className="bg-slate-950 border border-white/10 rounded-lg text-xs px-3 py-2 text-slate-300 focus:outline-none">
                            <option value="all">All Types</option>
                            <option value="Classic">Classic</option>
                            <option value="Diamond">VIP</option>
                            <option value="Gold">VVIP</option>
                            <option value="Special">Special (Grouped)</option>
                        </select>
                        
                        <button onClick={toggleSelectionMode} className={`p-2 rounded-lg border ${isSelectionMode ? 'bg-blue-600 border-blue-600 text-white' : 'border-white/10 text-slate-400'}`}>
                            <CheckSquare className="w-4 h-4" />
                        </button>
                        
                        {isSelectionMode && selectedIds.size > 0 && (
                            <button onClick={handleDelete} className="p-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ROW 2: Import / Export - Aligned to the RIGHT (justify-end) */}
                <div className="flex flex-wrap gap-3 border-t border-white/5 pt-4 justify-end">
                     
                     {/* IMPORT BUTTON */}
                     <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition-colors">
                        <Upload className="w-4 h-4" />
                        <span>Import Data</span>
                     </button>

                     {/* EXPORT BUTTON */}
                     <div className="relative">
                        <button 
                            disabled={selectedIds.size === 0} 
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-transparent"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export Selected {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</span>
                            <ChevronDown className="w-3 h-3 ml-1 opacity-50" />
                        </button>
                        
                        {isExportMenuOpen && (
                            <div className="absolute top-full mt-2 right-0 w-40 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col p-1 animate-in fade-in zoom-in-95 duration-200">
                                {['json','csv','xlsx','docx','txt','pdf'].map(fmt => (
                                    <button key={fmt} onClick={() => handleExport(fmt)} className="px-3 py-2 text-xs text-left text-slate-300 hover:bg-white/10 rounded uppercase font-medium flex items-center justify-between group">
                                        <span>.{fmt}</span>
                                        <Download className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                                    </button>
                                ))}
                            </div>
                        )}
                     </div>

                </div>
            </div>

            {/* Import Modal */}
            {isImportModalOpen && <ImportModal close={() => setIsImportModalOpen(false)} currentUser={currentUser} />}

            {/* List */}
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden relative z-10">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400 whitespace-nowrap">
                      <thead className="bg-white/5 text-slate-200 uppercase text-xs">
                        <tr>
                            {isSelectionMode && (
                                <th className="p-4 w-10">
                                    <button onClick={toggleSelectAll}>
                                        {selectedIds.size === filteredTickets.length && filteredTickets.length > 0 ? <CheckSquare className="w-4 h-4 text-blue-500"/> : <Square className="w-4 h-4"/>}
                                    </button>
                                </th>
                            )}
                            <th className="p-4">Name</th>
                            <th className="p-4">Type</th>
                            <th className="p-4">Contact</th>
                            <th className="p-4">Gender</th>
                            <th className="p-4">Age</th>
                            <th className="p-4">Status / Time</th>
                            <th className="p-4">Scanned By</th>
                            <th className="p-4 text-right">ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredTickets.map(t => (
                          <tr key={t.id} className={`hover:bg-white/5 ${selectedIds.has(t.id) ? 'bg-blue-500/5' : ''}`}>
                            {isSelectionMode && (
                                <td className="p-4 text-center">
                                    <button onClick={() => toggleSelect(t.id)}>
                                        {selectedIds.has(t.id) ? <CheckSquare className="w-4 h-4 text-blue-500"/> : <Square className="w-4 h-4"/>}
                                    </button>
                                </td>
                            )}
                            <td className="p-4 font-medium text-white">{t.name}</td>
                            <td className="p-4"><TypeBadge type={t.ticketType} /></td>
                            <td className="p-4">{t.phone}</td>
                            <td className="p-4">{t.gender || '-'}</td>
                            <td className="p-4">{t.age || '-'}</td>
                            <td className="p-4">
                               <div className="flex flex-col">
                                   <StatusBadge status={t.status} />
                                   {t.status === 'arrived' && t.scannedAt && (
                                       <span className="text-[10px] text-slate-500 mt-1 font-mono">
                                           {new Date(t.scannedAt).toLocaleString([], {year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                                       </span>
                                   )}
                               </div>
                            </td>
                            <td className="p-4 text-xs font-mono text-slate-500">{t.scannedBy || '-'}</td>
                            <td className="p-4 text-right font-mono text-xs opacity-50 select-all cursor-text">{t.id}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
                {filteredTickets.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No guests found</div>}
            </div>
        </div>
    );
}

// ===========================================
// SUB-MODULE: LOGS
// ===========================================
function LogsModule({ logs }) {
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const filteredLogs = useMemo(() => {
        return logs.filter(l => {
            if (filter !== 'all' && l.action !== filter) return false;
            if (search && !l.details.toLowerCase().includes(search.toLowerCase()) && !l.username.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [logs, filter, search]);

    const handleDelete = async () => {
        if (!confirm(`Delete ${selectedIds.size} logs?`)) return;
        const batch = writeBatch(db);
        selectedIds.forEach(id => batch.delete(doc(db, 'activity_logs', id)));
        await batch.commit();
        setSelectedIds(new Set());
        setIsSelectionMode(false);
    };

    const toggleSelect = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedIds(newSet);
    };

    // Toggle Selection Mode Logic (Clear on exit)
    const toggleSelectionMode = () => {
        if (isSelectionMode) {
            setSelectedIds(new Set());
        }
        setIsSelectionMode(!isSelectionMode);
    };

    // Select All Logic
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredLogs.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredLogs.map(l => l.id)));
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                   <input type="text" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)}
                     className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 text-white" />
                </div>
                
                {/* Controls - Moved Select/Delete to RIGHT */}
                <div className="flex gap-2 justify-end">
                    <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-slate-950 border border-white/10 rounded-lg text-xs px-3 py-2 text-slate-300 focus:outline-none">
                        <option value="all">All Actions</option>
                        <option value="LOGIN">Login</option>
                        <option value="TICKET_CREATE">Ticket Create</option>
                        <option value="SCAN_ENTRY">Scan Entry</option>
                        <option value="CONFIG_CHANGE">Config Change</option>
                    </select>
                    
                    <button onClick={toggleSelectionMode} className={`p-2 rounded-lg border ${isSelectionMode ? 'bg-blue-600 border-blue-600 text-white' : 'border-white/10 text-slate-400'}`}>
                        <CheckSquare className="w-4 h-4" />
                    </button>
                    
                    {isSelectionMode && selectedIds.size > 0 && (
                        <button onClick={handleDelete} className="p-2 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-white/5 text-slate-200 uppercase text-xs">
                      <tr>
                        {isSelectionMode && (
                            <th className="p-4 w-10">
                                <button onClick={toggleSelectAll}>
                                    {selectedIds.size === filteredLogs.length && filteredLogs.length > 0 ? <CheckSquare className="w-4 h-4 text-blue-500"/> : <Square className="w-4 h-4"/>}
                                </button>
                            </th>
                        )}
                        <th className="p-4">Time</th>
                        <th className="p-4">User</th>
                        <th className="p-4">Action</th>
                        <th className="p-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredLogs.map(log => (
                        <tr key={log.id} className={`hover:bg-white/5 ${selectedIds.has(log.id) ? 'bg-blue-500/5' : ''}`}>
                           {isSelectionMode && (
                                <td className="p-4 text-center">
                                    <button onClick={() => toggleSelect(log.id)}>
                                        {selectedIds.has(log.id) ? <CheckSquare className="w-4 h-4 text-blue-500"/> : <Square className="w-4 h-4"/>}
                                    </button>
                                </td>
                           )}
                           <td className="p-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                           <td className="p-4 text-blue-400">{log.username}</td>
                           <td className="p-4"><ActionBadge action={log.action} /></td>
                           <td className="p-4 truncate max-w-md">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ===========================================
// SUB-MODULE: SETTINGS & ADMIN
// ===========================================
function SettingsModule({ settings, currentUser }) {
    const isAdmin = currentUser.email === ADMIN_EMAIL;
    const [users, setUsers] = useState([]);
    
    useEffect(() => {
        if (!isAdmin) return;
        const fetchUsers = async () => {
             const managedEmails = ['eveman.test@gmail.com', 'regdesk.test@gmail.com', 'sechead.test@gmail.com'];
             const data = managedEmails.map(email => ({ email, role: email.split('.')[0] }));
             setUsers(data);
        };
        fetchUsers();
    }, [isAdmin]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
               <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2"><Settings className="w-5 h-5"/> Configuration</h2>
               <div className="space-y-6">
                 <div className="flex flex-col gap-1 pb-4 border-b border-white/5">
                   <span className="text-xs text-slate-500 uppercase">Event Name</span>
                   <span className="text-slate-200 font-medium text-lg">{settings?.name || '--'}</span>
                 </div>
                 <div className="flex flex-col gap-1 pb-4 border-b border-white/5">
                   <span className="text-xs text-slate-500 uppercase">Venue</span>
                   <span className="text-slate-200 font-medium">{settings?.place || '--'}</span>
                 </div>
                 <div className="flex flex-col gap-1">
                   <span className="text-xs text-slate-500 uppercase">Deadline</span>
                   <span className="text-slate-200 font-medium">{settings?.deadline ? new Date(settings.deadline).toLocaleString() : 'Not Set'}</span>
                 </div>
               </div>
            </div>

            {isAdmin ? (
                 <AdminControlPanel users={users} />
            ) : (
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
                    <Shield className="w-12 h-12 text-slate-600 mb-4" />
                    <h3 className="text-slate-400 font-medium">Restricted Access</h3>
                    <p className="text-slate-600 text-sm mt-2">Only Administrators can access remote device management.</p>
                </div>
            )}
        </div>
    );
}

function AdminControlPanel({ users }) {
    const [selectedUser, setSelectedUser] = useState(null);
    const [locks, setLocks] = useState({ create: false, booked: false, scanner: false });

    const handleSelectUser = async (email) => {
        setSelectedUser(email);
        try {
            // Mock fetch - in production read real doc
            setLocks({ create: false, booked: false, scanner: false }); 
        } catch(e) {}
    };

    const handleSync = async () => {
        if (!selectedUser) return;
        const lockedTabs = Object.keys(locks).filter(k => locks[k]);
        
        try {
            const lockRef = doc(db, 'global_locks', selectedUser);
            await setDoc(lockRef, {
                lockedTabs: lockedTabs,
                updatedAt: Date.now(),
                admin: ADMIN_EMAIL
            }, { merge: true });
            
            alert(`Synced locks for ${selectedUser}`);
        } catch(e) {
            alert("Error syncing locks");
        }
    };

    return (
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 border-t-4 border-t-red-500/50">
           <h2 className="text-lg font-medium text-white mb-2 flex items-center gap-2"><Shield className="w-5 h-5 text-red-500"/> Admin Control Panel</h2>
           <p className="text-xs text-slate-500 mb-6">Remote Device Management & Locking</p>

           <div className="space-y-4">
               <div className="flex gap-2 overflow-x-auto pb-2">
                   {users.map(u => (
                       <button key={u.email} onClick={() => handleSelectUser(u.email)}
                         className={`px-4 py-3 rounded-xl border text-left min-w-[140px] transition-all ${selectedUser === u.email ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black/20 border-white/10 text-slate-400'}`}>
                           <div className="text-xs font-bold uppercase">{u.role}</div>
                           <div className="text-[10px] truncate opacity-70">{u.email}</div>
                       </button>
                   ))}
               </div>

               {selectedUser && (
                   <div className="bg-black/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-4">
                       <p className="text-xs text-slate-500 uppercase mb-3">Lock Tabs for <span className="text-blue-400">{selectedUser}</span></p>
                       <div className="flex gap-4 mb-4">
                           {['create', 'booked', 'scanner'].map(tab => (
                               <label key={tab} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                                   <input type="checkbox" checked={locks[tab]} onChange={e => setLocks({...locks, [tab]: e.target.checked})} className="rounded bg-slate-800 border-white/20 text-blue-600" />
                                   <span className="capitalize">{tab}</span>
                               </label>
                           ))}
                       </div>
                       <button onClick={handleSync} className="w-full bg-red-500/10 border border-red-500/20 text-red-400 py-2 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors">
                           Sync & Lock Device
                       </button>
                   </div>
               )}
           </div>
        </div>
    );
}

// ===========================================
// SUB-COMPONENTS
// ===========================================
function ImportModal({ close, currentUser }) {
    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        const extension = file.name.split('.').pop().toLowerCase();

        if (extension === 'json') {
            reader.onload = async (evt) => {
                try {
                    const data = JSON.parse(evt.target.result);
                    if (Array.isArray(data)) {
                        await processImportData(data, currentUser, close);
                    } else {
                        alert("Invalid JSON format. Expected an array.");
                    }
                } catch (e) {
                    alert("Error parsing JSON file.");
                }
            };
            reader.readAsText(file);
        } else if (extension === 'csv') {
            reader.onload = async (evt) => {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                await processImportData(data, currentUser, close);
            };
            reader.readAsBinaryString(file);
        } else {
            alert("Only .json and .csv files are supported.");
        }
    };

    const processImportData = async (data, currentUser, closeCallback) => {
        if (confirm(`Import ${data.length} records?`)) {
            const chunks = [];
            for (let i = 0; i < data.length; i += 400) chunks.push(data.slice(i, i + 400));
            
            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(row => {
                    // Restore ID if present, else create new
                    const ref = row.id ? doc(db, APP_COLLECTION_ROOT, SHARED_DATA_ID, 'tickets', row.id) : doc(collection(db, APP_COLLECTION_ROOT, SHARED_DATA_ID, 'tickets'));
                    
                    batch.set(ref, {
                        name: row.name || row.Name,
                        phone: String(row.phone || row.Phone || ''),
                        ticketType: row.ticketType || row.Type || 'Classic',
                        status: row.status || 'coming-soon',
                        createdAt: row.createdAt || Date.now(),
                        createdBy: row.createdBy || currentUser.email,
                        age: row.age || '',
                        gender: row.gender || '',
                        scanned: row.scanned === 'true' || row.scanned === true || false,
                        scannedBy: row.scannedBy || '',
                        scannedAt: row.scannedAt || null
                    });
                });
                await batch.commit();
            }
            closeCallback();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
                <h3 className="text-lg font-medium text-white mb-4">Import Guests</h3>
                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center mb-4">
                    <input type="file" accept=".csv, .json" onChange={handleFile} className="hidden" id="fileImport" />
                    <label htmlFor="fileImport" className="cursor-pointer flex flex-col items-center gap-2">
                        <Upload className="w-8 h-8 text-slate-500" />
                        <span className="text-sm text-slate-400">Click to upload CSV or JSON</span>
                    </label>
                </div>
                <button onClick={close} className="w-full py-2 text-sm text-slate-500 hover:text-white">Cancel</button>
            </div>
        </div>
    );
}

function MobileNavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 w-16 transition-all ${active ? 'text-blue-400' : 'text-slate-500'}`}>
      <Icon className={`w-6 h-6 ${active ? 'fill-blue-400/20' : ''}`} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function DesktopNavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${active ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function StatCard({ title, value, icon: Icon, color = 'text-white', onClick }) {
  return (
    <div onClick={onClick} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-24 relative overflow-hidden cursor-pointer hover:bg-white/5 transition-all active:scale-95">
      <div className="absolute top-0 right-0 p-3 opacity-10">
        <Icon className={`w-12 h-12 ${color}`} />
      </div>
      <p className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold z-10">{title}</p>
      <p className="text-2xl font-bold text-white z-10">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'arrived': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'absent': 'bg-red-500/10 text-red-500 border-red-500/20',
    'coming-soon': 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  };
  const displayStatus = status ? status.replace(/-/g, ' ') : status;
  return (
    <span className={`px-2 py-1 rounded-md text-[10px] font-bold border uppercase inline-block text-center min-w-[100px] ${styles[status] || styles['coming-soon']}`}>
        {displayStatus}
    </span>
  );
}

function TypeBadge({ type }) {
  if (type === 'Diamond') return <span className="px-2 py-1 rounded text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">VIP</span>;
  if (type === 'Gold') return <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">VVIP</span>;
  return <span className="px-2 py-1 rounded text-xs text-slate-400 bg-white/5 border border-white/10">Classic</span>;
}

function ActionBadge({ action }) {
  const colors = {
    'LOGIN': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    'TICKET_CREATE': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    'SCAN_ENTRY': 'text-pink-400 bg-pink-400/10 border-pink-400/20',
    'CONFIG_CHANGE': 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    'FACTORY_RESET': 'text-red-500 bg-red-500/10 border-red-500/20 font-bold',
  };
  return <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wide ${colors[action] || 'text-slate-400 bg-white/5 border-white/10'}`}>{action}</span>;
}

function StatusDot({ action }) {
  const colors = {
    'LOGIN': 'bg-blue-500', 'TICKET_CREATE': 'bg-emerald-500', 'SCAN_ENTRY': 'bg-pink-500',
    'CONFIG_CHANGE': 'bg-amber-500', 'FACTORY_RESET': 'bg-red-500'
  };
  return <div className={`w-2 h-2 rounded-full mt-1.5 ${colors[action] || 'bg-slate-500'}`}></div>;
}

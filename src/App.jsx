import React, { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  LayoutDashboard, Users, Activity, Settings, Search, Shield, Ticket, 
  UserCheck, Clock, Lock, LogOut, Menu, X, ChevronRight, Smartphone, LogIn
} from 'lucide-react';

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
  const [isProfileOpen, setIsProfileOpen] = useState(false); // State for Avatar Dropdown

  // Data Fetching
  useEffect(() => {
    const unsubTickets = onSnapshot(query(collection(db, APP_COLLECTION_ROOT, SHARED_DATA_ID, 'tickets')), 
      (snap) => setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const unsubLogs = onSnapshot(query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc')), 
      (snap) => setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 50)));

    const unsubSettings = onSnapshot(doc(db, APP_COLLECTION_ROOT, SHARED_DATA_ID, 'settings', 'config'), 
      (doc) => doc.exists() && setSettings(doc.data()));

    return () => { unsubTickets(); unsubLogs(); unsubSettings(); };
  }, []);

  const stats = {
    total: tickets.length,
    arrived: tickets.filter(t => t.status === 'arrived').length,
    pending: tickets.filter(t => t.status === 'coming-soon').length,
    vip: tickets.filter(t => ['Diamond', 'Gold'].includes(t.ticketType)).length
  };

  const statusData = [
    { name: 'Arrived', value: stats.arrived, color: '#10b981' },
    { name: 'Pending', value: stats.pending, color: '#f59e0b' },
    { name: 'Absent', value: tickets.filter(t => t.status === 'absent').length, color: '#ef4444' },
  ];

  // Helper for Header Profile Dropdown
  const UserProfileDropdown = () => (
    <div className="absolute right-0 top-12 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-4 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-4 pb-4 border-b border-white/10">
            <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Signed in as</p>
            <p className="text-sm text-white font-medium truncate">{user.email}</p>
        </div>
        <button 
            onClick={() => signOut(auth)} 
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
            <LogOut className="w-4 h-4" /> Sign Out
        </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden flex-col md:flex-row">
      
      {/* DESKTOP SIDEBAR */}
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
        <div className="p-4 border-t border-white/10">
          <button onClick={() => signOut(auth)} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden h-16 border-b border-white/10 bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30">
        {/* Full App Name on Mobile */}
        <div className="text-lg font-light tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            Ticketing<span className="font-bold">Cmd</span>.
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 border border-white/20 shadow-lg"></div>
          </button>
          
          {/* Mobile Profile Dropdown */}
          {isProfileOpen && <UserProfileDropdown />}
        </div>
      </header>

      {/* DESKTOP HEADER (For Tablet/Desktop View) */}
      <header className="hidden md:flex h-16 border-b border-white/5 bg-slate-950/50 sticky top-0 backdrop-blur z-10 items-center justify-between px-8">
         <h2 className="font-medium text-lg capitalize">{activeTab}</h2>
         <div className="relative flex items-center gap-4">
             {settings && (
               <div className="px-3 py-1 bg-white/5 rounded-full text-xs border border-white/10">
                 Event: <span className="text-blue-400">{settings.name}</span>
               </div>
             )}
             
             {/* Desktop Avatar Trigger */}
             <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="focus:outline-none">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 border border-white/20 cursor-pointer"></div>
             </button>

             {/* Desktop Profile Dropdown */}
             {isProfileOpen && <UserProfileDropdown />}
         </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto bg-slate-950 pb-20 md:pb-0 scroll-smooth" onClick={() => { if(isProfileOpen) setIsProfileOpen(false) }}>
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <StatCard title="Total" value={stats.total} icon={Users} />
                <StatCard title="In" value={stats.arrived} icon={UserCheck} color="text-emerald-500" />
                <StatCard title="Pending" value={stats.pending} icon={Clock} color="text-amber-500" />
                <StatCard title="VIP" value={stats.vip} icon={Ticket} color="text-purple-500" />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Live Attendance</h3>
                  <div className="h-48 md:h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
                          {statusData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                        </Pie>
                        {/* UPDATED: Tooltip text color forced to white */}
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }} 
                            itemStyle={{ color: '#e2e8f0' }}
                        />
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
            <div className="space-y-4">
              <div className="sticky top-0 bg-slate-950/95 backdrop-blur py-2 z-10 -mx-4 px-4 md:mx-0 md:px-0 md:static">
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                   <input type="text" placeholder="Search guests..." 
                     className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 text-white placeholder:text-slate-600 shadow-sm" />
                </div>
              </div>

              <div className="md:hidden space-y-3">
                {tickets.map(t => (
                  <div key={t.id} className="bg-slate-900/50 border border-white/5 rounded-xl p-4 flex justify-between items-center active:bg-white/5 transition-colors">
                    <div>
                      <h4 className="font-medium text-white text-base">{t.name}</h4>
                      <p className="text-slate-500 text-xs mt-0.5">{t.ticketType || 'Classic'} • {t.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <StatusBadge status={t.status} />
                       <span className="font-mono text-[10px] text-slate-600">{t.id.substring(0,6)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="bg-white/5 text-slate-200 uppercase text-xs">
                    <tr><th className="p-4">Name</th><th className="p-4">Type</th><th className="p-4">Contact</th><th className="p-4">Status</th><th className="p-4 text-right">ID</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {tickets.map(t => (
                      <tr key={t.id} className="hover:bg-white/5">
                        <td className="p-4 font-medium text-white">{t.name}</td>
                        <td className="p-4"><span className="text-xs bg-white/5 px-2 py-1 rounded border border-white/10">{t.ticketType || 'Classic'}</span></td>
                        <td className="p-4">{t.phone}</td>
                        <td className="p-4"><StatusBadge status={t.status} /></td>
                        <td className="p-4 text-right font-mono text-xs opacity-50">{t.id.substring(0,8)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: LOGS */}
          {activeTab === 'logs' && (
             <div className="space-y-4">
               <div className="md:hidden space-y-3">
                 {logs.map(log => (
                   <div key={log.id} className="bg-slate-900/50 border border-white/5 rounded-xl p-3 text-sm">
                     <div className="flex justify-between items-start mb-2">
                       <span className="text-xs font-mono text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                       <ActionBadge action={log.action} />
                     </div>
                     <p className="text-slate-300 text-xs leading-relaxed">{log.details}</p>
                     <p className="text-[10px] text-blue-400 mt-2 font-medium">User: {log.username}</p>
                   </div>
                 ))}
               </div>

               <div className="hidden md:block bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-white/5 text-slate-200 uppercase text-xs">
                      <tr><th className="p-4">Time</th><th className="p-4">User</th><th className="p-4">Action</th><th className="p-4">Details</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {logs.map(log => (
                        <tr key={log.id} className="hover:bg-white/5">
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
          )}

          {/* TAB: SETTINGS */}
          {activeTab === 'settings' && settings && (
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
               <h2 className="text-lg font-medium text-white mb-6">Configuration</h2>
               <div className="space-y-6">
                 <div className="flex flex-col gap-1 pb-4 border-b border-white/5">
                   <span className="text-xs text-slate-500 uppercase">Event Name</span>
                   <span className="text-slate-200 font-medium text-lg">{settings.name}</span>
                 </div>
                 <div className="flex flex-col gap-1 pb-4 border-b border-white/5">
                   <span className="text-xs text-slate-500 uppercase">Venue</span>
                   <span className="text-slate-200 font-medium">{settings.place}</span>
                 </div>
                 <div className="flex flex-col gap-1">
                   <span className="text-xs text-slate-500 uppercase">Deadline</span>
                   <span className="text-slate-200 font-medium">{settings.deadline ? new Date(settings.deadline).toLocaleString() : 'Not Set'}</span>
                 </div>
               </div>
            </div>
          )}

        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 w-full h-16 bg-slate-900/90 backdrop-blur-lg border-t border-white/10 flex justify-around items-center px-2 z-40 safe-area-pb">
        <MobileNavItem icon={LayoutDashboard} label="Home" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <MobileNavItem icon={Users} label="Guests" active={activeTab === 'guests'} onClick={() => setActiveTab('guests')} />
        <MobileNavItem icon={Activity} label="Logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
        <MobileNavItem icon={Settings} label="Config" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
}

// --- SUB COMPONENTS ---
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

function StatCard({ title, value, icon: Icon, color = 'text-white' }) {
  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-24 relative overflow-hidden">
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
  return <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${styles[status] || styles['coming-soon']}`}>{status}</span>;
}

function ActionBadge({ action }) {
  const colors = {
    'LOGIN': 'text-blue-400', 'TICKET_CREATE': 'text-emerald-400', 'SCAN_ENTRY': 'text-pink-400',
    'CONFIG_CHANGE': 'text-amber-400', 'FACTORY_RESET': 'text-red-500 font-bold'
  };
  return <span className={`text-[10px] font-mono uppercase tracking-wide ${colors[action] || 'text-slate-400'}`}>{action}</span>;
}

function StatusDot({ action }) {
  const colors = {
    'LOGIN': 'bg-blue-500', 'TICKET_CREATE': 'bg-emerald-500', 'SCAN_ENTRY': 'bg-pink-500',
    'CONFIG_CHANGE': 'bg-amber-500', 'FACTORY_RESET': 'bg-red-500'
  };
  return <div className={`w-2 h-2 rounded-full mt-1.5 ${colors[action] || 'bg-slate-500'}`}></div>;
}

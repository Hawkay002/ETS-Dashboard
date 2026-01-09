import React, { useEffect, useState, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, orderBy, doc, deleteDoc, writeBatch, updateDoc, setDoc, where, getDoc } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  LayoutDashboard, Users, Logs, Settings, Search, Shield, Ticket, 
  UserCheck, Clock, Lock, LogOut, Menu, X, ChevronRight, Smartphone, LogIn,
  Filter, Download, Upload, Trash2, MoreVertical, CheckSquare, Square, Crown, 
  FileText, ChevronDown, X as CloseIcon, Terminal, Copy, Play, Save, Edit2, 
  CheckCircle, AlertCircle, Eye, EyeOff, Unlock, User, Wifi
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, HeadingLevel } from "docx";
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

const MANAGED_USERS = [
    { email: 'eveman.test@gmail.com', role: 'Event Manager' },
    { email: 'regdesk.test@gmail.com', role: 'Registration Desk' },
    { email: 'sechead.test@gmail.com', role: 'Security Head' }
];

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
  const [showPassword, setShowPassword] = useState(false);
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
            <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 pr-10 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
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
          <DesktopNavItem icon={Logs} label="Logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <DesktopNavItem icon={Terminal} label="Console" active={activeTab === 'console'} onClick={() => setActiveTab('console')} />
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

                <div className="flex flex-col gap-4">
                    {/* STAFF STATUS CARD */}
                    <StaffStatusCard onViewAll={() => setActiveTab('settings')} />

                    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 shadow-sm flex flex-col flex-1">
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

          {/* TAB: CONSOLE */}
          {activeTab === 'console' && (
             <ConsoleModule currentUser={user} />
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
        <MobileNavItem icon={Logs} label="Logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
        <MobileNavItem icon={Terminal} label="Console" active={activeTab === 'console'} onClick={() => setActiveTab('console')} />
        <MobileNavItem icon={Settings} label="Config" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
      </nav>
    </div>
  );
}

// ===========================================
// SUB-MODULE: STAFF STATUS CARD (Overview)
// ===========================================
function StaffStatusCard({ onViewAll }) {
    const [staff, setStaff] = useState([]);
    const [presenceData, setPresenceData] = useState([]); // Stores flat device data
    const [locks, setLocks] = useState({});

    useEffect(() => {
        // 1. Fetch Staff (Allowed Usernames)
        const unsubStaff = onSnapshot(collection(db, 'allowed_usernames'), (snap) => {
            const data = snap.docs.map(d => ({ username: d.id, ...d.data() }));
            setStaff(data);
        });

        // 2. Fetch Presence: We need listeners for each managed user email
        const presenceUnsubs = MANAGED_USERS.map(user => {
            return onSnapshot(collection(db, 'global_presence', user.email, 'devices'), (snap) => {
                 const devices = snap.docs.map(d => ({...d.data(), parentEmail: user.email}));
                 setPresenceData(prev => {
                     const others = prev.filter(d => d.parentEmail !== user.email);
                     return [...others, ...devices];
                 });
            });
        });

        // 3. Fetch Locks
        const unsubLocks = onSnapshot(collection(db, 'global_locks'), (snap) => {
            const lockMap = {};
            snap.forEach(doc => { lockMap[doc.id] = doc.data(); });
            setLocks(lockMap);
        });

        return () => { 
            unsubStaff(); 
            unsubLocks();
            presenceUnsubs.forEach(fn => fn()); 
        };
    }, []);

    const groupedStaff = useMemo(() => {
        const groups = {
            'Event Manager': [],
            'Registration Desk': [],
            'Security Head': []
        };
        
        staff.forEach(s => {
            if (groups[s.role]) {
                let isLocked = false;
                let lockReason = '';
                
                if (locks[s.email] && locks[s.email].userSpecificLocks && locks[s.email].userSpecificLocks[s.username]) {
                    const specificLocks = locks[s.email].userSpecificLocks[s.username];
                    if (specificLocks && specificLocks.length > 0) {
                        isLocked = true;
                        if (locks[s.email].lockMetadata && locks[s.email].lockMetadata[s.username]) {
                            lockReason = locks[s.email].lockMetadata[s.username].type;
                        }
                    }
                }
                
                const now = Date.now();
                const isOnline = presenceData.some(d => d.username === s.username && (now - d.lastSeen < 30000));

                groups[s.role].push({ ...s, isLocked, lockReason, isOnline });
            }
        });
        return groups;
    }, [staff, locks, presenceData]);

    return (
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff Status</h3>
                <button onClick={onViewAll} className="text-xs text-blue-400">View All</button>
            </div>
            
            <div className="space-y-4 flex-1">
                {Object.entries(groupedStaff).map(([role, members]) => (
                    <div key={role} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                        <div className="text-[10px] uppercase text-slate-600 font-bold mb-2">{role}</div>
                        {members.length === 0 ? (
                            <div className="text-xs text-slate-700 italic">No staff assigned</div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {members.map(m => (
                                    <div key={m.username} className="bg-black/20 rounded-lg p-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.isOnline ? 'bg-emerald-500 animate-pulse shadow-[0_0_5px_#10b981]' : 'bg-slate-700'}`}></div>
                                            <span className={`text-xs truncate ${m.isOnline ? 'text-white' : 'text-slate-500'}`}>{m.username}</span>
                                        </div>
                                        {m.isLocked && (
                                            <div className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/10" title={m.lockReason}>
                                                <Lock className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ===========================================
// SUB-MODULE: CONSOLE (Power User)
// ===========================================
function ConsoleModule({ currentUser }) {
    const [formData, setFormData] = useState({ username: '', name: '', role: 'Event Manager' });
    const [terminalLines, setTerminalLines] = useState([
        { type: 'info', text: 'System Console v1.0.3 Ready...' },
        { type: 'info', text: 'Connected to Firestore Instance.' }
    ]);
    const [currentCommand, setCurrentCommand] = useState('');
    const bottomRef = useRef(null);

    const generateCommand = () => {
        if(!formData.username || !formData.name) return;
        const cmd = `createStaffUser("${formData.username}", "${formData.name}", "${formData.role}")`;
        setCurrentCommand(cmd);
    };

    const runCommand = async () => {
        if(!currentCommand) return;
        
        setTerminalLines(prev => [...prev, { type: 'input', text: `> ${currentCommand}` }]);
        
        const regex = /createStaffUser\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/;
        const match = currentCommand.match(regex);

        if(match) {
            const [_, username, realName, role] = match;
            
            let targetEmail = "";
            const roleLower = role.toLowerCase();
            if (roleLower.includes('event')) targetEmail = "eveman.test@gmail.com";
            else if (roleLower.includes('reg')) targetEmail = "regdesk.test@gmail.com";
            else if (roleLower.includes('sec')) targetEmail = "sechead.test@gmail.com";
            else {
                setTerminalLines(prev => [...prev, { type: 'error', text: `x Error: Unknown role. Use 'Event Manager', 'Registration Desk', or 'Security Head'` }]);
                setCurrentCommand('');
                return;
            }

            try {
                await setDoc(doc(db, 'allowed_usernames', username), {
                    realName: realName,
                    role: role,
                    email: targetEmail,
                    createdAt: Date.now()
                });
                setTerminalLines(prev => [...prev, { type: 'success', text: `✓ SUCCESS: User '${username}' created for ${targetEmail}` }]);
            } catch (err) {
                setTerminalLines(prev => [...prev, { type: 'error', text: `x Error: ${err.message}` }]);
            }
        } else {
            setTerminalLines(prev => [...prev, { type: 'error', text: `x Syntax Error: Unknown command format.` }]);
        }

        setCurrentCommand(''); 
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const copyToClipboard = () => {
        if(currentCommand) {
            navigator.clipboard.writeText(currentCommand);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-160px)]">
            {/* Input Form */}
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 h-fit">
                <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    New User Parameters
                </h2>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs uppercase text-slate-500 font-semibold ml-1">Username (ID)</label>
                        <input 
                            type="text" 
                            value={formData.username}
                            onChange={e => setFormData({...formData, username: e.target.value})}
                            placeholder="user_id"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs uppercase text-slate-500 font-semibold ml-1">Staff Name</label>
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            placeholder="John Doe"
                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs uppercase text-slate-500 font-semibold ml-1">Role</label>
                        <select 
                            value={formData.role}
                            onChange={e => setFormData({...formData, role: e.target.value})}
                            className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="Event Manager">Event Manager</option>
                            <option value="Registration Desk">Registration Desk</option>
                            <option value="Security Head">Security Head</option>
                        </select>
                    </div>
                    
                    <button 
                        onClick={generateCommand}
                        disabled={!formData.username || !formData.name}
                        className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed mt-4 transition-colors"
                    >
                        Generate Command
                    </button>
                </div>
            </div>

            {/* Terminal Output */}
            <div className="lg:col-span-2 bg-black border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl font-mono text-sm relative">
                {/* Terminal Header */}
                <div className="bg-slate-900/80 border-b border-white/10 px-4 py-2 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-500" />
                    <span className="text-slate-400 text-xs">admin@dashboard:~/console</span>
                </div>

                {/* Terminal Body */}
                <div className="flex-1 p-4 overflow-y-auto space-y-1 text-slate-300">
                    {terminalLines.map((line, idx) => (
                        <div key={idx} className={`${line.type === 'error' ? 'text-red-400' : line.type === 'success' ? 'text-emerald-400' : line.type === 'input' ? 'text-white font-bold' : 'text-slate-500'}`}>
                            {line.text}
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>

                {/* Active Input Line */}
                <div className="bg-slate-900/50 p-4 border-t border-white/10 flex items-center gap-3">
                    <span className="text-emerald-500 font-bold">{">"}</span>
                    <input 
                        type="text" 
                        value={currentCommand}
                        onChange={e => setCurrentCommand(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && runCommand()}
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-slate-700"
                        placeholder="Waiting for command..."
                    />
                    
                    <div className="flex items-center gap-1">
                        <button onClick={copyToClipboard} title="Copy" className="p-2 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors">
                            <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={runCommand} title="Run" className="p-2 hover:bg-emerald-500/20 rounded text-emerald-500 transition-colors">
                            <Play className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
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
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState('xlsx');
    const [exportFileName, setExportFileName] = useState('');

    const filteredTickets = useMemo(() => {
        let res = tickets.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.phone.includes(search));
        if (initialFilterStatus !== 'all') res = res.filter(t => t.status === initialFilterStatus);
        if (initialFilterType === 'Special') res = res.filter(t => ['Diamond', 'Gold'].includes(t.ticketType));
        else if (initialFilterType !== 'all') res = res.filter(t => (t.ticketType || 'Classic') === initialFilterType);
        
        res.sort((a, b) => {
            if (initialSort === 'newest') return b.createdAt - a.createdAt;
            if (initialSort === 'oldest') return a.createdAt - b.createdAt;
            if (initialSort === 'name-asc') return a.name.localeCompare(b.name);
            if (initialSort === 'type') { const r = { 'Gold': 2, 'Diamond': 1, 'Classic': 0 }; return (r[b.ticketType] || 0) - (r[a.ticketType] || 0); }
            return 0;
        });
        return res;
    }, [tickets, search, initialFilterStatus, initialFilterType, initialSort]);

    const toggleSelect = (id) => { const n = new Set(selectedIds); if (n.has(id)) n.delete(id); else n.add(id); setSelectedIds(n); };
    const toggleSelectAll = () => { if (selectedIds.size === filteredTickets.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filteredTickets.map(t => t.id))); };
    const toggleSelectionMode = () => { if (isSelectionMode) setSelectedIds(new Set()); setIsSelectionMode(!isSelectionMode); };
    const handleDeleteClick = () => setIsDeleteModalOpen(true);
    const confirmDelete = async () => { const b = writeBatch(db); selectedIds.forEach(id => b.delete(doc(db, APP_COLLECTION_ROOT, SHARED_DATA_ID, 'tickets', id))); await b.commit(); setSelectedIds(new Set()); setIsSelectionMode(false); setIsDeleteModalOpen(false); };
    const openExportModal = () => { setExportFileName(`GuestList_${new Date().toISOString().split('T')[0]}`); setIsExportModalOpen(true); };
    
    // -- EXPORT HANDLER (Full Schema) --
    const handleExportProcess = async () => {
        setIsExportModalOpen(false);
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

        const fileName = exportFileName || `GuestList`;
        const fields = ['s_no', 'ticket_type', 'id', 'age', 'scannedAt', 'status', 'phone', 'ticketType', 'createdAt', 'gender', 'name', 'createdBy', 'scanned', 'scannedBy'];

        switch (exportFormat) {
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
                doc.text(fileName, 14, 15);
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
                            new Paragraph({ text: fileName, heading: HeadingLevel.HEADING_1 }),
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
             <div className="bg-slate-900/40 p-4 rounded-2xl border border-white/5 flex flex-col gap-4 relative z-20">
                <div className="w-full relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" placeholder="Search guests..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 text-white placeholder:text-slate-600" />
                </div>
                <div className="flex gap-2 w-full">
                    <select value={initialFilterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-slate-950 border border-white/10 rounded-xl text-sm px-3 py-2.5 text-slate-300 focus:outline-none flex-1 min-w-0">
                        <option value="all">All Status</option>
                        <option value="arrived">Arrived</option>
                        <option value="coming-soon">Pending</option>
                        <option value="absent">Absent</option>
                    </select>
                    <select value={initialFilterType} onChange={(e) => setFilterType(e.target.value)} className="bg-slate-950 border border-white/10 rounded-xl text-sm px-3 py-2.5 text-slate-300 focus:outline-none flex-1 min-w-0">
                        <option value="all">All Types</option>
                        <option value="Classic">Classic</option>
                        <option value="Diamond">VIP</option>
                        <option value="Gold">VVIP</option>
                        <option value="Special">Special</option>
                    </select>
                    <button onClick={handleDeleteClick} disabled={selectedIds.size === 0} className={`p-2.5 rounded-xl border transition-all w-12 flex-none flex items-center justify-center ${selectedIds.size > 0 ? 'border-red-500/20 bg-red-500/10 text-red-400 cursor-pointer' : 'border-white/5 text-slate-600 opacity-50 cursor-not-allowed'}`}><Trash2 className="w-5 h-5" /></button>
                    <button onClick={toggleSelectionMode} className={`p-2.5 rounded-xl border w-12 flex-none flex items-center justify-center ${isSelectionMode ? 'bg-blue-600 border-blue-600 text-white' : 'border-white/10 text-slate-400'}`}><CheckSquare className="w-5 h-5" /></button>
                </div>
                 <div className="flex flex-wrap gap-3 border-t border-white/5 pt-4 justify-center">
                     <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition-colors"><Upload className="w-4 h-4" /><span>Import Data</span></button>
                     <button disabled={selectedIds.size === 0} onClick={openExportModal} className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-transparent"><Download className="w-4 h-4" /><span>Export Data</span></button>
                </div>
            </div>
            
            {/* Export Modal */}
            {isExportModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                        <button onClick={() => setIsExportModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><CloseIcon className="w-5 h-5" /></button>
                        
                        <h3 className="text-lg font-medium text-white mb-1">Export Data</h3>
                        <p className="text-sm text-slate-500 mb-6">Exporting <span className="text-blue-400 font-bold">{selectedIds.size}</span> selected guests.</p>
                        
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs uppercase text-slate-500 font-semibold ml-1">Filename</label>
                                <input 
                                    type="text" 
                                    value={exportFileName}
                                    onChange={(e) => setExportFileName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs uppercase text-slate-500 font-semibold ml-1">Format</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['xlsx', 'csv', 'json', 'pdf', 'docx', 'txt'].map(fmt => (
                                        <button 
                                            key={fmt}
                                            onClick={() => setExportFormat(fmt)}
                                            className={`py-2 rounded-lg text-xs font-medium uppercase border transition-all ${exportFormat === fmt ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                                        >
                                            {fmt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setIsExportModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5 transition-colors">Cancel</button>
                            <button onClick={handleExportProcess} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20">Download</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
             <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden relative z-10">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400 whitespace-nowrap">
                      <thead className="bg-white/5 text-slate-200 uppercase text-xs">
                        <tr>
                            {isSelectionMode && <th className="p-4 w-10"><button onClick={toggleSelectAll}>{selectedIds.size === filteredTickets.length && filteredTickets.length > 0 ? <CheckSquare className="w-4 h-4 text-blue-500"/> : <Square className="w-4 h-4"/>}</button></th>}
                            <th className="p-4">Name</th><th className="p-4">Type</th><th className="p-4">Contact</th><th className="p-4">Gender</th><th className="p-4">Age</th><th className="p-4">Status / Time</th><th className="p-4">Scanned By</th><th className="p-4 text-right">ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredTickets.map(t => (
                          <tr key={t.id} className={`hover:bg-white/5 ${selectedIds.has(t.id) ? 'bg-blue-500/5' : ''}`}>
                            {isSelectionMode && <td className="p-4 text-center"><button onClick={() => toggleSelect(t.id)}>{selectedIds.has(t.id) ? <CheckSquare className="w-4 h-4 text-blue-500"/> : <Square className="w-4 h-4"/>}</button></td>}
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

             <DeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} count={selectedIds.size} type="guests"/>
             {isImportModalOpen && <ImportModal close={() => setIsImportModalOpen(false)} currentUser={currentUser} />}
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
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const filteredLogs = useMemo(() => {
        return logs.filter(l => {
            if (filter !== 'all' && l.action !== filter) return false;
            if (search && !l.details.toLowerCase().includes(search.toLowerCase()) && !l.username.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [logs, filter, search]);

    const handleDeleteClick = () => {
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        const batch = writeBatch(db);
        selectedIds.forEach(id => batch.delete(doc(db, 'activity_logs', id)));
        await batch.commit();
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        setIsDeleteModalOpen(false);
    };

    const toggleSelect = (id) => { const n = new Set(selectedIds); if (n.has(id)) n.delete(id); else n.add(id); setSelectedIds(n); };
    const toggleSelectionMode = () => { if (isSelectionMode) setSelectedIds(new Set()); setIsSelectionMode(!isSelectionMode); };
    const toggleSelectAll = () => { if (selectedIds.size === filteredLogs.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filteredLogs.map(l => l.id))); };

    return (
        <div className="space-y-4">
             <div className="flex flex-col md:flex-row gap-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5 items-center justify-between">
                <div className="relative flex-1 w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 text-white" />
                </div>
                 <div className="flex gap-2 items-center w-full md:w-auto">
                    <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-slate-950 border border-white/10 rounded-xl text-sm px-4 py-2 text-slate-300 focus:outline-none flex-1 md:flex-initial md:w-48 h-[42px]">
                        <option value="all">All Actions</option>
                        <option value="LOGIN">Login</option>
                        <option value="TICKET_CREATE">Ticket Create</option>
                        <option value="SCAN_ENTRY">Scan Entry</option>
                        <option value="CONFIG_CHANGE">Config Change</option>
                        <option value="LOCK_ACTION">Locks</option>
                    </select>
                    <button onClick={handleDeleteClick} disabled={selectedIds.size === 0} className={`p-2.5 rounded-xl border transition-all w-12 flex items-center justify-center h-[42px] ${selectedIds.size > 0 ? 'border-red-500/20 bg-red-500/10 text-red-400 cursor-pointer' : 'border-white/5 text-slate-600 opacity-50 cursor-not-allowed'}`}><Trash2 className="w-5 h-5" /></button>
                    <button onClick={toggleSelectionMode} className={`p-2.5 rounded-xl border w-12 flex items-center justify-center h-[42px] ${isSelectionMode ? 'bg-blue-600 border-blue-600 text-white' : 'border-white/10 text-slate-400'}`}><CheckSquare className="w-5 h-5" /></button>
                </div>
            </div>

             <DeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDelete} count={selectedIds.size} type="logs"/>

             <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400 whitespace-nowrap">
                        <thead className="bg-white/5 text-slate-200 uppercase text-xs">
                        <tr>
                            {isSelectionMode && <th className="p-4 w-10"><button onClick={toggleSelectAll}>{selectedIds.size === filteredLogs.length && filteredLogs.length > 0 ? <CheckSquare className="w-4 h-4 text-blue-500"/> : <Square className="w-4 h-4"/>}</button></th>}
                            <th className="p-4">Time</th><th className="p-4">User</th><th className="p-4">Action</th><th className="p-4">Details</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                        {filteredLogs.map(log => (
                            <tr key={log.id} className={`hover:bg-white/5 ${selectedIds.has(log.id) ? 'bg-blue-500/5' : ''}`}>
                            {isSelectionMode && <td className="p-4 text-center"><button onClick={() => toggleSelect(log.id)}>{selectedIds.has(log.id) ? <CheckSquare className="w-4 h-4 text-blue-500"/> : <Square className="w-4 h-4"/>}</button></td>}
                            <td className="p-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="p-4 text-blue-400">{log.username}</td>
                            <td className="p-4"><ActionBadge action={log.action} /></td>
                            <td className="p-4 max-w-md truncate">{log.details}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ===========================================
// SUB-MODULE: SETTINGS & ADMIN (Revamped)
// ===========================================
function SettingsModule({ settings, currentUser }) {
    const isAdmin = currentUser.email === ADMIN_EMAIL;
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ name: '', place: '', deadline: '' });
    
    useEffect(() => {
        if(settings) {
            setFormData({
                name: settings.name || '',
                place: settings.place || '',
                deadline: settings.deadline ? new Date(settings.deadline).toISOString().slice(0,16) : ''
            });
        }
    }, [settings]);

    const handleSaveConfig = async () => {
        try {
            await setDoc(doc(db, APP_COLLECTION_ROOT, SHARED_DATA_ID, 'settings', 'config'), {
                name: formData.name,
                place: formData.place,
                deadline: new Date(formData.deadline).getTime()
            }, { merge: true });
            
            await  setDoc(doc(collection(db, 'activity_logs')), {
                action: 'CONFIG_CHANGE', details: `Updated Event Config: ${formData.name}`, timestamp: Date.now(), username: currentUser.email
            });
            setIsEditing(false);
        } catch (e) { alert('Failed to update configuration.'); }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
            {/* Standard Config Panel */}
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6">
               <div className="flex justify-between items-center mb-6">
                   <h2 className="text-lg font-medium text-white flex items-center gap-2"><Settings className="w-5 h-5"/> Configuration</h2>
                   
                   <div className="flex gap-2">
                       {isEditing ? (
                           <>
                             <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-slate-400 hover:text-white border border-white/10 transition-all">Cancel</button>
                             <button onClick={handleSaveConfig} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                                 <Save className="w-3 h-3"/> Save
                             </button>
                           </>
                       ) : (
                           <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-slate-400 hover:text-white border border-white/10 transition-all">
                               <Edit2 className="w-3 h-3"/> Edit
                           </button>
                       )}
                   </div>
               </div>

               <div className="space-y-6">
                 <div className="flex flex-col gap-1 pb-4 border-b border-white/5">
                   <span className="text-xs text-slate-500 uppercase">Event Name</span>
                   {isEditing ? <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none transition-colors"/> : <span className="text-slate-200 font-medium text-lg">{settings?.name || '--'}</span>}
                 </div>
                 <div className="flex flex-col gap-1 pb-4 border-b border-white/5">
                   <span className="text-xs text-slate-500 uppercase">Venue</span>
                   {isEditing ? <input type="text" value={formData.place} onChange={e => setFormData({...formData, place: e.target.value})} className="bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none transition-colors"/> : <span className="text-slate-200 font-medium">{settings?.place || '--'}</span>}
                 </div>
                 <div className="flex flex-col gap-1">
                   <span className="text-xs text-slate-500 uppercase">Deadline</span>
                   {isEditing ? <input type="datetime-local" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} className="bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-blue-500 outline-none invert-calendar-icon transition-colors"/> : <span className="text-slate-200 font-medium">{settings?.deadline ? new Date(settings.deadline).toLocaleString() : 'Not Set'}</span>}
                 </div>
               </div>
            </div>

            {/* Admin Control Panel */}
            {isAdmin ? <AdminControlPanel /> : (
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
                    <Shield className="w-12 h-12 text-slate-600 mb-4" />
                    <h3 className="text-slate-400 font-medium">Restricted Access</h3>
                    <p className="text-slate-600 text-sm mt-2">Only Administrators can access remote device management.</p>
                </div>
            )}
        </div>
    );
}

// ===========================================
// SUB-MODULE: ADMIN CONTROL PANEL (Detailed)
// ===========================================
function AdminControlPanel() {
    const [selectedRoleEmail, setSelectedRoleEmail] = useState(null);
    const [usernames, setUsernames] = useState([]);
    const [selectedUsernames, setSelectedUsernames] = useState(new Set());
    const [deviceData, setDeviceData] = useState([]);
    
    const [currentLocks, setCurrentLocks] = useState({});
    const [tabSelection, setTabSelection] = useState({ create: false, booked: false, scanner: false });
    
    const [isLockModalOpen, setIsLockModalOpen] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [lockReason, setLockReason] = useState('basic');
    const [maintHours, setMaintHours] = useState('');
    const [maintMins, setMaintMins] = useState('');
    
    // 1. Fetch Usernames when Role Selected
    useEffect(() => {
        if (!selectedRoleEmail) return;

        const q = query(collection(db, 'allowed_usernames'), where('email', '==', selectedRoleEmail));
        const unsubUsernames = onSnapshot(q, (snap) => {
            const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setUsernames(users);
        });

        const unsubPresence = onSnapshot(collection(db, 'global_presence', selectedRoleEmail, 'devices'), (snap) => {
            const devs = snap.docs.map(d => d.data());
            setDeviceData(devs);
        });

        const unsubLocks = onSnapshot(doc(db, 'global_locks', selectedRoleEmail), (docSnap) => {
            if(docSnap.exists()) setCurrentLocks(docSnap.data());
            else setCurrentLocks({});
        });

        return () => { unsubUsernames(); unsubPresence(); unsubLocks(); };
    }, [selectedRoleEmail]);

    // 2. Handle Username Selection
    const toggleUsername = (username) => {
        const next = new Set(selectedUsernames);
        if(next.has(username)) next.delete(username); else next.add(username);
        setSelectedUsernames(next);
        
        // Update checkboxes based on selection (if single user selected)
        if(next.size === 1) {
            const user = Array.from(next)[0];
            const locks = (currentLocks.userSpecificLocks && currentLocks.userSpecificLocks[user]) || [];
            setTabSelection({
                create: locks.includes('create'),
                booked: locks.includes('booked'),
                scanner: locks.includes('scanner')
            });
            
            // Set Reason
            if(currentLocks.lockMetadata && currentLocks.lockMetadata[user]) {
                setLockReason(currentLocks.lockMetadata[user].type);
            }
        } else if (next.size === 0) {
            setTabSelection({ create: false, booked: false, scanner: false });
        }
    };

    const toggleSelectAll = () => {
        if(selectedUsernames.size === usernames.length) setSelectedUsernames(new Set());
        else setSelectedUsernames(new Set(usernames.map(u => u.id)));
    };

    // 3. Logic: Is Online?
    const isUserOnline = (username) => {
        const now = Date.now();
        // Check if any device for this role has reported this username recently
        return deviceData.some(d => d.username === username && (now - d.lastSeen < 40000));
    };

    // 4. Modal Action
    const handleTriggerLock = () => {
        if(selectedUsernames.size === 0) return alert("Select users first.");
        setIsLockModalOpen(true);
        setPasswordInput('');
        setShowPassword(false);
    };

    const confirmLockAction = async () => {
        // Verify Password
        const secSnap = await getDoc(doc(db, 'admin_settings', 'security'));
        const storedPwd = secSnap.exists() ? secSnap.data().remoteLockPassword : 'admin123';
        
        if (passwordInput !== storedPwd) return alert("Incorrect Password");

        const lockedTabs = Object.keys(tabSelection).filter(k => tabSelection[k]);
        let durationStr = '';
        if(lockReason === 'maintenance') {
            if(maintHours) durationStr += `${maintHours} hr `;
            if(maintMins) durationStr += `${maintMins} min`;
        }

        const metaObj = {
            type: lockReason,
            duration: durationStr,
            updatedAt: Date.now()
        };

        const updates = {};
        selectedUsernames.forEach(u => {
            updates[`userSpecificLocks.${u}`] = lockedTabs;
            updates[`lockMetadata.${u}`] = metaObj;
        });
        updates.updatedAt = Date.now();

        try {
            await updateDoc(doc(db, 'global_locks', selectedRoleEmail), updates).catch(async (err) => {
                if(err.code === 'not-found') {
                    const initial = { userSpecificLocks: {}, lockMetadata: {} };
                    selectedUsernames.forEach(u => {
                        initial.userSpecificLocks[u] = lockedTabs;
                        initial.lockMetadata[u] = metaObj;
                    });
                    await setDoc(doc(db, 'global_locks', selectedRoleEmail), initial);
                }
            });

            // Log
            await setDoc(doc(collection(db, 'activity_logs')), {
                action: 'LOCK_ACTION', 
                details: `Locked [${Array.from(selectedUsernames).join(', ')}] tabs: ${lockedTabs.join(',')}`, 
                timestamp: Date.now(), 
                username: ADMIN_EMAIL
            });

            setIsLockModalOpen(false);
            setSelectedUsernames(new Set()); // Reset selection
            setTabSelection({ create: false, booked: false, scanner: false });
        } catch(e) { console.error(e); alert("Update failed"); }
    };

    return (
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 border-t-4 border-t-red-500/50">
           <h2 className="text-lg font-medium text-white mb-2 flex items-center gap-2"><Shield className="w-5 h-5 text-red-500"/> Admin Control Panel</h2>
           <p className="text-xs text-slate-500 mb-6">Select a role to manage staff access.</p>

           <div className="space-y-4">
               {/* Role Selector */}
               <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                   {MANAGED_USERS.map(u => (
                       <button key={u.email} onClick={() => { setSelectedRoleEmail(u.email); setSelectedUsernames(new Set()); }}
                         className={`px-4 py-3 rounded-xl border text-left min-w-[140px] transition-all flex flex-col justify-between h-20 ${selectedRoleEmail === u.email ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black/20 border-white/10 text-slate-400 hover:bg-white/5'}`}>
                           <div className="text-xs font-bold uppercase">{u.role}</div>
                           <div className="text-[10px] truncate opacity-70 w-full">{u.email}</div>
                           {selectedRoleEmail === u.email && <div className="text-[10px] bg-white/20 w-fit px-1.5 rounded self-end">Active</div>}
                       </button>
                   ))}
               </div>

               {/* Detailed Config Area */}
               {selectedRoleEmail && (
                   <div className="bg-black/20 rounded-xl p-5 animate-in fade-in slide-in-from-top-4 border border-white/5">
                       <div className="flex justify-between items-center mb-4">
                           <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Users</h4>
                           <button onClick={toggleSelectAll} className="text-xs text-blue-400 hover:text-blue-300">Select All</button>
                       </div>
                       
                       {/* Username Chips */}
                       <div className="flex flex-wrap gap-2 mb-6">
                           {usernames.length === 0 ? <span className="text-xs text-slate-600 italic">No usernames created yet.</span> : 
                           usernames.map(user => {
                               const isOnline = isUserOnline(user.id);
                               const isSelected = selectedUsernames.has(user.id);
                               return (
                                   <button 
                                        key={user.id} 
                                        onClick={() => toggleUsername(user.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all ${isSelected ? 'bg-blue-500/20 border-blue-500 text-blue-100' : 'bg-white/5 border-white/10 text-slate-400'}`}
                                   >
                                       <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-slate-600'}`}></div>
                                       {user.id}
                                       {isSelected && <CheckCircle className="w-3 h-3 ml-1" />}
                                   </button>
                               );
                           })}
                       </div>

                       {/* Lock Controls */}
                       <div className="border-t border-white/10 pt-4">
                           <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Restrict Access</h4>
                           <div className="flex gap-4 mb-6">
                               {['create', 'booked', 'scanner'].map(tab => (
                                   <label key={tab} className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg border transition-all ${tabSelection[tab] ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'border-transparent text-slate-400 hover:bg-white/5'}`}>
                                       <input 
                                            type="checkbox" 
                                            checked={tabSelection[tab]} 
                                            onChange={e => setTabSelection({...tabSelection, [tab]: e.target.checked})} 
                                            className="rounded bg-slate-800 border-white/20 text-blue-600 focus:ring-0 w-4 h-4" 
                                       />
                                       <span className="capitalize">{tab === 'create' ? 'Issue Ticket' : tab}</span>
                                   </label>
                               ))}
                           </div>
                           
                           <button 
                                onClick={handleTriggerLock}
                                disabled={selectedUsernames.size === 0}
                                className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                                    Object.values(tabSelection).some(x=>x) 
                                    ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20' 
                                    : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                           >
                               {Object.values(tabSelection).some(x=>x) ? <><Lock className="w-4 h-4"/> Sync Locks</> : <><Unlock className="w-4 h-4"/> Unlock Selected</>}
                           </button>
                       </div>
                   </div>
               )}
           </div>

           {/* Secure Lock Modal */}
           {isLockModalOpen && (
               <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
                   <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                       <h3 className="text-lg font-medium text-white mb-1">Confirm Security Action</h3>
                       <p className="text-slate-500 text-sm mb-4">Modifying access for <span className="text-blue-400">{selectedUsernames.size}</span> users.</p>
                       
                       <div className="bg-black/40 p-4 rounded-xl border border-white/5 mb-4 space-y-3">
                           <label className="text-xs uppercase text-slate-500 font-semibold">Lock Reason</label>
                           <div className="flex gap-2">
                               {['basic', 'maintenance', 'suspension'].map(r => (
                                   <button key={r} onClick={() => setLockReason(r)} className={`flex-1 py-2 rounded-lg text-xs capitalize border ${lockReason === r ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/5 text-slate-400'}`}>
                                       {r}
                                   </button>
                               ))}
                           </div>
                           {lockReason === 'maintenance' && (
                               <div className="flex gap-2 pt-2 animate-in slide-in-from-top-2">
                                   <input type="number" placeholder="Hrs" value={maintHours} onChange={e=>setMaintHours(e.target.value)} className="w-1/2 bg-slate-950 border border-white/10 rounded-lg p-2 text-white text-sm" />
                                   <input type="number" placeholder="Mins" value={maintMins} onChange={e=>setMaintMins(e.target.value)} className="w-1/2 bg-slate-950 border border-white/10 rounded-lg p-2 text-white text-sm" />
                               </div>
                           )}
                       </div>

                       <div className="space-y-1 mb-6">
                           <label className="text-xs uppercase text-slate-500 font-semibold">Admin Password</label>
                           <div className="relative">
                               <input 
                                   type={showPassword ? "text" : "password"} 
                                   value={passwordInput} 
                                   onChange={e => setPasswordInput(e.target.value)} 
                                   className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white text-center tracking-widest focus:border-red-500 focus:outline-none" 
                                   placeholder="••••••" 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                </button>
                           </div>
                       </div>

                       <div className="flex gap-3">
                           <button onClick={() => setIsLockModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5">Cancel</button>
                           <button onClick={confirmLockAction} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-500 shadow-lg shadow-red-500/20">Confirm</button>
                       </div>
                   </div>
               </div>
           )}
        </div>
    );
}

// ===========================================
// SUB-COMPONENTS (Helpers)
// ===========================================
function DeleteModal({ isOpen, onClose, onConfirm, count, type }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                <h3 className="text-lg font-medium text-white mb-2">Delete {type}?</h3>
                <p className="text-slate-400 text-sm mb-6">Are you sure you want to delete <span className="text-red-400 font-bold">{count}</span> items? Cannot be undone.</p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5">Cancel</button>
                    <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20">Delete</button>
                </div>
            </div>
        </div>
    );
}

function ImportModal({ close, currentUser }) {
    const handleFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        const extension = file.name.split('.').pop().toLowerCase();
        
        const processData = async (data) => {
            if (confirm(`Import ${data.length} records?`)) {
                const batch = writeBatch(db);
                data.forEach(row => {
                    const ref = doc(collection(db, APP_COLLECTION_ROOT, SHARED_DATA_ID, 'tickets'));
                    batch.set(ref, {
                        name: row.name || row.Name,
                        phone: String(row.phone || row.Phone || ''),
                        ticketType: row.ticketType || row.Type || 'Classic',
                        status: row.status || 'coming-soon',
                        createdAt: Date.now(),
                        createdBy: currentUser.email,
                        age: row.age || '',
                        gender: row.gender || '',
                        scanned: false
                    });
                });
                await batch.commit();
                close();
            }
        };

        if (extension === 'json') {
            reader.onload = async (evt) => processData(JSON.parse(evt.target.result));
            reader.readAsText(file);
        } else if (extension === 'csv') {
            reader.onload = async (evt) => {
                const wb = XLSX.read(evt.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                processData(XLSX.utils.sheet_to_json(ws));
            };
            reader.readAsBinaryString(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
                <h3 className="text-lg font-medium text-white mb-4">Import Guests</h3>
                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center mb-4">
                    <input type="file" accept=".csv,text/csv,application/vnd.ms-excel,.json,application/json" onChange={handleFile} className="hidden" id="fileImport" />
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
  const styles = { 'arrived': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', 'absent': 'bg-red-500/10 text-red-500 border-red-500/20', 'coming-soon': 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
  return <span className={`px-2 py-1 rounded-md text-[10px] font-bold border uppercase inline-block text-center min-w-[100px] ${styles[status] || styles['coming-soon']}`}>{status ? status.replace(/-/g, ' ') : ''}</span>;
}

function TypeBadge({ type }) {
  if (type === 'Diamond') return <span className="px-2 py-1 rounded text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">VIP</span>;
  if (type === 'Gold') return <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">VVIP</span>;
  return <span className="px-2 py-1 rounded text-xs text-slate-400 bg-white/5 border border-white/10">Classic</span>;
}

function ActionBadge({ action }) {
  const colors = { 'LOGIN': 'text-blue-400 bg-blue-400/10 border-blue-400/20', 'TICKET_CREATE': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', 'SCAN_ENTRY': 'text-pink-400 bg-pink-400/10 border-pink-400/20', 'CONFIG_CHANGE': 'text-amber-400 bg-amber-400/10 border-amber-400/20', 'LOCK_ACTION': 'text-red-400 bg-red-400/10 border-red-400/20' };
  return <span className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-wide ${colors[action] || 'text-slate-400 bg-white/5 border-white/10'}`}>{action}</span>;
}

function StatusDot({ action }) {
  const colors = { 'LOGIN': 'bg-blue-500', 'TICKET_CREATE': 'bg-emerald-500', 'SCAN_ENTRY': 'bg-pink-500', 'CONFIG_CHANGE': 'bg-amber-500', 'LOCK_ACTION': 'bg-red-500' };
  return <div className={`w-2 h-2 rounded-full mt-1.5 ${colors[action] || 'bg-slate-500'}`}></div>;
}

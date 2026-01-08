import React, { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { 
  LayoutDashboard, Users, Activity, Settings, MessageSquare, 
  Search, Shield, Ticket, UserCheck, Clock, RefreshCw, Smartphone
} from 'lucide-react';

// --- 1. FIREBASE CONFIG (From your script.js) ---
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

// --- 2. CONSTANTS ---
const APP_COLLECTION_ROOT = 'ticket_events_data';
const SHARED_DATA_ID = 'shared_event_db';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [tickets, setTickets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- 3. DATA FETCHING ---
  useEffect(() => {
    // A. Listen to Tickets
    const ticketsQuery = query(collection(db, APP_COLLECTION_ROOT, SHARED_DATA_ID, 'tickets'));
    const unsubTickets = onSnapshot(ticketsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTickets(data);
    });

    // B. Listen to Logs (Limit 100 for performance)
    const logsQuery = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'));
    const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
      // Just take first 100 client side since we can't easily limit with real-time in this setup without complex queries
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).slice(0, 100);
      setLogs(data);
    });

    // C. Listen to Settings
    const settingsRef = doc(db, APP_COLLECTION_ROOT, SHARED_DATA_ID, 'settings', 'config');
    const unsubSettings = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) setSettings(doc.data());
    });

    setLoading(false);

    return () => {
      unsubTickets();
      unsubLogs();
      unsubSettings();
    };
  }, []);

  // --- 4. DATA PROCESSING FOR CHARTS ---
  const stats = {
    total: tickets.length,
    arrived: tickets.filter(t => t.status === 'arrived').length,
    pending: tickets.filter(t => t.status === 'coming-soon').length,
    vip: tickets.filter(t => t.ticketType === 'Diamond' || t.ticketType === 'Gold').length
  };

  const typeData = [
    { name: 'Classic', value: tickets.filter(t => !t.ticketType || t.ticketType === 'Classic').length },
    { name: 'VIP', value: tickets.filter(t => t.ticketType === 'Diamond').length },
    { name: 'VVIP', value: tickets.filter(t => t.ticketType === 'Gold').length },
  ];

  const statusData = [
    { name: 'Arrived', value: stats.arrived },
    { name: 'Pending', value: stats.pending },
    { name: 'Absent', value: tickets.filter(t => t.status === 'absent').length },
  ];

  // --- 5. RENDER COMPONENTS ---
  
  if (loading) return <div className="h-screen w-full bg-background flex items-center justify-center text-accent">Initializing Dashboard...</div>;

  return (
    <div className="flex h-screen bg-background text-slate-200 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-white/10 bg-surface/50 backdrop-blur-md flex flex-col">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-light tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            Ticketing<span className="font-bold">Cmd</span>.
          </h1>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Online
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavItem icon={Users} label="Guest Database" active={activeTab === 'guests'} onClick={() => setActiveTab('guests')} />
          <NavItem icon={Activity} label="System Logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <NavItem icon={Settings} label="Configuration" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="p-4 border-t border-white/10 text-xs text-slate-600 text-center">
          v2.5 Dashboard Build
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background">
        
        {/* HEADER */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-background/50 sticky top-0 backdrop-blur z-10">
          <h2 className="font-medium text-lg capitalize">{activeTab}</h2>
          <div className="flex items-center gap-4">
             {settings && (
               <div className="px-3 py-1 bg-white/5 rounded-full text-xs border border-white/10">
                 Event: <span className="text-accent">{settings.name}</span>
               </div>
             )}
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent to-purple-600"></div>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* STAT CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Total Guests" value={stats.total} icon={Users} color="text-slate-200" />
                <StatCard title="Checked In" value={stats.arrived} icon={UserCheck} color="text-emerald-500" />
                <StatCard title="Coming Soon" value={stats.pending} icon={Clock} color="text-amber-500" />
                <StatCard title="VIP/VVIP" value={stats.vip} icon={Ticket} color="text-purple-500" />
              </div>

              {/* CHARTS ROW */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-80">
                <div className="bg-surface/40 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-sm font-medium text-slate-400 mb-4">Ticket Type Distribution</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeData}>
                      <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-surface/40 border border-white/5 rounded-2xl p-6 flex flex-col">
                   <h3 className="text-sm font-medium text-slate-400 mb-4">Attendance Status</h3>
                   <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={statusData} 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px' }} />
                    </PieChart>
                   </ResponsiveContainer>
                   <div className="flex justify-center gap-4 text-xs mt-2">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Arrived</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Pending</div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Absent</div>
                   </div>
                </div>
              </div>

              {/* RECENT ACTIVITY LOGS MINI */}
              <div className="bg-surface/40 border border-white/5 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium text-slate-400">Recent System Activity</h3>
                  <button onClick={() => setActiveTab('logs')} className="text-xs text-accent hover:underline">View All</button>
                </div>
                <div className="space-y-3">
                  {logs.slice(0, 5).map(log => (
                    <div key={log.id} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                         <ActionBadge action={log.action} />
                         <span className="text-slate-300">{log.details}</span>
                      </div>
                      <span className="text-slate-500 text-xs">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guests' && (
            <div className="bg-surface/40 border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/5 flex gap-4">
                <div className="relative flex-1">
                   <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                   <input type="text" placeholder="Search guests..." className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-accent" />
                </div>
                <div className="px-4 py-2 bg-black/20 rounded-lg text-sm border border-white/10 text-slate-400">
                  Total: {tickets.length}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="bg-white/5 text-slate-200 uppercase text-xs">
                    <tr>
                      <th className="p-4">Name</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {tickets.map(t => (
                      <tr key={t.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-medium text-white">{t.name}</td>
                        <td className="p-4"><TypeBadge type={t.ticketType} /></td>
                        <td className="p-4">{t.phone}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            t.status === 'arrived' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                            t.status === 'absent' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                            'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-xs opacity-50">{t.id.substring(0,8)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
             <div className="bg-surface/40 border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/5">
                  <h3 className="text-white font-medium">Full Activity History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-white/5 text-slate-200 uppercase text-xs">
                      <tr>
                        <th className="p-4">Time</th>
                        <th className="p-4">User</th>
                        <th className="p-4">Action</th>
                        <th className="p-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {logs.map(log => (
                        <tr key={log.id} className="hover:bg-white/5">
                           <td className="p-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                           <td className="p-4 text-accent">{log.username}</td>
                           <td className="p-4"><ActionBadge action={log.action} /></td>
                           <td className="p-4 max-w-md truncate" title={log.details}>{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
          )}

          {activeTab === 'settings' && settings && (
            <div className="max-w-2xl mx-auto bg-surface/40 border border-white/5 rounded-2xl p-8">
               <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-accent/10 rounded-full text-accent">
                   <Settings className="w-6 h-6" />
                 </div>
                 <div>
                   <h2 className="text-xl font-medium text-white">Event Configuration</h2>
                   <p className="text-sm text-slate-500">Live settings pulled from shared database.</p>
                 </div>
               </div>
               
               <div className="space-y-6">
                 <SettingItem label="Event Name" value={settings.name} />
                 <SettingItem label="Event Venue" value={settings.place} />
                 <SettingItem label="Arrival Deadline" value={settings.deadline ? new Date(settings.deadline).toLocaleString() : 'Not Set'} />
               </div>

               <div className="mt-8 p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <h4 className="text-red-400 text-sm font-medium mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Admin Zone
                  </h4>
                  <p className="text-xs text-red-400/70">
                    Configuration changes must be made via the main application console or direct database access to ensure consistency.
                  </p>
               </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// --- SUB COMPONENTS ---

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
        active ? 'bg-accent text-white font-medium shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="bg-surface/40 border border-white/5 rounded-2xl p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
      <div>
        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-semibold text-white">{value}</p>
      </div>
      <div className={`p-3 rounded-full bg-white/5 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}

function TypeBadge({ type }) {
  if (type === 'Diamond') return <span className="px-2 py-1 rounded text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">VIP</span>;
  if (type === 'Gold') return <span className="px-2 py-1 rounded text-xs font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">VVIP</span>;
  return <span className="px-2 py-1 rounded text-xs text-slate-400 bg-white/5 border border-white/10">Classic</span>;
}

function ActionBadge({ action }) {
  const colors = {
    'LOGIN': 'text-blue-400 bg-blue-400/10',
    'TICKET_CREATE': 'text-emerald-400 bg-emerald-400/10',
    'SCAN_ENTRY': 'text-pink-400 bg-pink-400/10',
    'CONFIG_CHANGE': 'text-amber-400 bg-amber-400/10',
    'FACTORY_RESET': 'text-red-500 bg-red-500/10 border border-red-500/20 font-bold',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-mono tracking-wide ${colors[action] || 'text-slate-400 bg-white/5'}`}>
      {action}
    </span>
  );
}

function SettingItem({ label, value }) {
  return (
    <div className="flex flex-col gap-1 pb-4 border-b border-white/5 last:border-0">
      <span className="text-xs text-slate-500 uppercase">{label}</span>
      <span className="text-slate-200 font-medium">{value}</span>
    </div>
  );
}

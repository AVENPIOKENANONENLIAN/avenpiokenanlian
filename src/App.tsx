import React, { useState, useEffect } from 'react';
import { 
  Droplets, 
  Plus, 
  History, 
  Settings as SettingsIcon, 
  BarChart3, 
  ChevronLeft,
  Activity,
  Weight,
  User,
  Bell,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { format, subDays, parseISO, isSameDay } from 'date-fns';
import { UserProfile, WaterLog, DailyStat } from './types';

// --- Components ---

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-3xl shadow-sm border border-slate-100 p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = "",
  disabled = false
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost',
  className?: string,
  disabled?: boolean
}) => {
  const variants = {
    primary: 'bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-200',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    outline: 'border-2 border-sky-500 text-sky-600 hover:bg-sky-50',
    ghost: 'text-slate-500 hover:bg-slate-100'
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 rounded-2xl font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

// --- Main App ---

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [view, setView] = useState<'dashboard' | 'stats' | 'settings' | 'onboarding'>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [profileRes, logsRes, statsRes] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/logs/today'),
        fetch('/api/stats')
      ]);
      
      const profileData = await profileRes.json();
      const logsData = await logsRes.json();
      const statsData = await statsRes.json();

      setProfile(profileData);
      setLogs(logsData);
      setStats(statsData);
      
      if (!profileData) {
        setView('onboarding');
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setLoading(false);
    }
  };

  const addWater = async (amount: number) => {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      fetchInitialData();
    } catch (error) {
      console.error("Failed to add water", error);
    }
  };

  const deleteLog = async (id: number) => {
    try {
      await fetch(`/api/logs/${id}`, { method: 'DELETE' });
      fetchInitialData();
    } catch (error) {
      console.error("Failed to delete log", error);
    }
  };

  const saveProfile = async (newProfile: Partial<UserProfile>) => {
    try {
      // Calculate target if not provided
      // Basic formula: weight (kg) * 35ml
      // Adjust for activity: low (0), moderate (+500), high (+1000)
      const weight = newProfile.weight || 70;
      const activity = newProfile.activity_level || 'low';
      let target = weight * 35;
      if (activity === 'moderate') target += 500;
      if (activity === 'high') target += 1000;

      const finalProfile = {
        ...newProfile,
        daily_target: target
      } as UserProfile;

      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalProfile)
      });
      
      setProfile(finalProfile);
      setView('dashboard');
    } catch (error) {
      console.error("Failed to save profile", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sky-50">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Droplets className="w-12 h-12 text-sky-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      <AnimatePresence mode="wait">
        {view === 'onboarding' && (
          <Onboarding key="onboarding" onComplete={saveProfile} />
        )}

        {view === 'dashboard' && profile && (
          <Dashboard 
            key="dashboard"
            profile={profile} 
            logs={logs} 
            onAdd={addWater}
            onNavigate={(v) => setView(v)}
          />
        )}

        {view === 'stats' && (
          <StatsView 
            key="stats"
            stats={stats} 
            logs={logs}
            onBack={() => setView('dashboard')} 
            onDeleteLog={deleteLog}
          />
        )}

        {view === 'settings' && profile && (
          <SettingsView 
            key="settings"
            profile={profile} 
            onSave={saveProfile}
            onBack={() => setView('dashboard')} 
          />
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      {view !== 'onboarding' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-[calc(448px-3rem)] bg-white/80 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl flex justify-around p-3 z-50">
          <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<Droplets />} label="Home" />
          <NavButton active={view === 'stats'} onClick={() => setView('stats')} icon={<BarChart3 />} label="Stats" />
          <NavButton active={view === 'settings'} onClick={() => setView('settings')} icon={<SettingsIcon />} label="Settings" />
        </div>
      )}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-sky-500 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
    >
      {React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: active ? 2.5 : 2 })}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

// --- View Components ---

function Onboarding({ onComplete }: { onComplete: (p: any) => void, key?: string }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    age: 25,
    weight: 70,
    activity_level: 'moderate'
  });

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-8 flex flex-col h-screen justify-center gap-8"
    >
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">HIDRO<span className="text-sky-500">REMIND</span></h1>
        <p className="text-slate-500">Let's personalize your hydration journey.</p>
      </div>

      <Card className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
              <User size={16} /> How old are you?
            </label>
            <input 
              type="number" 
              value={data.age}
              onChange={(e) => setData({ ...data, age: parseInt(e.target.value) })}
              className="w-full text-4xl font-bold bg-transparent border-b-2 border-slate-100 focus:border-sky-500 outline-none pb-2"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
              <Weight size={16} /> Your weight (kg)
            </label>
            <input 
              type="number" 
              value={data.weight}
              onChange={(e) => setData({ ...data, weight: parseFloat(e.target.value) })}
              className="w-full text-4xl font-bold bg-transparent border-b-2 border-slate-100 focus:border-sky-500 outline-none pb-2"
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
              <Activity size={16} /> Activity Level
            </label>
            <div className="grid grid-cols-1 gap-3">
              {['low', 'moderate', 'high'].map((level) => (
                <button
                  key={level}
                  onClick={() => setData({ ...data, activity_level: level as any })}
                  className={`p-4 rounded-2xl border-2 transition-all text-left capitalize font-semibold ${data.activity_level === level ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-100 text-slate-500'}`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep(step - 1)} className="flex-1">Back</Button>
          )}
          <Button 
            onClick={() => step < 3 ? setStep(step + 1) : onComplete(data)} 
            className="flex-1"
          >
            {step < 3 ? 'Next' : 'Get Started'}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

function Dashboard({ profile, logs, onAdd, onNavigate }: { profile: UserProfile, logs: WaterLog[], onAdd: (a: number) => void, onNavigate: (v: any) => void, key?: string }) {
  const totalDrank = logs.reduce((acc, log) => acc + log.amount, 0);
  const percentage = Math.min(Math.round((totalDrank / profile.daily_target) * 100), 100);
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-8 pb-32"
    >
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Today</h2>
          <h1 className="text-2xl font-bold text-slate-900">{format(new Date(), 'EEEE, d MMM')}</h1>
        </div>
        <button onClick={() => onNavigate('settings')} className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400">
          <User size={20} />
        </button>
      </header>

      {/* Progress Circle */}
      <div className="relative flex justify-center py-8">
        <div className="w-64 h-64 rounded-full border-[12px] border-slate-100 relative flex items-center justify-center overflow-hidden">
          {/* Water Fill Effect */}
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: `${percentage}%` }}
            className="absolute bottom-0 left-0 right-0 water-wave"
          />
          
          <div className="relative z-10 text-center">
            <span className={`text-6xl font-black ${percentage > 50 ? 'text-white' : 'text-slate-900'}`}>{percentage}%</span>
            <p className={`text-sm font-bold uppercase tracking-widest ${percentage > 50 ? 'text-white/80' : 'text-slate-400'}`}>Hydrated</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col items-center justify-center gap-2">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Goal</span>
          <span className="text-2xl font-bold text-slate-900">{profile.daily_target} ml</span>
        </Card>
        <Card className="flex flex-col items-center justify-center gap-2">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Drank</span>
          <span className="text-2xl font-bold text-sky-500">{totalDrank} ml</span>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Quick Add</h3>
        <div className="grid grid-cols-3 gap-3">
          {[250, 500, 750].map((amount) => (
            <button
              key={amount}
              onClick={() => onAdd(amount)}
              className="bg-white border border-slate-100 p-4 rounded-2xl flex flex-col items-center gap-2 hover:border-sky-200 hover:bg-sky-50 transition-all active:scale-95 group"
            >
              <Droplets className="text-sky-400 group-hover:text-sky-500" size={24} />
              <span className="font-bold text-slate-700">{amount}ml</span>
            </button>
          ))}
        </div>
      </div>

      <Card className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
            <Bell size={24} />
          </div>
          <div>
            <p className="font-bold text-slate-900">Smart Reminder</p>
            <p className="text-xs text-slate-500">Next reminder in {profile.reminder_interval} min</p>
          </div>
        </div>
        <div className="w-12 h-6 bg-sky-500 rounded-full relative">
           <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
        </div>
      </Card>
    </motion.div>
  );
}

function StatsView({ stats, logs, onBack, onDeleteLog }: { stats: DailyStat[], logs: WaterLog[], onBack: () => void, onDeleteLog: (id: number) => void, key?: string }) {
  const chartData = [...stats].reverse().map(s => ({
    ...s,
    date: format(parseISO(s.date), 'dd/MM')
  }));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-8 pb-32"
    >
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ChevronLeft /></button>
        <h1 className="text-2xl font-bold text-slate-900">Statistics</h1>
      </header>

      <Card className="h-64 p-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Last 30 Days</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip 
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Area type="monotone" dataKey="total" stroke="#38bdf8" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Today's History</h3>
        <div className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-center text-slate-400 py-8 italic">No water logged yet today.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-500">
                    <Droplets size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{log.amount} ml</p>
                    <p className="text-xs text-slate-500">{format(new Date(log.timestamp), 'HH:mm')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => onDeleteLog(log.id)}
                  className="p-2 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SettingsView({ profile, onSave, onBack }: { profile: UserProfile, onSave: (p: any) => void, onBack: () => void, key?: string }) {
  const [formData, setFormData] = useState(profile);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-8 pb-32"
    >
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400"><ChevronLeft /></button>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      </header>

      <div className="space-y-6">
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Personal Profile</h3>
          <Card className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Age</span>
              <input 
                type="number" 
                value={formData.age} 
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                className="w-16 text-right font-bold text-sky-600 outline-none"
              />
            </div>
            <div className="h-px bg-slate-50" />
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Weight (kg)</span>
              <input 
                type="number" 
                value={formData.weight} 
                onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                className="w-16 text-right font-bold text-sky-600 outline-none"
              />
            </div>
            <div className="h-px bg-slate-50" />
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Activity</span>
              <select 
                value={formData.activity_level}
                onChange={(e) => setFormData({ ...formData, activity_level: e.target.value as any })}
                className="font-bold text-sky-600 outline-none bg-transparent"
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Reminders</h3>
          <Card className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Enable Reminders</span>
              <button 
                onClick={() => setFormData({ ...formData, reminder_enabled: !formData.reminder_enabled })}
                className={`w-12 h-6 rounded-full transition-colors relative ${formData.reminder_enabled ? 'bg-sky-500' : 'bg-slate-200'}`}
              >
                <motion.div 
                  animate={{ x: formData.reminder_enabled ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>
            <div className="h-px bg-slate-50" />
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-medium">Interval (minutes)</span>
              <input 
                type="number" 
                value={formData.reminder_interval} 
                onChange={(e) => setFormData({ ...formData, reminder_interval: parseInt(e.target.value) })}
                className="w-16 text-right font-bold text-sky-600 outline-none"
              />
            </div>
          </Card>
        </section>

        <Button onClick={() => onSave(formData)} className="w-full">Save Changes</Button>
      </div>
    </motion.div>
  );
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Badge, Avatar } from '@/components/ui'
import {
  LayoutGrid, Users, DollarSign, TrendingUp, Tag, Bell, Settings,
  AlertTriangle, ChevronRight, Download, Plus, Search
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'

type AdminPage = 'overview' | 'members' | 'revenue' | 'leaderboard' | 'pricing' | 'announce' | 'settings'

const revenueData = [
  { day: 'Lun', value: 3000 },
  { day: 'Mar', value: 4500 },
  { day: 'Mer', value: 5200 },
  { day: 'Jeu', value: 4000 },
  { day: 'Ven', value: 6500 },
  { day: 'Sam', value: 5000 },
  { day: 'Dim', value: 7200 },
]

const mockMembers = [
  { name: 'Karim Bencherif', initials: 'KB', plan: 'Trimestriel', expiry: '15 juin 2026', streak: 62, status: 'active' },
  { name: 'Sara Boudiaf', initials: 'SB', plan: 'Trimestriel', expiry: '10 mai 2026', streak: 45, status: 'active' },
  { name: 'Yasmine Khelifi', initials: 'YK', plan: 'Mensuel', expiry: '24 avr 2026', streak: 12, status: 'active' },
  { name: 'Lyes Hamidouche', initials: 'LH', plan: 'Mensuel', expiry: '01 avr 2026', streak: 0, status: 'inactive' },
  { name: 'Nadia Bouzid', initials: 'NB', plan: 'Hebdomadaire', expiry: '28 mars 2026', streak: 5, status: 'expiring' },
  { name: 'Ryad Kaci', initials: 'RK', plan: 'Mensuel', expiry: '05 avr 2026', streak: 8, status: 'active' },
]

const mockPricing = [
  { id: 'pr-1', name: 'Journalier', desc: 'Accès 1 jour', price: 10 },
  { id: 'pr-2', name: 'Hebdomadaire', desc: '7 jours consécutifs', price: 50 },
  { id: 'pr-3', name: '2 Semaines', desc: '14 jours · Le plus populaire', price: 90 },
  { id: 'pr-4', name: 'Mensuel', desc: '30 jours', price: 160 },
]

const mockAnnouncements = [
  { id: 1, title: 'Maintenance réseau samedi matin', body: 'Le réseau Wifi sera coupé de 8h à 10h samedi 28 mars.', date: '22 mars 2026', pinned: true },
  { id: 2, title: 'Nouvel espace rooftop ouvert ! 🎉', body: 'Le rooftop est maintenant disponible pour les événements.', date: '20 mars 2026', pinned: false },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [activePage, setActivePage] = useState<AdminPage>('overview')
  const [prices, setPrices] = useState(mockPricing)
  const [changedPrices, setChangedPrices] = useState<Set<string>>(new Set())
  const [announcements, setAnnouncements] = useState(mockAnnouncements)
  const [newAnnTitle, setNewAnnTitle] = useState('')
  const [newAnnBody, setNewAnnBody] = useState('')
  const [newAnnPinned, setNewAnnPinned] = useState(false)
  const [rewardText, setRewardText] = useState('🎁 Récompense : 1 mois gratuit + Badge Champion')

  const navItems = [
    { id: 'overview' as const, label: 'Vue Globale', icon: LayoutGrid },
    { id: 'members' as const, label: 'Membres', icon: Users, badge: '1 284' },
    { id: 'revenue' as const, label: 'Revenus', icon: DollarSign },
    { id: 'leaderboard' as const, label: 'Classement', icon: TrendingUp },
    { id: 'pricing' as const, label: 'Tarifs', icon: Tag },
    { id: 'announce' as const, label: 'Annonces', icon: Bell, badgeDanger: '2' },
    { id: 'settings' as const, label: 'Paramètres', icon: Settings },
  ]

  const handlePriceChange = (id: string, value: number) => {
    setPrices(prices.map(p => p.id === id ? { ...p, price: value } : p))
    setChangedPrices(new Set([...changedPrices, id]))
  }

  const savePrices = () => {
    setChangedPrices(new Set())
    alert('Tarifs sauvegardés !')
  }

  const createAnnouncement = () => {
    if (!newAnnTitle || !newAnnBody) return
    setAnnouncements([
      { id: Date.now(), title: newAnnTitle, body: newAnnBody, date: 'Maintenant', pinned: newAnnPinned },
      ...announcements
    ])
    setNewAnnTitle('')
    setNewAnnBody('')
    setNewAnnPinned(false)
  }

  const deleteAnnouncement = (id: number) => {
    setAnnouncements(announcements.filter(a => a.id !== id))
  }

  return (
    <div className="min-h-screen flex bg-bg overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-surface border-r border-border flex flex-col">
        <div className="p-5 border-b border-border">
          <div className="font-handwriting text-[1.4rem] font-bold text-teal">CoSpace</div>
          <div className="text-[0.65rem] text-muted mt-1">Admin Panel</div>
        </div>
        
        <nav className="flex-1 py-3 overflow-y-auto">
          <div className="px-5 py-3.5 text-[0.58rem] font-bold tracking-[0.18em] uppercase text-white/20">
            Dashboard
          </div>
          {navItems.slice(0, 3).map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-2.5 px-5 py-2.5 text-[0.82rem] font-medium transition-all border-none bg-transparent cursor-pointer text-left font-sans ${
                activePage === item.id ? 'text-teal bg-teal/[0.08]' : 'text-muted hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <item.icon size={16} />
              {item.label}
              {item.badge && (
                <span className="ml-auto bg-teal text-black text-[0.55rem] font-extrabold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
          
          <div className="px-5 py-3.5 text-[0.58rem] font-bold tracking-[0.18em] uppercase text-white/20 mt-2">
            Contenu
          </div>
          {navItems.slice(3, 6).map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-2.5 px-5 py-2.5 text-[0.82rem] font-medium transition-all border-none bg-transparent cursor-pointer text-left font-sans ${
                activePage === item.id ? 'text-teal bg-teal/[0.08]' : 'text-muted hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <item.icon size={16} />
              {item.label}
              {item.badgeDanger && (
                <span className="ml-auto bg-danger text-white text-[0.55rem] font-extrabold px-1.5 py-0.5 rounded-full">
                  {item.badgeDanger}
                </span>
              )}
            </button>
          ))}
          
          <div className="px-5 py-3.5 text-[0.58rem] font-bold tracking-[0.18em] uppercase text-white/20 mt-2">
            Système
          </div>
          {navItems.slice(6).map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-2.5 px-5 py-2.5 text-[0.82rem] font-medium transition-all border-none bg-transparent cursor-pointer text-left font-sans ${
                activePage === item.id ? 'text-teal bg-teal/[0.08]' : 'text-muted hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-5 border-t border-border">
          <Button variant="ghost" fullWidth size="sm" onClick={() => router.push('/')}>
            ← Quitter
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Overview Page */}
        {activePage === 'overview' && (
          <div className="p-9 animate-fade-up">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h1 className="font-display text-[2.4rem] tracking-[0.06em]">Vue Globale</h1>
                <p className="text-[0.75rem] text-muted mt-0.5">Mardi 24 mars 2026 · Temps réel</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download size={14} /> Exporter CSV
                </Button>
                <Button variant="teal" size="sm">
                  <Plus size={14} /> Nouveau membre
                </Button>
              </div>
            </div>

            {/* Churn Alert */}
            <div className="bg-danger/[0.08] border border-danger/25 rounded-[14px] p-4 flex items-center gap-3 mb-5 text-[0.82rem] text-[#ff8080]">
              <AlertTriangle size={20} />
              <div><strong>7 membres inactifs</strong> depuis plus de 7 jours — risque de churn détecté.</div>
              <Button variant="danger" size="sm" className="ml-auto">Voir</Button>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { icon: '💰', label: 'Revenus ce mois', value: '4 820 TND', delta: '↑ +12%', color: 'teal' },
                { icon: '👥', label: 'Membres actifs', value: '1 284', delta: '↑ +8.2%', color: 'lime' },
                { icon: '✅', label: 'Check-ins aujourd\'hui', value: '47', delta: '↑ vs 38', color: 'yellow-bright' },
                { icon: '🔄', label: 'Rétention mensuelle', value: '84%', delta: 'Objectif : 85%', color: 'olive' },
              ].map((kpi, i) => (
                <div key={i} className="bg-surface border border-border rounded-2xl p-5 relative overflow-hidden hover:border-teal/25 transition-colors">
                  <div className={`absolute top-0 left-0 right-0 h-0.5 bg-${kpi.color}`} />
                  <div className="text-[1.4rem] mb-2.5">{kpi.icon}</div>
                  <div className="text-[0.62rem] tracking-[0.12em] uppercase text-muted mb-1.5">{kpi.label}</div>
                  <div className={`font-display text-[2.2rem] leading-none tracking-[0.03em] text-${kpi.color}`}>{kpi.value}</div>
                  <div className="text-[0.65rem] text-muted mt-1.5">
                    <span className="text-success">{kpi.delta.split(' ')[0]}</span> {kpi.delta.split(' ').slice(1).join(' ')}
                  </div>
                </div>
              ))}
            </div>

            {/* Revenue Chart */}
            <div className="bg-surface border border-border rounded-2xl p-6 mb-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display text-[1.2rem] tracking-[0.06em]">Revenus — Évolution</h3>
                <div className="flex gap-1.5">
                  {['7j', '30j', '90j'].map((period, i) => (
                    <button
                      key={period}
                      className={`px-3 py-1.5 rounded-lg text-[0.68rem] font-bold cursor-pointer transition-all border ${
                        i === 0 ? 'bg-teal/15 text-teal border-teal/30' : 'bg-surface2 text-muted border-border'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5bbfb5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#5bbfb5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#141414', border: '1px solid rgba(91,191,181,0.2)', borderRadius: 8 }}
                    labelStyle={{ color: '#f2ede8' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#5bbfb5" strokeWidth={2.5} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-5">
              {/* Recent Members */}
              <div className="bg-surface border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display text-[1.2rem] tracking-[0.06em]">Membres Récents</h3>
                  <Badge variant="teal">5 nouveaux</Badge>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[0.62rem] font-bold tracking-[0.12em] uppercase text-muted border-b border-border">
                      <th className="pb-2.5">Membre</th>
                      <th className="pb-2.5">Plan</th>
                      <th className="pb-2.5">Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockMembers.slice(0, 4).map((m, i) => (
                      <tr key={i} className="border-b border-teal/5 last:border-none hover:bg-white/[0.02]">
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={m.name} size="sm" />
                            <span className="text-[0.82rem]">{m.name.split(' ')[0]} {m.name.split(' ')[1]?.[0]}.</span>
                          </div>
                        </td>
                        <td><Badge variant={m.plan === 'Trimestriel' ? 'lime' : 'teal'}>{m.plan}</Badge></td>
                        <td className="text-[0.82rem]">{m.streak > 0 ? `🔥 ${m.streak}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Quick Actions */}
              <div className="bg-surface border border-border rounded-2xl p-6">
                <h3 className="font-display text-[1.2rem] tracking-[0.06em] mb-5">Actions Rapides</h3>
                <div className="flex flex-col gap-2.5">
                  <Button variant="teal" fullWidth onClick={() => setActivePage('announce')}>📢 Créer une annonce</Button>
                  <Button variant="outline" fullWidth onClick={() => setActivePage('members')}>👥 Gérer les membres</Button>
                  <Button variant="outline" fullWidth onClick={() => setActivePage('pricing')}>💰 Modifier les tarifs</Button>
                  <Button variant="ghost" fullWidth onClick={() => setActivePage('settings')}>⚙️ Paramètres</Button>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-[0.62rem] tracking-[0.12em] uppercase text-muted mb-2.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-glow" />
                    Activité temps réel
                  </div>
                  <div className="text-[0.75rem] text-muted flex flex-col gap-2">
                    <div>✅ <strong className="text-white">Yasmine K.</strong> — check-in · 14:32</div>
                    <div>🆕 <strong className="text-white">Nouveau membre</strong> — inscription · 13:55</div>
                    <div>💳 <strong className="text-white">Sara B.</strong> — renouvellement · 12:10</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Members Page */}
        {activePage === 'members' && (
          <div className="p-9 animate-fade-up">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h1 className="font-display text-[2.4rem] tracking-[0.06em]">Membres</h1>
                <p className="text-[0.75rem] text-muted mt-0.5">1 284 membres enregistrés</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm"><Download size={14} /> Exporter CSV</Button>
                <Button variant="teal" size="sm"><Plus size={14} /> Ajouter</Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-5">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className="w-full bg-surface2 border border-border text-white py-3 pl-11 pr-4 rounded-[10px] text-[0.9rem] outline-none focus:border-teal"
                  placeholder="Rechercher un membre..."
                />
              </div>
              <select className="bg-surface2 border border-border text-white py-3 px-4 rounded-[10px] text-[0.9rem] outline-none w-40">
                <option>Tous les plans</option>
                <option>Mensuel</option>
                <option>Trimestriel</option>
                <option>Hebdomadaire</option>
              </select>
              <select className="bg-surface2 border border-border text-white py-3 px-4 rounded-[10px] text-[0.9rem] outline-none w-36">
                <option>Tous statuts</option>
                <option>Actif</option>
                <option>Expiré</option>
                <option>Inactif 7j</option>
              </select>
            </div>

            {/* Table */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[0.62rem] font-bold tracking-[0.12em] uppercase text-muted border-b border-border">
                    <th className="p-3.5">Membre</th>
                    <th className="p-3.5">Plan</th>
                    <th className="p-3.5">Expiration</th>
                    <th className="p-3.5">Streak</th>
                    <th className="p-3.5">Statut</th>
                    <th className="p-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockMembers.map((m, i) => (
                    <tr key={i} className="border-b border-teal/5 last:border-none hover:bg-white/[0.02]">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={m.name} size="sm" />
                          <span className="text-[0.82rem]">{m.name}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-[0.82rem]">{m.plan}</td>
                      <td className="p-3.5 text-[0.82rem]">{m.expiry}</td>
                      <td className="p-3.5 text-[0.82rem]">{m.streak > 0 ? `🔥 ${m.streak}` : '0'}</td>
                      <td className="p-3.5">
                        <Badge variant={m.status === 'active' ? 'teal' : m.status === 'expiring' ? 'warn' : 'danger'}>
                          {m.status === 'active' ? 'Actif' : m.status === 'expiring' ? 'Expire bientôt' : 'Inactif'}
                        </Badge>
                      </td>
                      <td className="p-3.5">
                        <Button variant="ghost" size="sm">Voir</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Revenue Page */}
        {activePage === 'revenue' && (
          <div className="p-9 animate-fade-up">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h1 className="font-display text-[2.4rem] tracking-[0.06em]">Revenus</h1>
                <p className="text-[0.75rem] text-muted mt-0.5">Mars 2026</p>
              </div>
              <Button variant="ghost" size="sm"><Download size={14} /> Exporter CSV</Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Ce mois', value: '4 820 TND', delta: '↑ +12%', color: 'teal' },
                { label: 'Projection', value: '5 200 TND', delta: 'Estimé fin de mois', color: 'lime' },
                { label: 'Transactions', value: '184', delta: 'Ce mois', color: 'yellow-bright' },
              ].map((kpi, i) => (
                <div key={i} className="bg-surface border border-border rounded-2xl p-5">
                  <div className="text-[0.62rem] tracking-[0.12em] uppercase text-muted mb-1.5">{kpi.label}</div>
                  <div className={`font-display text-[2.2rem] leading-none text-${kpi.color}`}>{kpi.value}</div>
                  <div className="text-[0.65rem] text-muted mt-1.5"><span className="text-success">{kpi.delta}</span></div>
                </div>
              ))}
            </div>

            {/* Bar Chart */}
            <div className="bg-surface border border-border rounded-2xl p-6 mb-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display text-[1.2rem] tracking-[0.06em]">Revenus Journaliers</h3>
                <div className="flex gap-1.5">
                  {['7j', '30j'].map((period, i) => (
                    <button
                      key={period}
                      className={`px-3 py-1.5 rounded-lg text-[0.68rem] font-bold cursor-pointer transition-all border ${
                        i === 0 ? 'bg-teal/15 text-teal border-teal/30' : 'bg-surface2 text-muted border-border'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={revenueData}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#141414', border: '1px solid rgba(91,191,181,0.2)', borderRadius: 8 }}
                    labelStyle={{ color: '#f2ede8' }}
                  />
                  <Bar dataKey="value" fill="#5bbfb5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Transactions Table */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border font-display text-[1.1rem] tracking-[0.06em]">Transactions Récentes</div>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[0.62rem] font-bold tracking-[0.12em] uppercase text-muted border-b border-border">
                    <th className="p-3.5">Membre</th>
                    <th className="p-3.5">Formule</th>
                    <th className="p-3.5">Montant</th>
                    <th className="p-3.5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Karim B.', initials: 'KB', plan: 'Mensuel', amount: '160 TND', date: '24 mars' },
                    { name: 'Yasmine K.', initials: 'YK', plan: '2 Semaines', amount: '90 TND', date: '24 mars' },
                    { name: 'Nadia B.', initials: 'NB', plan: 'Hebdomadaire', amount: '50 TND', date: '21 mars' },
                    { name: 'Ryad K.', initials: 'RK', plan: 'Mensuel', amount: '160 TND', date: '20 mars' },
                  ].map((t, i) => (
                    <tr key={i} className="border-b border-teal/5 last:border-none hover:bg-white/[0.02]">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={t.name} size="sm" />
                          <span className="text-[0.82rem]">{t.name}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-[0.82rem]">{t.plan}</td>
                      <td className="p-3.5 text-[0.82rem] text-teal font-bold">{t.amount}</td>
                      <td className="p-3.5 text-[0.82rem] text-muted">{t.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Leaderboard Page */}
        {activePage === 'leaderboard' && (
          <div className="p-9 animate-fade-up">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h1 className="font-display text-[2.4rem] tracking-[0.06em]">Classement</h1>
                <p className="text-[0.75rem] text-muted mt-0.5">Configuration du champion</p>
              </div>
            </div>

            {/* Reward Config */}
            <div className="bg-surface border border-border rounded-2xl p-6 mb-5">
              <h3 className="font-display text-[1.2rem] tracking-[0.06em] mb-4">Texte de Récompense Champion</h3>
              <p className="text-[0.78rem] text-muted mb-3">Ce texte s&apos;affiche instantanément sur la carte Champion de tous les clients.</p>
              <Input
                label="Message"
                value={rewardText}
                onChange={(e) => setRewardText(e.target.value)}
              />
              <Button variant="teal" className="mt-4">Sauvegarder</Button>
            </div>

            {/* Top 10 Table */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border font-display text-[1.1rem] tracking-[0.06em]">Top 10 Streaks</div>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[0.62rem] font-bold tracking-[0.12em] uppercase text-muted border-b border-border">
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">Membre</th>
                    <th className="p-3.5">Streak</th>
                    <th className="p-3.5">Check-in today</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { rank: 1, name: 'Karim Bencherif', initials: 'KB', streak: 62, today: true },
                    { rank: 2, name: 'Sara Boudiaf', initials: 'SB', streak: 45, today: true },
                    { rank: 3, name: 'Amine Merzouk', initials: 'AM', streak: 38, today: false },
                    { rank: 4, name: 'Yasmine K.', initials: 'YK', streak: 12, today: true },
                    { rank: 5, name: 'Leila Benali', initials: 'LB', streak: 10, today: true },
                  ].map((u, i) => (
                    <tr key={i} className={`border-b border-teal/5 last:border-none hover:bg-white/[0.02] ${u.rank === 1 ? 'bg-gold/[0.04]' : ''}`}>
                      <td className={`p-3.5 font-extrabold ${u.rank === 1 ? 'text-gold' : u.rank === 2 ? 'text-silver' : u.rank === 3 ? 'text-bronze' : 'text-muted'}`}>
                        {u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : u.rank === 3 ? '🥉' : ''} {u.rank}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.name} size="sm" gradient={u.rank === 1 ? 'gold' : 'teal'} />
                          <span className="text-[0.82rem]">{u.name}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-[0.82rem]">{u.rank <= 2 && <span className="animate-flame">🔥</span>} {u.streak}j</td>
                      <td className="p-3.5 text-[0.82rem]">{u.today ? <span className="text-success">✓ Oui</span> : <span className="text-muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pricing Page */}
        {activePage === 'pricing' && (
          <div className="p-9 animate-fade-up">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h1 className="font-display text-[2.4rem] tracking-[0.06em]">Tarifs</h1>
                <p className="text-[0.75rem] text-muted mt-0.5">Modification en temps réel · Supabase sync</p>
              </div>
              <Button variant="teal" onClick={savePrices}>💾 Sauvegarder tout</Button>
            </div>

            {/* Price Rows */}
            <div className="mb-6">
              {prices.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-4 bg-surface rounded-[14px] mb-2.5 border-2 transition-colors ${
                    changedPrices.has(p.id) ? 'border-yellow-bright bg-yellow-bright/5' : 'border-transparent'
                  }`}
                >
                  <div>
                    <div className="font-bold">{p.name}</div>
                    <div className="text-[0.72rem] text-muted">{p.desc}</div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="number"
                      value={p.price}
                      onChange={(e) => handlePriceChange(p.id, Number(e.target.value))}
                      className="bg-surface2 border border-border text-white py-2 px-3 rounded-lg font-bold text-[0.9rem] w-28 text-right outline-none focus:border-yellow-bright"
                    />
                    <span className="text-muted">TND</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Audit Log */}
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="font-display text-[1.2rem] tracking-[0.06em] mb-4">Audit Log (5 derniers changements)</h3>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[0.62rem] font-bold tracking-[0.12em] uppercase text-muted border-b border-border">
                    <th className="pb-2.5">Formule</th>
                    <th className="pb-2.5">Avant</th>
                    <th className="pb-2.5">Après</th>
                    <th className="pb-2.5">Admin</th>
                    <th className="pb-2.5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { plan: 'Mensuel', before: '150', after: '160 TND', admin: 'Admin', date: '20 mars' },
                    { plan: '2 Semaines', before: '80', after: '90 TND', admin: 'Admin', date: '15 mars' },
                    { plan: 'Journalier', before: '8', after: '10 TND', admin: 'Admin', date: '01 mars' },
                  ].map((a, i) => (
                    <tr key={i} className="border-b border-teal/5 last:border-none">
                      <td className="py-3 text-[0.82rem]">{a.plan}</td>
                      <td className="py-3 text-[0.82rem] text-muted">{a.before}</td>
                      <td className="py-3 text-[0.82rem] text-lime font-bold">{a.after}</td>
                      <td className="py-3 text-[0.82rem]">{a.admin}</td>
                      <td className="py-3 text-[0.82rem] text-muted">{a.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Announcements Page */}
        {activePage === 'announce' && (
          <div className="p-9 animate-fade-up">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h1 className="font-display text-[2.4rem] tracking-[0.06em]">Annonces</h1>
                <p className="text-[0.75rem] text-muted mt-0.5">Visible sur l&apos;accueil client</p>
              </div>
            </div>

            {/* Create Form */}
            <div className="bg-surface border border-border rounded-2xl p-6 mb-5">
              <h3 className="font-display text-[1.2rem] tracking-[0.06em] mb-4">Nouvelle Annonce</h3>
              <div className="flex flex-col gap-3">
                <Input
                  label="Titre"
                  placeholder="Titre de l'annonce"
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.72rem] font-semibold tracking-[0.08em] uppercase text-muted">Contenu</label>
                  <textarea
                    className="bg-surface2 border border-border text-white py-3 px-4 rounded-[10px] text-[0.85rem] outline-none resize-y min-h-[80px] focus:border-teal"
                    placeholder="Message visible par tous les membres..."
                    value={newAnnBody}
                    onChange={(e) => setNewAnnBody(e.target.value)}
                  />
                </div>
                <div className="flex gap-2.5 items-center">
                  <label className="flex items-center gap-2 text-[0.82rem] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAnnPinned}
                      onChange={(e) => setNewAnnPinned(e.target.checked)}
                      className="accent-teal"
                    />
                    Épingler
                  </label>
                  <Button variant="teal" className="ml-auto" onClick={createAnnouncement}>Publier</Button>
                </div>
              </div>
            </div>

            {/* Existing Announcements */}
            {announcements.map((ann) => (
              <div key={ann.id} className="bg-surface border border-border rounded-[14px] p-4 mb-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-[0.85rem] mb-1">{ann.title}</div>
                    <div className="text-[0.78rem] text-muted">{ann.body}</div>
                    <div className="text-[0.65rem] text-white/20 mt-2">{ann.date}</div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {ann.pinned && <Badge variant="teal">📌 Épinglé</Badge>}
                    <Button variant="danger" size="sm" onClick={() => deleteAnnouncement(ann.id)}>Supprimer</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings Page */}
        {activePage === 'settings' && (
          <div className="p-9 animate-fade-up">
            <div className="flex items-center justify-between mb-7">
              <div>
                <h1 className="font-display text-[2.4rem] tracking-[0.06em]">Paramètres</h1>
                <p className="text-[0.75rem] text-muted mt-0.5">Configuration globale CoSpace</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {/* Security */}
              <div>
                <div className="mb-7">
                  <h3 className="font-display text-[1.2rem] tracking-[0.08em] text-muted mb-3.5">Sécurité Admin</h3>
                  <div className="flex flex-col gap-3">
                    <Input label="Code secret actuel" type="password" placeholder="••••••••" />
                    <Input label="Nouveau code secret" type="password" placeholder="Nouveau code" />
                    <Input label="Confirmer" type="password" placeholder="Confirmer" />
                    <Button variant="teal">Changer le code</Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-display text-[1.2rem] tracking-[0.08em] text-muted mb-3.5">Inviter un Admin</h3>
                  <div className="flex flex-col gap-3">
                    <Input label="Email du nouvel admin" type="email" placeholder="admin@cospace.dz" />
                    <Button variant="outline">Envoyer l&apos;invitation</Button>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 className="font-display text-[1.2rem] tracking-[0.08em] text-muted mb-3.5">Fonctionnalités</h3>
                {[
                  { label: 'Programme de parrainage', desc: 'Activer les codes parrainage', checked: true },
                  { label: 'Freeze de streak', desc: 'Autoriser les tokens freeze', checked: true },
                  { label: 'Notifications push', desc: 'Rappels expiration abonnement', checked: true },
                  { label: 'Check-in caméra obligatoire', desc: 'Pas d\'upload de galerie', checked: true },
                  { label: 'Mode maintenance', desc: 'Bloquer l\'accès client', checked: false },
                ].map((setting, i) => (
                  <div key={i} className="flex items-center justify-between py-3.5 border-b border-border">
                    <div>
                      <div className="font-semibold text-[0.85rem]">{setting.label}</div>
                      <div className="text-[0.72rem] text-muted">{setting.desc}</div>
                    </div>
                    <label className="relative inline-block w-11 h-6">
                      <input type="checkbox" defaultChecked={setting.checked} className="sr-only peer" />
                      <span className="absolute inset-0 bg-surface2 rounded-full cursor-pointer transition-all border border-border peer-checked:bg-teal/20 peer-checked:border-teal" />
                      <span className="absolute left-0.5 bottom-0.5 w-[18px] h-[18px] bg-muted rounded-full transition-all peer-checked:translate-x-5 peer-checked:bg-teal" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

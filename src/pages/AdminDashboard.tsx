import React, { useEffect, useState } from 'react'
import { AddStudentForm } from '@/components/admin/AddStudentForm'
import { StudentList } from '@/components/admin/StudentList'
import { BusStopManager } from '@/components/admin/BusStopManager'
import { supabase } from '@/lib/supabase'
import { Users, Plus, Bus, LayoutDashboard, CircleDollarSign, UserX, LogOut } from 'lucide-react'

interface AdminDashboardProps {
  onSignOut?: () => Promise<void> | void
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onSignOut }) => {
  const [activeTab, setActiveTab] = useState<'add' | 'list' | 'bus-stops'>('add')
  const [refreshTrigger, setRefreshTrigger] = useState(false)
  const [stats, setStats] = useState({
    totalStudents: 0,
    paidStudents: 0,
    unpaidStudents: 0,
    busStops: 0,
  })

  const handleStudentAdded = () => {
    setRefreshTrigger(!refreshTrigger)
  }

  useEffect(() => {
    const fetchStats = async () => {
      const [{ count: totalStudents }, { count: paidStudents }, { count: unpaidStudents }, { count: busStops }] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('fees_paid', true),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('fees_paid', false),
        supabase.from('bus_stops').select('*', { count: 'exact', head: true }),
      ])

      setStats({
        totalStudents: totalStudents || 0,
        paidStudents: paidStudents || 0,
        unpaidStudents: unpaidStudents || 0,
        busStops: busStops || 0,
      })
    }

    fetchStats()
  }, [refreshTrigger])

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-900/30 text-emerald-300 px-3 py-1 text-xs font-semibold tracking-wide uppercase border border-emerald-700/40 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]">
                <LayoutDashboard className="w-3.5 h-3.5" />
                Admin Workspace
              </div>
              <h1 className="mt-2 text-2xl md:text-3xl font-bold tracking-tight text-white">
                Student Pass Management Portal
              </h1>
            </div>
            <button
              type="button"
              onClick={() => onSignOut?.()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex gap-2 md:gap-3 py-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab('add')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap border ${
                activeTab === 'add'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.25)]'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Plus className="w-4 h-4" />
              Add Student
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap border ${
                activeTab === 'list'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.25)]'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Student Directory
            </button>
            <button
              onClick={() => setActiveTab('bus-stops')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition whitespace-nowrap border ${
                activeTab === 'bus-stops'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.25)]'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Bus className="w-4 h-4" />
              Bus Stops
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-4 pb-8">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/60 p-3 shadow-[inset_0_1px_0_rgba(148,163,184,0.12)]">
            <p className="text-xs uppercase tracking-wide text-slate-400">Total Students</p>
            <p className="mt-2 text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" /> {stats.totalStudents}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/60 p-3 shadow-[inset_0_1px_0_rgba(148,163,184,0.12)]">
            <p className="text-xs uppercase tracking-wide text-slate-400">Fees Paid</p>
            <p className="mt-2 text-2xl font-bold text-slate-100 flex items-center gap-2">
              <CircleDollarSign className="w-5 h-5 text-emerald-600" /> {stats.paidStudents}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/60 p-3 shadow-[inset_0_1px_0_rgba(148,163,184,0.12)]">
            <p className="text-xs uppercase tracking-wide text-slate-400">Fees Pending</p>
            <p className="mt-2 text-2xl font-bold text-slate-100 flex items-center gap-2">
              <UserX className="w-5 h-5 text-amber-600" /> {stats.unpaidStudents}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/60 p-3 shadow-[inset_0_1px_0_rgba(148,163,184,0.12)]">
            <p className="text-xs uppercase tracking-wide text-slate-400">Bus Stops</p>
            <p className="mt-2 text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Bus className="w-5 h-5 text-blue-600" /> {stats.busStops}
            </p>
          </div>
        </section>

        <div>
        {activeTab === 'add' && <AddStudentForm onStudentAdded={handleStudentAdded} />}
        {activeTab === 'list' && (
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-4 md:p-5 h-[calc(100vh-240px)] md:h-[calc(100vh-252px)] flex flex-col overflow-hidden">
            <h2 className="text-lg md:text-xl font-bold text-slate-100 mb-3">Student Directory</h2>
            <div className="min-h-0 flex-1">
              <StudentList refreshTrigger={refreshTrigger} />
            </div>
          </div>
        )}
        {activeTab === 'bus-stops' && (
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-4 md:p-5">
            <BusStopManager />
          </div>
        )}
        </div>
      </main>
    </div>
  )
}

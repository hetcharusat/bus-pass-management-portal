import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { Bus, Trash2, PlusCircle, Pencil, Check, X, Search, Loader2 } from 'lucide-react';

interface BusStop {
  id: string;
  name: string;
}

export const BusStopManager = () => {
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [newStopName, setNewStopName] = useState('');
  const [query, setQuery] = useState('');
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingStopId, setDeletingStopId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchBusStops = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('bus_stops').select('*').order('name');
    if (error) {
      console.error('Error fetching bus stops:', error);
      setError('Failed to fetch bus stops. Please try again.');
    } else {
      setBusStops(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchBusStops();
  }, []);

  const filteredBusStops = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return busStops;
    return busStops.filter((stop) => stop.name.toLowerCase().includes(q));
  }, [busStops, query]);

  const stopExists = (name: string, excludeId?: string) =>
    busStops.some((stop) => stop.name.toLowerCase() === name.toLowerCase() && stop.id !== excludeId);

  const handleAddStop = async (e: FormEvent) => {
    e.preventDefault();
    const normalized = newStopName.trim();

    if (!normalized) {
      setError('Bus stop name cannot be empty.');
      return;
    }

    if (stopExists(normalized)) {
      setError('This bus stop already exists.');
      return;
    }

    setAdding(true);
    setError(null);
    setSuccess(null);

    const { data, error } = await supabase
      .from('bus_stops')
      .insert([{ name: normalized }])
      .select();

    if (error) {
      console.error('Error adding bus stop:', error);
      setError(`Failed to add bus stop: ${error.message}`);
    } else if (data) {
      setBusStops((prev) => [...prev, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
      setNewStopName('');
      setSuccess('Bus stop added successfully.');
    }

    setAdding(false);
  };

  const startEdit = (stop: BusStop) => {
    setEditingStopId(stop.id);
    setEditingName(stop.name);
    setError(null);
    setSuccess(null);
  };

  const cancelEdit = () => {
    setEditingStopId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (stopId: string) => {
    const normalized = editingName.trim();

    if (!normalized) {
      setError('Bus stop name cannot be empty.');
      return;
    }

    if (stopExists(normalized, stopId)) {
      setError('Another bus stop with this name already exists.');
      return;
    }

    setSavingEdit(true);
    setError(null);
    setSuccess(null);

    const { error } = await supabase
      .from('bus_stops')
      .update({ name: normalized })
      .eq('id', stopId);

    if (error) {
      console.error('Error editing bus stop:', error);
      setError(`Failed to update bus stop: ${error.message}`);
    } else {
      setBusStops((prev) =>
        prev
          .map((stop) => (stop.id === stopId ? { ...stop, name: normalized } : stop))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setSuccess('Bus stop updated successfully.');
      cancelEdit();
    }

    setSavingEdit(false);
  };

  const handleDeleteStop = async (stopId: string) => {
    if (!window.confirm('Are you sure you want to delete this bus stop?')) {
      return;
    }

    setDeletingStopId(stopId);
    setError(null);
    setSuccess(null);

    const { error } = await supabase.from('bus_stops').delete().eq('id', stopId);
    if (error) {
      console.error('Error deleting bus stop:', error);
      setError(`Failed to delete bus stop: ${error.message}`);
    } else {
      setBusStops((prev) => prev.filter((stop) => stop.id !== stopId));
      setSuccess('Bus stop deleted successfully.');
    }

    setDeletingStopId(null);
  };

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-100 flex items-center">
        <Bus className="mr-2 w-5 h-5 text-emerald-600" /> Manage Bus Stops
        </h3>
        <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
          Total: {busStops.length}
        </span>
      </div>

      <form onSubmit={handleAddStop} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
        <input
          type="text"
          value={newStopName}
          onChange={(e) => setNewStopName(e.target.value)}
          placeholder="Enter new bus stop name (e.g. North Colony)"
          disabled={adding}
          className="spotlight-field flex-grow px-3 py-2.5 border border-slate-600 bg-slate-800 text-slate-100 rounded-lg outline-none"
        />
        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
          {adding ? 'Adding...' : 'Add Stop'}
        </button>
      </form>

      <div className="relative mb-4">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search bus stops"
          className="spotlight-field w-full rounded-lg border border-slate-700 bg-slate-800 text-slate-100 pl-9 pr-3 py-2.5 text-sm outline-none"
        />
      </div>

      {error ? <p className="text-red-400 text-sm mb-3">{error}</p> : null}
      {success ? <p className="text-emerald-400 text-sm mb-3">{success}</p> : null}

      {loading ? (
        <p className="text-slate-500">Loading bus stops...</p>
      ) : (
        <>
          {filteredBusStops.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/40 px-4 py-8 text-center">
              <p className="text-slate-300 text-sm">No bus stops found.</p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {filteredBusStops.map((stop) => {
                const isEditing = editingStopId === stop.id;
                const isDeleting = deletingStopId === stop.id;

                return (
                  <li
                    key={stop.id}
                    className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700"
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleSaveEdit(stop.id);
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEdit();
                          }
                        }}
                        className="spotlight-field flex-grow px-3 py-2 border border-slate-600 bg-slate-900 text-slate-100 rounded-lg outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="text-slate-200 font-medium flex-grow truncate">{stop.name}</span>
                    )}

                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(stop.id)}
                          disabled={savingEdit}
                          className="inline-flex items-center justify-center p-2 rounded-md border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-60"
                          aria-label={`Save ${stop.name}`}
                        >
                          {savingEdit ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={savingEdit}
                          className="inline-flex items-center justify-center p-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-60"
                          aria-label="Cancel edit"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(stop)}
                          className="inline-flex items-center justify-center p-2 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-700"
                          aria-label={`Edit ${stop.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteStop(stop.id)}
                          disabled={isDeleting}
                          className="inline-flex items-center justify-center p-2 rounded-md border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-60"
                          aria-label={`Delete ${stop.name}`}
                        >
                          {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Bus, Trash2, PlusCircle } from 'lucide-react';

interface BusStop {
  id: string;
  name: string;
}

export const BusStopManager = () => {
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [newStopName, setNewStopName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStopName.trim()) {
      setError('Bus stop name cannot be empty.');
      return;
    }
    setError(null);

    const { data, error } = await supabase
      .from('bus_stops')
      .insert([{ name: newStopName.trim() }])
      .select();

    if (error) {
      console.error('Error adding bus stop:', error);
      setError(`Failed to add bus stop: ${error.message}`);
    } else if (data) {
      setBusStops([...busStops, data[0]]);
      setNewStopName('');
    }
  };

  const handleDeleteStop = async (stopId: string) => {
    if (!window.confirm('Are you sure you want to delete this bus stop?')) {
      return;
    }
    const { error } = await supabase.from('bus_stops').delete().eq('id', stopId);
    if (error) {
      console.error('Error deleting bus stop:', error);
      setError(`Failed to delete bus stop: ${error.message}`);
    } else {
      setBusStops(busStops.filter((stop) => stop.id !== stopId));
    }
  };

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4 md:p-6">
      <h3 className="text-xl font-semibold mb-4 text-slate-100 flex items-center">
        <Bus className="mr-2 w-5 h-5 text-emerald-600" /> Manage Bus Stops
      </h3>
      <form onSubmit={handleAddStop} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
        <input
          type="text"
          value={newStopName}
          onChange={(e) => setNewStopName(e.target.value)}
          placeholder="Enter new bus stop name (e.g. North Colony)"
          className="spotlight-field flex-grow px-3 py-2.5 border border-slate-600 bg-slate-800 text-slate-100 rounded-lg outline-none"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <PlusCircle className="w-4 h-4" />
          Add Stop
        </button>
      </form>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      {loading ? (
        <p className="text-slate-500">Loading bus stops...</p>
      ) : (
        <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {busStops.map((stop) => (
            <li
              key={stop.id}
              className="flex justify-between items-center px-3 py-2.5 bg-slate-800 rounded-lg border border-slate-700"
            >
              <span className="text-slate-200 font-medium">{stop.name}</span>
              <button
                onClick={() => handleDeleteStop(stop.id)}
                className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50"
                aria-label={`Delete ${stop.name}`}
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

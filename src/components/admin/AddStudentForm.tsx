import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, AlertCircle, CheckCircle, Phone, MapPin, User, Bus } from 'lucide-react'

interface AddStudentFormProps {
  onStudentAdded?: () => void
}

interface BusStop {
  id: string;
  name: string;
}

export const AddStudentForm: React.FC<AddStudentFormProps> = ({ onStudentAdded }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [showBusStopSuggestions, setShowBusStopSuggestions] = useState(false)
  const [activeBusStopIndex, setActiveBusStopIndex] = useState(-1)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    student_id: '',
    bus_no: '',
    contact_no: '+91 ',
    bus_stop: '',
    fees_paid: false,
    fees_paid_at: null as string | null,
  })

  const toFriendlyError = (err: unknown, fallback: string) => {
    const message = err instanceof Error ? err.message : ''
    const messageLower = message.toLowerCase()
    const supabaseErr = err as { code?: string; status?: number; message?: string; details?: string }

    if (supabaseErr?.code === '23505' || supabaseErr?.status === 409 || messageLower.includes('duplicate key')) {
      return 'Student ID already exists. Please use a different Student ID.'
    }

    if (messageLower.includes('failed to fetch') || messageLower.includes('networkerror') || messageLower.includes('blocked_by_client')) {
      return 'Network request was blocked (possible ad blocker/privacy extension). Please disable blocker for this site and try again.'
    }

    if (message) return message
    return fallback
  }

  useEffect(() => {
    const fetchBusStops = async () => {
      const { data, error } = await supabase.from('bus_stops').select('id, name').order('name');
      if (error) {
        console.error('Error fetching bus stops:', error);
      } else {
        setBusStops(data || []);
      }
    };
    fetchBusStops();
  }, []);

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  const filteredBusStops = busStops
    .filter((stop) => stop.name.toLowerCase().includes(formData.bus_stop.toLowerCase().trim()))
    .slice(0, 8)

  const getNavigableFields = () => {
    if (!formRef.current) return

    const fields = Array.from(
      formRef.current.querySelectorAll<HTMLElement>('input, select, button[type="submit"]')
    ).filter((el) => {
      if (el.hasAttribute('disabled')) return false
      if (el.getAttribute('type') === 'hidden') return false
      if (el.getAttribute('type') === 'file') return false
      return el.offsetParent !== null
    })

    return fields
  }

  const focusFirstField = () => {
    const fields = getNavigableFields()
    if (!fields || fields.length === 0) return
    fields[0].focus()
  }

  const focusNextField = (currentTarget: HTMLElement, wrap = false) => {
    const fields = getNavigableFields()
    if (!fields) return

    const currentIndex = fields.indexOf(currentTarget)
    if (currentIndex !== -1 && currentIndex < fields.length - 1) {
      fields[currentIndex + 1].focus()
      return
    }

    if (wrap && fields.length > 0) {
      fields[0].focus()
    }
  }

  const focusPreviousField = (currentTarget: HTMLElement, wrap = false) => {
    const fields = getNavigableFields()
    if (!fields) return

    const currentIndex = fields.indexOf(currentTarget)
    if (currentIndex > 0) {
      fields[currentIndex - 1].focus()
      return
    }

    if (wrap && fields.length > 0) {
      fields[fields.length - 1].focus()
    }
  }

  const focusFieldByDirection = (
    currentTarget: HTMLElement,
    direction: 'left' | 'right' | 'up' | 'down'
  ): boolean => {
    const fields = getNavigableFields()
    if (!fields) return false

    const currentRect = currentTarget.getBoundingClientRect()
    const cx = currentRect.left + currentRect.width / 2
    const cy = currentRect.top + currentRect.height / 2

    let bestField: HTMLElement | null = null
    let bestScore = Number.POSITIVE_INFINITY

    for (const field of fields) {
      if (field === currentTarget) continue

      const rect = field.getBoundingClientRect()
      const tx = rect.left + rect.width / 2
      const ty = rect.top + rect.height / 2
      const dx = tx - cx
      const dy = ty - cy

      const inDirection =
        (direction === 'left' && dx < -4) ||
        (direction === 'right' && dx > 4) ||
        (direction === 'up' && dy < -4) ||
        (direction === 'down' && dy > 4)

      if (!inDirection) continue

      const primary = direction === 'left' || direction === 'right' ? Math.abs(dx) : Math.abs(dy)
      const secondary = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx)
      const score = primary + secondary * 1.8

      if (score < bestScore) {
        bestScore = score
        bestField = field
      }
    }

    if (bestField) {
      bestField.focus()
      return true
    }

    return false
  }

  const handleFieldKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>
  ) => {
    const isBusStopField = e.currentTarget.id === 'bus_stop'
    const isSelect = e.currentTarget.tagName === 'SELECT'

    if (
      e.key === 'Enter' &&
      e.currentTarget instanceof HTMLInputElement &&
      e.currentTarget.type === 'checkbox'
    ) {
      e.preventDefault()
      const checkboxName = e.currentTarget.name
      const nextChecked = !e.currentTarget.checked

      setFormData((prev) => ({
        ...prev,
        [checkboxName]: nextChecked,
        fees_paid_at:
          checkboxName === 'fees_paid'
            ? nextChecked
              ? prev.fees_paid_at || new Date().toISOString().split('T')[0]
              : null
            : prev.fees_paid_at,
      }))

      if (checkboxName === 'fees_paid' && nextChecked) {
        setTimeout(() => {
          const dateInput = formRef.current?.querySelector<HTMLInputElement>('#fees_paid_at')
          if (!dateInput) return
          dateInput.focus()
          const picker = (dateInput as HTMLInputElement & { showPicker?: () => void }).showPicker
          if (typeof picker === 'function') {
            picker.call(dateInput)
          }
        }, 0)
      }

      return
    }

    if (isBusStopField && !showBusStopSuggestions && e.key === 'ArrowDown') {
      e.preventDefault()
      if (filteredBusStops.length > 0) {
        setShowBusStopSuggestions(true)
        setActiveBusStopIndex(0)
      }
      return
    }

    if (isBusStopField && showBusStopSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveBusStopIndex((prev) => {
          const next = prev + 1
          return next >= filteredBusStops.length ? 0 : next
        })
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveBusStopIndex((prev) => {
          const next = prev - 1
          return next < 0 ? filteredBusStops.length - 1 : next
        })
        return
      }

      if (e.key === 'Enter' && activeBusStopIndex >= 0 && filteredBusStops[activeBusStopIndex]) {
        e.preventDefault()
        const selected = filteredBusStops[activeBusStopIndex].name
        setFormData((prev) => ({ ...prev, bus_stop: selected }))
        setShowBusStopSuggestions(false)
        setActiveBusStopIndex(-1)
        focusNextField(e.currentTarget, true)
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        setShowBusStopSuggestions(false)
        setActiveBusStopIndex(-1)
        return
      }
    }

    if (isSelect && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      return
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault()
      const moved = focusFieldByDirection(e.currentTarget, 'right')
      if (!moved) {
        focusNextField(e.currentTarget, true)
      }
      return
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      const moved = focusFieldByDirection(e.currentTarget, 'left')
      if (!moved) {
        focusPreviousField(e.currentTarget, true)
      }
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const moved = focusFieldByDirection(e.currentTarget, 'up')
      if (!moved) {
        focusPreviousField(e.currentTarget, true)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const moved = focusFieldByDirection(e.currentTarget, 'down')
      if (!moved) {
        focusNextField(e.currentTarget, true)
      }
      return
    }

    if (e.key !== 'Enter') return

    if (e.shiftKey) {
      e.preventDefault()
      formRef.current?.requestSubmit()
      return
    }

    e.preventDefault()
    focusNextField(e.currentTarget, true)
  }

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isControlFocused =
        !!target &&
        (
          target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'BUTTON' ||
          target.isContentEditable
        )

      if (isControlFocused) {
        return
      }

      if (event.shiftKey && event.key === 'Enter') {
        event.preventDefault()
        formRef.current?.requestSubmit()
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        focusFirstField()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
    }
  }, [])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (name === 'bus_stop') {
      setFormData((prev) => ({ ...prev, bus_stop: value }))
      setShowBusStopSuggestions(busStops.length > 0)
      setActiveBusStopIndex(-1)
      return
    }

    const isChecked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setFormData(prev => ({
      ...prev,
      [name]: isChecked !== undefined ? isChecked : value,
      fees_paid_at: name === 'fees_paid' 
        ? (isChecked ? new Date().toISOString().split('T')[0] : null)
        : prev.fees_paid_at,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (studentId: string): Promise<string | null> => {
    if (!imageFile) return null

    try {
      const fileExt = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const safeStudentId = studentId.replace(/[^a-zA-Z0-9_-]/g, '_')
      const fileName = `${safeStudentId}-${Date.now()}.${fileExt}`
      const filePath = fileName

      const { error: uploadError } = await supabase.storage
        .from('student-images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: imageFile.type || 'image/jpeg',
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('student-images')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (err) {
      console.error('Image upload error:', err)
      throw new Error(`Image upload failed: ${toFriendlyError(err, 'Failed to upload image')}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      let finalBusStop = formData.bus_stop.trim();
      if (!finalBusStop) {
        throw new Error('Bus stop is required.');
      }
      if (!formData.bus_no || Number.isNaN(Number(formData.bus_no))) {
        throw new Error('Bus number is required and must be a number.')
      }

      const studentIdTrimmed = formData.student_id.trim()
      const { data: existingStudent, error: existingStudentError } = await supabase
        .from('students')
        .select('id')
        .eq('student_id', studentIdTrimmed)
        .maybeSingle()

      if (existingStudentError) {
        throw existingStudentError
      }
      if (existingStudent) {
        throw new Error('Student ID already exists. Please use a different Student ID.')
      }
      
      // Upload image and get URL
      let imageUrl: string | null = null
      if (imageFile) {
        imageUrl = await uploadImage(studentIdTrimmed)
      }

      // Insert student record
      const { error: insertError } = await supabase
        .from('students')
        .insert([
          {
            full_name: formData.full_name,
            student_id: studentIdTrimmed,
            bus_no: Number(formData.bus_no),
            contact_no: formData.contact_no,
            bus_stop: finalBusStop,
            fees_paid: formData.fees_paid,
            fees_paid_at: formData.fees_paid ? formData.fees_paid_at : null,
            image_url: imageUrl,
          },
        ])

      if (insertError) throw insertError

      setSuccess(true)
      setFormData({
        full_name: '',
        student_id: '',
        bus_no: '',
        contact_no: '+91 ',
        bus_stop: '',
        fees_paid: false,
        fees_paid_at: null,
      })
      setShowBusStopSuggestions(false)
      setActiveBusStopIndex(-1)
      setImageFile(null)
      setImagePreview(null)
      nameInputRef.current?.focus()

      // Call callback if provided
      onStudentAdded?.()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(toFriendlyError(err, 'Failed to add student'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-2xl border border-slate-700 bg-slate-900/95 p-4 md:p-5 shadow-xl">
          <h1 className="text-xl font-bold text-slate-100 mb-3">Add Student</h1>

          {error && (
            <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-3 p-2.5 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-green-700">Student added successfully!</p>
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 auto-rows-min">
              <div>
                <label htmlFor="full_name" className="text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
                  <User className="w-4 h-4" /> Full Name *
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  onKeyDown={handleFieldKeyDown}
                  required
                  className="spotlight-field w-full px-3 py-2 border border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500 rounded-lg outline-none transition"
                  placeholder="e.g., John Doe"
                />
              </div>

              <div>
                <label htmlFor="student_id" className="text-sm font-medium text-slate-300 mb-1.5 block">
                  Student ID *
                </label>
                <input
                  type="text"
                  id="student_id"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleInputChange}
                  onKeyDown={handleFieldKeyDown}
                  required
                  className="spotlight-field w-full px-3 py-2 border border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500 rounded-lg outline-none transition"
                  placeholder="e.g., STU-001"
                />
              </div>

              <div>
                <label htmlFor="bus_no" className="text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
                  <Bus className="w-4 h-4" /> Bus No *
                </label>
                <input
                  type="number"
                  id="bus_no"
                  name="bus_no"
                  value={formData.bus_no}
                  onChange={handleInputChange}
                  onKeyDown={handleFieldKeyDown}
                  min={1}
                  step={1}
                  required
                  className="spotlight-field w-full px-3 py-2 border border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500 rounded-lg outline-none transition"
                  placeholder="e.g., 12"
                />
              </div>

              <div>
                <label htmlFor="contact_no" className="text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Contact Number *
                </label>
                <input
                  type="tel"
                  id="contact_no"
                  name="contact_no"
                  value={formData.contact_no}
                  onChange={handleInputChange}
                  onKeyDown={handleFieldKeyDown}
                  required
                  className="spotlight-field w-full px-3 py-2 border border-slate-600 bg-slate-800 text-slate-100 placeholder-slate-500 rounded-lg outline-none transition"
                  placeholder="e.g., +91 98765 43210"
                />
              </div>

              <div>
                <label htmlFor="bus_stop" className="text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Bus Stop *
                </label>
                <div className="relative">
                <input
                  type="text"
                  id="bus_stop"
                  name="bus_stop"
                  value={formData.bus_stop}
                  onChange={handleInputChange}
                  onKeyDown={handleFieldKeyDown}
                  onFocus={() => {
                    if (filteredBusStops.length > 0) {
                      setShowBusStopSuggestions(true)
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowBusStopSuggestions(false)
                      setActiveBusStopIndex(-1)
                    }, 120)
                  }}
                  required
                  className="spotlight-field w-full px-3 py-2 border border-slate-600 bg-slate-800 text-slate-100 rounded-lg outline-none transition"
                  placeholder="Type or pick a bus stop"
                />
                {showBusStopSuggestions && filteredBusStops.length > 0 ? (
                  <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 shadow-xl max-h-52 overflow-auto">
                    {filteredBusStops.map((stop, index) => (
                      <button
                        key={stop.id}
                        type="button"
                        onMouseDown={() => {
                          setFormData((prev) => ({ ...prev, bus_stop: stop.name }))
                          setShowBusStopSuggestions(false)
                          setActiveBusStopIndex(-1)
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition ${
                          index === activeBusStopIndex
                            ? 'bg-emerald-700/40 text-emerald-200'
                            : 'text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        {stop.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                </div>
              </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="fees_paid"
                  name="fees_paid"
                  checked={formData.fees_paid}
                  onChange={handleInputChange}
                  onKeyDown={handleFieldKeyDown}
                  className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="fees_paid" className="text-sm font-medium text-slate-300 cursor-pointer">
                  Fees Paid
                </label>
              </div>

              {formData.fees_paid && (
                <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                  <label htmlFor="fees_paid_at" className="text-sm font-medium text-slate-300 whitespace-nowrap">
                    Payment Date:
                  </label>
                  <input
                    type="date"
                    id="fees_paid_at"
                    name="fees_paid_at"
                    value={formData.fees_paid_at || ''}
                    onChange={handleInputChange}
                    onKeyDown={handleFieldKeyDown}
                    required
                    className="spotlight-field w-full sm:w-auto px-3 py-2 border border-slate-600 bg-slate-800 text-slate-100 rounded-md shadow-sm text-sm"
                  />
                </div>
              )}
            </div>

            <div className="md:col-span-1">
              <label htmlFor="image" className="block text-sm font-medium text-slate-300 mb-2">
                Student Photo <span className="text-slate-400 font-normal">(Optional, last step)</span>
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <label
                    htmlFor="image"
                    className="flex items-center justify-center gap-2 w-full px-3 py-2.5 border-2 border-dashed border-slate-600 rounded-lg hover:border-emerald-500 cursor-pointer transition bg-slate-800 hover:bg-slate-700"
                  >
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-300">
                      {imageFile ? imageFile.name : 'Click to upload image'}
                    </span>
                  </label>
                </div>

                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                )}
              </div>
            </div>

            <div className="md:col-span-3 flex items-center justify-between gap-4 mt-1">
              <p className="text-xs text-slate-400">Required fields only.</p>
              <button
                type="submit"
                disabled={loading}
                onKeyDown={handleFieldKeyDown}
                className="min-w-[170px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-semibold rounded-lg transition"
              >
                {loading ? 'Saving...' : 'Save Student'}
              </button>
            </div>
          </form>
      </div>
    </div>
  )
}

# Student Bus Pass & Verification System

A modern web and mobile solution for managing student bus passes and verifying attendance using QR codes. Built with Vite + React, Supabase, and Tailwind CSS.

## 📋 System Overview

### Two Main Modules

1. **Admin Portal (Web)**
   - Add and manage students
   - Upload student photos
   - Generate QR codes
   - View student directory
   - Manage fees status

2. **Scanner App (Mobile Wrapper)**
   - Driver authentication
   - Real-time QR code scanning
   - Student verification
   - Instant fee status display
   - Photo verification

## 🛠️ Tech Stack

- **Frontend:** Vite + React 19 + TypeScript
- **Styling:** Tailwind CSS + Lucide React Icons
- **Backend:** Supabase (Database, Auth, Storage)
- **QR Code:** qrcode.react for generation
- **Scanning:** react-qr-reader for mobile scanning
- **Hosting:** Vercel (ready to deploy)

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

#### Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Navigate to Settings > API Keys
4. Copy your `Project URL` and `anon public key`

#### Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

#### Run Database Migration

1. Go to Supabase Dashboard > SQL Editor
2. Click "New Query"
3. Copy the entire contents of `migrations/001_init_students_table.sql`
4. Paste into the query editor
5. Click "Run"

This will:
- Create the `students` table
- Enable Row Level Security (RLS)
- Set up storage bucket for images
- Create necessary indexes

### 3. Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

## 📱 Application Structure

```
src/
├── components/
│   ├── admin/
│   │   ├── AddStudentForm.tsx      # Form to add students with image upload
│   │   ├── StudentList.tsx          # Table of all students
│   │   └── QRGenerator.tsx          # QR code generation component
│   └── scanner/
│       └── QRScanner.tsx            # QR scanning and verification view
├── pages/
│   ├── AdminDashboard.tsx           # Admin portal main page
│   └── ScannerApp.tsx               # Scanner app with login
├── lib/
│   └── supabase.ts                  # Supabase client configuration
├── App.tsx                          # Main entry point with routing
└── index.css                        # Tailwind CSS configuration
```

## 🔒 Security & Privacy

### QR Code Contains Only UUID

```
QR CODE CONTENT: "550e8400-e29b-41d4-a716-446655440000"
(NOT personal information)
```

### Row Level Security (RLS)

- Only authenticated users can access student data
- All database operations require valid authentication
- Image storage is publicly readable but upload is restricted

### Authentication Flow

1. Users login with Supabase Auth
2. Admin portal: Standard email/password
3. Scanner app: Driver credentials (email/password)

## 📝 Database Schema

### Students Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key (shown in QR code) |
| full_name | TEXT | Student's full name |
| student_id | TEXT | Unique student ID (e.g., STU-001) |
| contact_no | TEXT | Contact number |
| bus_stop | TEXT | Assigned bus stop |
| fees_paid | BOOLEAN | Fee payment status |
| image_url | TEXT | URL to student photo |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

## 🎯 Usage Guide

### Admin Portal

1. **Add Student:**
   - Fill in all student details
   - Upload a clear photo
   - Select bus stop
   - Mark if fees are paid
   - Click "Add Student"

2. **View Students:**
   - Switch to "View Students" tab
   - See all registered students
   - Download QR codes
   - Delete students if needed

3. **Generate QR Codes:**
   - QR codes are automatically generated for each student
   - Download button generates a PNG file
   - Print and attach to buses or distribute digitally

### Scanner App

1. **Driver Login:**
   - Enter driver name
   - Enter password (provided by admin)
   - Click "Login"

2. **Scan QR Code:**
   - Point camera at QR code
   - System automatically detects and verifies
   - Or manually paste UUID and click "Verify"

3. **Verification Result:**
   - **GREEN (PAID):** Student can board
   - **RED (UNPAID):** Student cannot board
   - Shows photo, name, and bus stop

## 🚀 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Connect GitHub repository to Vercel
3. Add environment variables in Vercel settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

### Build for Production

```bash
npm run build
```

## 📱 Mobile Responsiveness

- Admin portal optimized for desktop/tablet
- Scanner app fully responsive for mobile devices
- Touch-friendly buttons and inputs
- Works on iOS Safari and Android Chrome

## 🔧 Environment Variables

Required environment variables:

```env
VITE_SUPABASE_URL        # Your Supabase project URL
VITE_SUPABASE_ANON_KEY   # Your Supabase anonymous key
```

## 📦 Build & Optimize

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## 🐛 Troubleshooting

### "Cannot find module" errors
- Run `npm install` again
- Delete `node_modules` and `package-lock.json`
- Run `npm install`

### Supabase connection fails
- Verify environment variables are set
- Check Supabase project is active
- Ensure RLS policies are properly configured

### Camera not working in Scanner
- Check browser camera permissions
- Ensure HTTPS (required for camera access on production)
- Test on different browser

### QR code not scanning
- Ensure QR code is clear and not damaged
- Make sure lighting is adequate
- Try manual UUID entry as fallback

## 📚 API Reference

### Supabase Tables

**Authentication:** Built-in with Supabase Auth

**Students Query:**
```typescript
const { data, error } = await supabase
  .from('students')
  .select('*')
  .eq('id', studentUUID)
```

**Image Upload:**
```typescript
await supabase.storage
  .from('student-images')
  .upload(path, file)
```

## 📄 License

This project is open source and available under the MIT License.

## 👤 Support

For issues, feature requests, or questions, please refer to the Supabase documentation:
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 🎓 Features Included

✅ Student management system
✅ Photo upload with preview
✅ QR code generation and download
✅ Real-time database with Supabase
✅ Secure image storage
✅ Row Level Security
✅ Mobile-responsive design
✅ Admin authentication
✅ Driver authentication
✅ Real-time verification
✅ Status indicators (Paid/Unpaid)
✅ Error handling and validation
✅ Responsive UI with Tailwind CSS

## 🔄 Next Steps

1. ✅ Scaffold project structure
2. ✅ Set up Supabase database
3. ✅ Create admin portal
4. ✅ Build scanner app
5. ⏳ Deploy to Vercel
6. ⏳ Add mobile push notifications (optional)
7. ⏳ Implement attendance tracking (optional)
8. ⏳ Add analytics dashboard (optional)

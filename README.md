# Student Bus Pass & Verification System

A modern, full-stack solution for managing student bus passes and verifying attendance using QR codes. Built with **Vite + React**, **Supabase**, **Tailwind CSS**, and ready for deployment on **Vercel**.

## ?? Overview

This system consists of two main applications:

### 1. **Admin Portal** (Web Application)
- Add and manage students with complete details
- Upload and store student photos
- Generate and download QR codes (contains only UUID for privacy)
- View all registered students in a sortable table
- Manage fee payment status
- Delete student records

### 2. **Scanner App** (Mobile-Ready Web App)
- Driver authentication with secure login
- Real-time QR code verification
- Display student profile with photo
- **Clear fee status indicators** (PAID in GREEN / UNPAID in RED)
- Manual UUID entry as fallback
- Responsive mobile interface

## ??? Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Vite + React 19 + TypeScript |
| **Styling** | Tailwind CSS + Lucide React Icons |
| **Backend** | Supabase (Database + Auth + Storage) |
| **QR Code** | qrcode library |
| **Hosting** | Vercel (ready to deploy) |

## ?? Quick Start

### Prerequisites
- Node.js 20.19+ or 22.12+
- npm or yarn
- A Supabase account (free tier available)

### 1. Install Dependencies

$''$''$''bash
npm install --legacy-peer-deps
$''$''$''

### 2. Set Up Supabase

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Go to **Settings** > **API Keys**
4. Copy your Project URL and anon public key

#### Configure Environment

Create $''.env.local$'' file in your project root:

$''$''$''env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
$''$''$''

#### Run Database Migration

1. Go to Supabase Dashboard > **SQL Editor**
2. Click **New Query**
3. Open $''migrations/001_init_students_table.sql$'' from this project
4. Copy and paste the entire SQL content
5. Click **Run**

### 3. Start Development Server

$''$''$''bash
npm run dev
$''$''$''

Choose between:
- **Admin Portal** - Add and manage students
- **Scanner App** - Verify student QR codes

## ?? Security & Privacy

- **QR codes contain ONLY the student's UUID** - no personal information
- Personal details fetched from database AFTER authentication
- Row Level Security (RLS) policies enforce access control
- All operations require valid Supabase authentication

## ?? Project Structure

$''$''$''
src/
+-- components/
¦   +-- admin/
¦   ¦   +-- AddStudentForm.tsx
¦   ¦   +-- StudentList.tsx
¦   ¦   +-- QRGenerator.tsx
¦   +-- scanner/
¦       +-- QRScanner.tsx
+-- pages/
¦   +-- AdminDashboard.tsx
¦   +-- ScannerApp.tsx
+-- lib/
¦   +-- supabase.ts
+-- App.tsx
$''$''$''

## ?? Database Schema

**students** table with fields:
- id (UUID - Primary Key)
- full_name, student_id, contact_no, bus_stop
- fees_paid (BOOLEAN)
- image_url (stored in Supabase Storage)
- created_at, updated_at (timestamps)

## ?? Using the Application

### Admin Portal
1. Add students with photos
2. Manage student records
3. Generate QR codes
4. Download for printing

### Scanner App
1. Driver login
2. Scan QR code or enter UUID
3. View verification card
4. **GREEN = PAID** | **RED = UNPAID**

## ?? Deployment

Deploy to Vercel with one click:
1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy!

## ?? Features

? Complete student management
? Photo upload & storage
? QR code generation
? Real-time verification
? Mobile responsive
? Authentication & authorization
? Privacy-first design

## ?? Documentation

- Full setup guide: See $''SETUP_GUIDE.md$''
- Database schema: See $''migrations/001_init_students_table.sql$''
- Supabase docs: [supabase.com/docs](https://supabase.com/docs)

## ?? License

MIT License - feel free to use this project for your school or organization.

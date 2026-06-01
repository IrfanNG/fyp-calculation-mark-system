# UniKL CLO Mark System - Full VLE

A comprehensive Virtual Learning Environment (VLE) for UniKL with complete course, student, and lecturer management.

## 🚀 Quick Start Guide

### Step 1: Install Node.js

If you don't have Node.js installed:

1. Download from [nodejs.org](https://nodejs.org/) (version 18 or higher)
2. Run the installer and follow the prompts
3. Verify installation by opening Command Prompt/Terminal and typing: `node --version`

### Step 2: Install Project Dependencies

Open Command Prompt/Terminal in the project folder and run:

```bash
npm install
```

This will download all required packages (may take 2-5 minutes).

### Step 3: Setup Database

Run these commands one by one:

````bash
npx prisma generate
npx prisma migrate dev
```all classes in a course
- ✓ **Attendance Tracking**: Mark attendance per session with percentage reports
- 📝 **Assignments**:
  - Create assignments with due dates and max scores
  - Track submission rates (e.g., "15/30 submitted")
  - Grade submissions inline
  - View student comments and submitted file
```bash
npm run dev
````

The application will start at: **http://localhost:3000**

### Step 5: Login

**For Lecturers:**

- Go to: http://localhost:3000/loginnouncements from lecturers
- 📝 **Assignments**:
  - View all assignments (pending, submitted, overdue)
  - Submit assignments with file upload and comments
  - Edit submissions before grading
  - View grades and feedback
  - Upload files (PDF, Word, images, etc.) up to 10MBur database or create via signup)

**For Students:**

- Go to: http://localhost:3000/student/login
- Use student credentials created by admin

**For Admin:**

- Us� Detailed Setup Instructions

### Prerequisites

- **Node.js 18 or higher** - [Download here](https://nodejs.org/)
- **Text Editor** - VS Code, Notepad++, or any code editor
- **Web Browser** - Chrome, Firefox, or Edge

### Installation Steps

1. **Extract the project folder** to your desired location (e.g., Desktop or Documents)

2. **Open Command Prompt or Terminal** in the project folder:
   - **Windows**: Right-click in the folder → "Open in Terminal" or "Open PowerShell window here"
   - **Mac**: Right-click → "Services" → "New Terminal at Folder"

3. **Install dependencies** (first time only):

   ```bash
   npm install
   ```

   Wait for installation to complete (2-5 minutes).

4. **Setup database** (first time only):

   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

   When prompted for migration name, type: `init` and press Enter.

5. **Start the server**:

   ```bash
   npm run dev
   ```

   You should see: `✓ Ready in X seconds`

6. **Open your browser** and go to: **http://localhost:3000**

### Create First Admin Account

Before you can use the system, create an admin account:

**Option 1: Using Browser (Recommended)**

- Visit: http://localhost:3000/signup
- Register as a lecturer and select 1-3 courses
- The first registered lecturer will have admin privileges

**Option 2: Using API (Advanced)**
Open a new terminal window and run:

```bash
curl -X POST http://localhost:3000/api/auth/bootstrap-admin ^
  -H "Content-Type: application/json" ^
  -d "{\"secret\":\"unikl-bootstrap-2026\",\"staffId\":\"ADMIN001\",\"name\":\"Admin User\",\"password\":\"admin123\"}"
```

Then login at http://localhost:3000/login with:

- Staff ID: `ADMIN001`
- Password: `admin123`

### Initial Setup Workflow

1. **Login as admin** → http://localhost:3000/login
2. **Go to Admin → Manage** to add students and lecturers
3. **Create courses** (or use AI to extract from CLP PDF)
4. **Select courses** you want to teach (1-3 courses) at "My Courses" page
5. **Enroll students** to classes via Admin panel
6. **Start teaching**: Create announcements, assignments, enter marks

### For Students

Students can:

1. **Sign up** at http://localhost:3000/student/signup
2. **Login** at http://localhost:3000/student/login
3. **Enroll in classes** (admin must first enroll them)
4. **View courses, submit assignments, check grades**

### **Admin Features**

- 👥 **User Management**: Add students and lecturers
- 📋 **Enrollment Management**:
  - Enroll students to classes individually
  - Bulk CSV import for mass enrollment
- 🎓 **GPA Scale Configuration**: Set grade boundaries
- 🔧 **System Administration**: Bootstrap first admin account

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- SQLite (included with better-sqlite3)

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Gemy-courses` - Select and manage courses (1-3 courses per lecturer)
- `/my-courses/[id]` - Course management hub
- `/my-courses/[id]/announcements` - Create and view announcements
- `/my-courses/[id]/assignments` - Create assignments and track submissions
- `/my-courses/[id]/assignments/[assignmentId]` - Grade submissions
- `/nerate Prisma client
npx prisma generate

# Start development server
npm run dev
```

### First Time Setup

1. **Create the first admin account**:

```bash
curl -X POST http://localhost:3000/api/auth/bootstrap-admin \
  -H "Content-Type: "application/json" \
  -d '{
    "secret": "unikl-bootstrap-2026",
    "staffId": "ADMIN001",
    "name": "Admin User",
    "password": "securepassword123"
  }'
```

2. **Login as admin** at `http://localhost:3000/login`
3. **Add students and lecturers** via Admin > Manage
4. **Create courses** and assign to lecturers
5. **Enroll students** to specific classes

## 📂 Main Routes

### Lecturer Routes

- `/login` - Lecturer login
- `/signup` - Lecturer registration (with course selection)
- `/` - Dashboard (course list)
- `/courses/ai-create` - AI-powered course creation
- `/courses/[id]` - Course details
- `/courses/[id]/marks` - Enter marks (per class)
- `/courses/[id]/report` - Export grades (PDF/Excel)
- `/courses/[id]/analysis` - CLO analysis with charts
- `/admin/gpa-scale` - GPA configuration (admin only)
- `/admin/manage` - User & enrollment management (admin only)

### Student Routes

- `/student/login` - Student login
- `/student/signup` - Student registration
- `/student` - Student dashboard
- `/student/courses` - My enrolled courses
- `/student/transcript` - Grades and GPA
- `/student/announcements` - View announcements
- `/student/assignments` - View and submit assignments

## 📊 Data Import Formats

### Bulk Enrollment CSV

```csv
studentId,courseCode,className
S001,CSE101,Class 1
S002,CSE101,Class 1
S003,CSE101,Class 2
```

### Bulk Marks CSV

## 🔧 Troubleshooting

### "npm: command not found"

- Node.js is not installed. Download from [nodejs.org](https://nodejs.org/)

### "Port 3000 already in use"

- Another application is using port 3000
- **Solution**: Kill the process:

  ```bash
  # Windows
  netstat -ano | findstr :3000
  taskkill /PID [PID_NUMBER] /F

  # Mac/Linux
  lsof -ti:3000 | xargs kill -9
  ```

### "Cannot find module '@prisma/client'"

- Run: `npx prisma generate`

### Database errors after updating code

- Reset database:
  ```bash
  npx prisma migrate reset
  npx prisma migrate dev
  ```

### Assignment files not uploading

- Check `public/uploads/` folder exists
- File size must be under 10MB
- Supported formats: PDF, Word, Excel, Text, Images, ZIP

### Browser shows "This site can't be reached"

- Make sure the dev server is running (`npm run dev`)
- Check the terminal for error messages
- Try a different browser

## 📞 Support

For issues or questions:

1. Check the Troubleshooting section above
2. Review the console/terminal for error messages
3. Restart the server: Stop (Ctrl+C) and run `npm run dev` again

## 📁 Project Structure

```
unikl-clo-mark-system/
├── src/
│   ├── app/              # Application routes (pages)
│   │   ├── (app)/        # Lecturer routes
│   │   ├── student/      # Student routes
│   │   └── api/          # API endpoints
│   ├── lib/              # Utility functions
│   └── middleware.ts     # Authentication middleware
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── dev.db            # SQLite database file
├── public/
│   └── uploads/          # Uploaded assignment files
└── package.json          # Dependencies
```

## 🎓 User Guide

### For Lecturers

1. **Course Selection**: Select 1-3 courses you want to teach at My Courses page
2. **Announcements**: Create announcements for specific classes or all classes
3. **Assignments**:
   - Create with title, description, due date, and max score
   - Track who has submitted (e.g., "15/30 submitted")
   - Grade each submission individually
4. **Marks**: Enter marks per assessment and class
5. **Reports**: Generate CLO analysis, grade distribution, export to PDF/Excel

### For Students

1. **Dashboard**: View all enrolled courses
2. **Assignments**:
   - See pending, submitted, and overdue assignments
   - Submit with comments and file upload (up to 10MB)
   - Edit submissions before lecturer grades them
   - View your grade and feedback
3. **Announcements**: Receive updates from lecturers
4. **Transcript**: View all grades and calculated GPA

### For Admins

1. **User Management**: Add students and lecturers
2. **Enrollment**: Enroll students to classes (individual or bulk CSV)
3. **GPA Scale**: Configure grade boundaries
4. **Course Management**: Create courses, assign lecturers

---

**Built with Next.js, TypeScript, Prisma, and Tailwind CSS**

```csv
studentName,studentId,assessmentName,rawMark
John Doe,S001,Quiz 1,85
Jane Smith,S002,Quiz 1,92
```

## 🛠 Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: SQLite with Prisma ORM
- **Styling**: Tailwind CSS v4 (UniKL theme: blue & gold)
- **Charts**: Recharts
- **Exports**: jsPDF, ExcelJS
- **CSV**: PapaParse
- **AI Extraction**: Rule-based text parsing (CLP PDF)

## 🔒 Security

- Password hashing with scrypt
- HTTP-only session cookies (12-hour expiry)
- Middleware auth checks for lecturer/student routes
- Admin-only APIs with 401/403 responses
- Bootstrap API protected by secret

## 📝 Environment Variables

Create a `.env` file:

```env
AUTH_SECRET=your-secret-key-here
BOOTSTRAP_SECRET=unikl-bootstrap-2026
```

## 🚀 Production Build

```bash
npm run build
npm run start
```

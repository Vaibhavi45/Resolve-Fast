# CCSMS Frontend - Customer Complaint System Management System

## Tech Stack
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- TanStack Query (React Query)
- React Hook Form + Zod
- Axios
- Recharts
- Lucide React Icons

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create `.env.local` file:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 3. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000`

### 4. Build for Production
```bash
npm run build
npm start
```

## Project Structure
```
src/
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── (dashboard)/     # Protected dashboard pages
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/              # Reusable UI components
│   ├── auth/            # Auth-specific components
│   ├── complaints/      # Complaint components
│   ├── dashboard/       # Dashboard components
│   ├── layout/          # Layout components
│   └── shared/          # Shared components
├── lib/
│   ├── api/             # API services
│   ├── hooks/           # Custom hooks
│   ├── stores/          # Zustand stores
│   ├── utils/           # Utility functions
│   └── validators/      # Zod schemas
├── types/               # TypeScript types
└── constants/           # Constants
```

## Features Implemented

### Authentication
- ✅ Login with JWT
- ✅ Register new users
- ✅ Protected routes
- ✅ Token refresh
- ✅ Logout

### Dashboard
- ✅ Role-based dashboard
- ✅ Statistics cards
- ✅ Navigation
- ✅ User profile display

### Complaints Management
- ✅ List all complaints
- ✅ View complaint details
- ✅ Create new complaint
- ✅ Status badges
- ✅ Priority indicators
- ✅ Role-based actions

### Analytics (Admin)
- ✅ Complaints by category chart
- ✅ Complaints by status chart
- ✅ SLA compliance report
- ✅ Interactive charts with Recharts

## Test Accounts
After running backend seed data:
- **Admin**: admin1@ccsms.com / admin123
- **Agent**: agent1@ccsms.com / agent123
- **Customer**: customer1@ccsms.com / customer123

## API Integration
All API calls are handled through service files in `src/lib/api/services/`:
- `auth.service.ts` - Authentication
- `complaints.service.ts` - Complaint management
- `analytics.service.ts` - Analytics data
- `users.service.ts` - User management
- `notifications.service.ts` - Notifications

## State Management
- **Zustand** for global state (auth)
- **React Query** for server state (API data)
- **React Hook Form** for form state

## Styling
- **Tailwind CSS** for utility-first styling
- **Custom CSS variables** for theming
- **Responsive design** for mobile/tablet/desktop

## Next Steps
To complete the frontend:
1. Add complaint detail page
2. Add complaint creation form
3. Add file upload component
4. Add notifications dropdown
5. Add user settings page
6. Add more charts and analytics
7. Add real-time updates
8. Add search and filters
9. Add pagination
10. Add error boundaries

# CCSMS Backend - Customer Complaint System Management System

## Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Environment Configuration
Copy `.env` file and update with your database and email credentials:
```
DEBUG=True
SECRET_KEY=your-secret-key-here
DB_NAME=ccsms_db
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=CCSMS <noreply@ccsms.com>
REDIS_URL=redis://localhost:6379/0
```

### 3. Database Setup
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py seed_data
```

### 4. Create Superuser
```bash
python manage.py createsuperuser
```

### 5. Run Development Server
```bash
python manage.py runserver
```

### 6. Start Celery Worker (separate terminal)
```bash
celery -A ccsms worker -l info
```

### 7. Start Celery Beat (separate terminal)
```bash
celery -A ccsms beat -l info
```

## API Documentation
Visit `http://localhost:8000/api/docs/` for Swagger documentation

## Test Accounts
After running `seed_data`:
- Admin: admin1@ccsms.com / admin123
- Agent: agent1@ccsms.com / agent123  
- Customer: customer1@ccsms.com / customer123

## Key Features
- JWT Authentication
- Role-based permissions (Customer/Agent/Admin)
- Complaint management with SLA tracking
- File attachments
- Email notifications
- Background tasks with Celery
- Comprehensive analytics
- Audit logging

## API Endpoints

### Authentication
- POST /api/auth/register/
- POST /api/auth/login/
- POST /api/auth/refresh/
- POST /api/auth/change-password/

### Users
- GET /api/users/me/
- PUT /api/users/me/
- GET /api/users/ (Admin)
- GET /api/users/agents/ (Admin)

### Complaints
- GET /api/complaints/
- POST /api/complaints/
- GET /api/complaints/{id}/
- PUT /api/complaints/{id}/
- POST /api/complaints/{id}/assign/
- POST /api/complaints/{id}/resolve/
- POST /api/complaints/{id}/comments/
- POST /api/complaints/{id}/feedback/

### Analytics
- GET /api/analytics/dashboard/
- GET /api/analytics/complaints-by-category/
- GET /api/analytics/sla-report/
- GET /api/analytics/agent-performance/

### Notifications
- GET /api/notifications/
- PUT /api/notifications/{id}/read/
- GET /api/notifications/unread-count/

### Audit Logs
- GET /api/audit-logs/ (Admin)
- GET /api/audit-logs/complaint/{id}/ (Admin)
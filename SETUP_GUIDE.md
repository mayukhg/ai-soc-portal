# 🚀 SOC-AI Nexus Setup Guide

## Quick Start

### 1. Prerequisites
- Node.js 18+ 
- Python 3.9+
- Docker Desktop (for Supabase local development)
- Git

### 2. Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd ai-soc-nexus-2

# Run the setup script
./setup.sh
```

### 3. Admin User Setup

#### Option A: Using Supabase Local Development (Recommended)
```bash
# Install Docker Desktop first, then:
./create-admin-user.sh
```

#### Option B: Manual Database Setup
If you have a Supabase project set up, run the migration file:
```sql
-- Run the migration file: supabase/migrations/20250905102239-add-admin-user.sql
```

### 4. Access the Dashboard
- **URL**: `http://localhost:5173`
- **Email**: `mayukh@gmail.com`
- **Password**: `ajpap@29`
- **Role**: `admin`

## 🔐 Admin Credentials

### Default Admin User
- **Email**: `mayukh@gmail.com`
- **Password**: `ajpap@29`
- **Username**: `mayukh_admin`
- **Full Name**: `Mayukh Ghosh`
- **Role**: `admin`

### Sample Data Included
The admin user comes with pre-loaded sample data:
- 3 sample alerts (various severities)
- 2 sample incidents (malware, phishing)
- 2 threat intelligence indicators
- 4 KPI metrics
- Full admin privileges

## 🛠️ Development Commands

### Frontend Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

### Backend Development
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Test Lambda functions
python -m pytest
```

### Database Management
```bash
# Start Supabase local development
supabase start

# Apply migrations
supabase db reset

# Stop Supabase
supabase stop
```

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_PINECONE_API_KEY=your_pinecone_api_key
```

### Supabase Configuration
The project uses Supabase for:
- User authentication
- Database management
- Real-time subscriptions
- Edge functions

## 📊 Features

### Security Features
- ✅ Advanced threat detection
- ✅ Security analytics dashboard
- ✅ AI-powered incident analysis
- ✅ Real-time alert monitoring
- ✅ Threat intelligence integration
- ✅ KPI metrics and reporting

### User Roles
- **Admin**: Full access to all features
- **Management**: High-level oversight and reporting
- **Analyst Tier 3**: Advanced analysis capabilities
- **Analyst Tier 2**: Standard analysis tasks
- **Analyst Tier 1**: Basic monitoring and alerts

## 🚨 Troubleshooting

### Common Issues

#### Docker Not Running
```bash
# Start Docker Desktop, then:
supabase start
```

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :5173
lsof -i :8000

# Kill the process
kill -9 <PID>
```

#### Database Connection Issues
```bash
# Reset the database
supabase db reset

# Check Supabase status
supabase status
```

#### Permission Issues
```bash
# Make scripts executable
chmod +x setup.sh
chmod +x cleanup.sh
chmod +x create-admin-user.sh
```

## 📝 Logs and Monitoring

### Setup Logs
- **Location**: `setup.log`
- **Content**: Complete setup process with timestamps

### Admin User Creation Logs
- **Location**: `admin-user-creation.log`
- **Content**: User creation process and verification

### Deployment Report
- **Location**: `deployment-report.md`
- **Content**: Comprehensive deployment summary

## 🔄 Cleanup

### Stop All Services
```bash
./cleanup.sh
```

### Reset Everything
```bash
# Stop services
./cleanup.sh

# Reset database
supabase db reset

# Clean install
rm -rf node_modules
rm -rf backend/venv
npm install
```

## 📞 Support

For issues or questions:
1. Check the logs in `setup.log` and `admin-user-creation.log`
2. Verify all prerequisites are installed
3. Ensure Docker Desktop is running
4. Check the troubleshooting section above

## 🔒 Security Notes

⚠️ **Important**: The default admin credentials are for development/testing only. Change them in production!

🔐 **Production Setup**: Ensure proper password policies and user management procedures are in place.

📊 **Monitoring**: All admin actions are logged for audit purposes.

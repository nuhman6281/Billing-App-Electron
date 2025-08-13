# 🚀 Quick Start Guide

Get your Billing & Accounting Application up and running in minutes!

## ⚡ Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm 9+** - Comes with Node.js
- **Docker** - [Download here](https://www.docker.com/products/docker-desktop/)
- **Docker Compose** - Usually comes with Docker Desktop
- **Git** - [Download here](https://git-scm.com/)

## 🎯 Quick Setup (Automated)

### Option 1: One-Command Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/billing-accounting-app.git
cd billing-accounting-app

# Run the automated setup script
bash scripts/setup.sh
```

The setup script will:
- ✅ Check system requirements
- ✅ Create necessary directories
- ✅ Install all dependencies
- ✅ Set up environment files
- ✅ Start database services
- ✅ Build the application
- ✅ Start all services

### Option 2: Manual Setup

If you prefer to set up manually or the automated script fails:

```bash
# 1. Install dependencies
npm install

# 2. Copy environment files
cp packages/server/env.example packages/server/.env
cp packages/desktop/env.example packages/desktop/.env

# 3. Edit environment files with your values
nano packages/server/.env
nano packages/desktop/.env

# 4. Start database services
docker-compose up -d postgres redis

# 5. Setup database schema
cd packages/server
npm run setup:db
cd ../..

# 6. Build the application
npm run build

# 7. Start all services
docker-compose up -d
```

## 🔧 Environment Configuration

### Server Environment (.env)

Edit `packages/server/.env` with your actual values:

```env
# Database
DATABASE_URL=postgresql://billing_user:billing_password@localhost:5432/accounting

# JWT Secrets (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-minimum-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production-minimum-32-characters

# Server
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Redis
REDIS_URL=redis://:redis_password@localhost:6379
```

### Desktop Environment (.env)

Edit `packages/desktop/.env`:

```env
# API Configuration
API_BASE_URL=http://localhost:3001
API_TIMEOUT=30000

# App Configuration
APP_NAME="Billing & Accounting"
APP_VERSION=1.0.0
```

## 🚀 Starting the Application

### Development Mode

```bash
# Start all services (server + desktop)
npm run dev

# Or start individually
npm run dev:server    # Backend API only
npm run dev:desktop   # Electron app only
```

### Production Mode

```bash
# Build for production
npm run build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

## 🌐 Access Points

Once running, you can access:

- **🚀 Application**: http://localhost:3000
- **🔌 API Server**: http://localhost:3001
- **📊 Health Check**: http://localhost:3001/health
- **📚 API Docs**: http://localhost:3001/api-docs
- **🗄️ Database**: http://localhost:5050 (pgAdmin)
- **🔴 Redis**: http://localhost:8081 (Redis Commander)
- **📧 Email Testing**: http://localhost:8025 (MailHog)
- **🔍 Search**: http://localhost:5601 (Kibana)

## 🧪 Testing the Setup

### 1. Health Check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "development",
  "version": "1.0.0"
}
```

### 2. Database Connection

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check if Redis is running
docker-compose ps redis
```

### 3. API Endpoints

```bash
# Test authentication endpoint
curl http://localhost:3001/api/v1/auth/health

# Test users endpoint
curl http://localhost:3001/api/v1/users/health
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Check what's using the port
lsof -i :3001
lsof -i :3000

# Kill the process or change ports in .env
```

#### 2. Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart services
docker-compose restart postgres
```

#### 3. Dependencies Installation Failed

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 4. Docker Services Not Starting

```bash
# Check Docker status
docker info

# Restart Docker Desktop
# Then restart services
docker-compose down
docker-compose up -d
```

### Logs and Debugging

```bash
# View all service logs
npm run docker:logs

# View specific service logs
docker-compose logs server
docker-compose logs postgres
docker-compose logs redis

# Follow logs in real-time
docker-compose logs -f server
```

## 🔄 Development Workflow

### Making Changes

1. **Edit code** in your preferred editor
2. **Save files** - Hot reload will automatically restart services
3. **Check logs** for any errors
4. **Test endpoints** to verify changes

### Adding New Dependencies

```bash
# Add to root package.json
npm install new-package

# Add to specific package
cd packages/server
npm install new-package
cd ../..
```

### Database Changes

```bash
# Create new migration
cd packages/server
npx prisma migrate dev --name add_new_table

# Apply migrations
npx prisma migrate deploy

# Reset database (WARNING: This will delete all data!)
npx prisma migrate reset
```

## 📚 Next Steps

Now that you have the application running:

1. **📖 Read the Documentation**: Check out the full [README.md](README.md)
2. **🔐 Configure Security**: Update JWT secrets and passwords
3. **🌐 Set Up Domains**: Configure your domain and SSL certificates
4. **📊 Monitor Performance**: Set up monitoring and alerting
5. **🔄 Set Up CI/CD**: Configure automated testing and deployment
6. **📈 Scale Up**: Plan for production scaling and load balancing

## 🆘 Need Help?

- **📖 Documentation**: [docs/](docs/)
- **🐛 Issues**: [GitHub Issues](https://github.com/your-org/billing-accounting-app/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/your-org/billing-accounting-app/discussions)
- **📧 Support**: support@yourdomain.com

## 🎉 Congratulations!

You've successfully set up the Billing & Accounting Application! 

The application is now running with:
- ✅ **Backend API** on port 3001
- ✅ **Desktop App** on port 3000  
- ✅ **PostgreSQL Database** on port 5432
- ✅ **Redis Cache** on port 6379
- ✅ **All supporting services** running and healthy

Happy coding! 🚀

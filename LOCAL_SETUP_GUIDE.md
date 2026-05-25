# Local Setup Guide - Run Backend on Your Device

## Prerequisites

Make sure you have these installed:
- Node.js (v14 or higher)
- npm (comes with Node.js)

Check if installed:
```bash
node --version
npm --version
```

If not installed, download from: https://nodejs.org/

---

## Step 1: Install Dependencies

Open terminal in the `Render-Backend-main` folder and run:

```bash
cd Render-Backend-main
npm install
```

This will install all required packages (express, mongoose, cors, etc.)

---

## Step 2: Configure Environment Variables

Make sure your `.env` file has the correct MongoDB connection string:

```env
MONGO_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/your-database
PORT=5000
NODE_ENV=development
APPROVAL_PASSWORD=your_password
```

**Important:** Replace with your actual MongoDB credentials.

---

## Step 3: Start the Server

Run this command:

```bash
node server.js
```

You should see:
```
✅ MongoDB Connected Successfully
🚀 Server running on port 5000
```

---

## Step 4: Test the Backend

### Option 1: Using Browser
Open your browser and go to:
```
http://localhost:5000/api/applications
```

You should see a JSON array of applications.

### Option 2: Using Test Script
In a new terminal (keep server running):
```bash
node test-get-applications.js
```

### Option 3: Using curl
```bash
curl http://localhost:5000/api/applications
```

---

## Step 5: Connect Your Frontend

Update your frontend API URL to point to local backend:

```javascript
// In your frontend code
const API_URL = 'http://localhost:5000';

// Example usage
axios.get(`${API_URL}/api/applications`)
```

---

## Common Issues & Solutions

### Issue 1: Port Already in Use

**Error:** `Port 5000 is already in use`

**Solution:**
```bash
# Option A: Kill the process using port 5000
# Windows PowerShell:
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F

# Option B: Change port in .env
PORT=5001
```

### Issue 2: MongoDB Connection Failed

**Error:** `MongoDB Connection Error`

**Solutions:**
1. Check your MONGO_URI in `.env` file
2. Verify MongoDB Atlas IP whitelist includes your IP
3. Check database user credentials
4. Ensure cluster is active

### Issue 3: Module Not Found

**Error:** `Cannot find module 'express'`

**Solution:**
```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue 4: CORS Error in Frontend

**Error:** `Access-Control-Allow-Origin`

**Solution:** Backend already has CORS enabled. Make sure you're using the correct URL:
```javascript
// Use http://localhost:5000, not https
const API_URL = 'http://localhost:5000';
```

---

## Running in Development Mode

For auto-restart on file changes, install nodemon:

```bash
# Install nodemon globally
npm install -g nodemon

# Or install as dev dependency
npm install --save-dev nodemon

# Run with nodemon
nodemon server.js
```

Add to package.json:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

Then run:
```bash
npm run dev
```

---

## Stopping the Server

Press `Ctrl + C` in the terminal where server is running.

---

## Accessing from Other Devices on Same Network

### Step 1: Find Your Local IP

**Windows:**
```bash
ipconfig
# Look for IPv4 Address (e.g., 192.168.1.100)
```

**Mac/Linux:**
```bash
ifconfig
# Look for inet address
```

### Step 2: Update Frontend

```javascript
// Use your local IP instead of localhost
const API_URL = 'http://192.168.1.100:5000';
```

### Step 3: Allow Firewall Access

Make sure Windows Firewall allows Node.js connections on port 5000.

---

## Quick Start Commands

```bash
# Navigate to project
cd Render-Backend-main

# Install dependencies (first time only)
npm install

# Start server
node server.js

# Test endpoint (in new terminal)
node test-get-applications.js
```

---

## Environment Variables Explained

```env
# MongoDB connection string
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Server port (default: 5000)
PORT=5000

# Environment (development/production)
NODE_ENV=development

# Password for approval actions
APPROVAL_PASSWORD=your_secure_password

# Individual sales person passwords (optional)
SALES_PERSON_NAME_PASSWORD=password123
```

---

## Useful Commands

```bash
# Check if server is running
curl http://localhost:5000/api/applications

# View server logs
# (Just look at terminal where server is running)

# Stop server
# Press Ctrl + C

# Restart server
node server.js

# Clear npm cache (if issues)
npm cache clean --force
```

---

## Next Steps

1. ✅ Start backend server
2. ✅ Test endpoints work
3. ✅ Update frontend API URL
4. ✅ Test form submission
5. ✅ Verify cards display

---

## Need Help?

If you encounter issues:

1. Check server terminal for error messages
2. Check browser console (F12) for frontend errors
3. Verify MongoDB connection in `.env`
4. Make sure port 5000 is not blocked
5. Test with `node test-get-applications.js`

---

## Production Deployment

When ready to deploy:

1. Push code to GitHub (already done)
2. Deploy to Render/Heroku/Railway
3. Update environment variables on hosting platform
4. Update frontend API URL to production URL

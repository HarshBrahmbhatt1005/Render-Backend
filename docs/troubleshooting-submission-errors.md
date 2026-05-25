# Troubleshooting Submission Errors

## Common AxiosError Issues

### 1. Network Error / CORS Issue

**Symptoms:**
```
❌ Submit Error: AxiosError
Network Error
```

**Causes:**
- Backend server not running
- Wrong API URL in frontend
- CORS not configured properly
- Firewall blocking requests

**Solutions:**

#### Check if server is running
```bash
cd Render-Backend-main
node server.js
# Should see: ✅ MongoDB Connected Successfully
# Should see: 🚀 Server running on port 5000
```

#### Verify CORS configuration in server.js
```javascript
app.use(
  cors({
    origin: "*",  // Or specify your frontend URL
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  })
);
```

#### Check frontend API URL
```javascript
// Make sure this matches your backend URL
const API_URL = 'http://localhost:5000';  // or your deployed URL
```

---

### 2. Request Timeout

**Symptoms:**
```
❌ Submit Error: AxiosError
timeout of 10000ms exceeded
```

**Causes:**
- Database connection slow
- MongoDB not connected
- Large payload
- Network latency

**Solutions:**

#### Increase timeout in frontend
```javascript
axios.post(url, data, {
  timeout: 30000  // 30 seconds
})
```

#### Check MongoDB connection
```bash
# In server logs, look for:
✅ MongoDB Connected Successfully
# If you see connection errors, check MONGO_URI in .env
```

---

### 3. 400 Bad Request

**Symptoms:**
```
❌ Submit Error: AxiosError
Status: 400
Response: { error: "Missing required fields" }
```

**Causes:**
- Missing required fields (name, mobile)
- Invalid data format
- Empty form submission

**Solutions:**

#### Ensure required fields are sent
```javascript
const formData = {
  name: "John Doe",      // Required
  mobile: "9876543210",  // Required
  email: "john@example.com",
  // ... other fields
};
```

#### Check form validation
```javascript
if (!formData.name || !formData.mobile) {
  alert('Name and mobile are required');
  return;
}
```

---

### 4. 409 Conflict (Duplicate)

**Symptoms:**
```
❌ Submit Error: AxiosError
Status: 409
Response: { error: "Duplicate submission detected" }
```

**Causes:**
- Same data submitted within 5 seconds
- User clicked submit button multiple times
- Form resubmitted

**Solutions:**

#### This is expected behavior - inform user
```javascript
if (error.response?.status === 409) {
  alert('This application was already submitted. Please wait a few seconds before trying again.');
}
```

#### Disable submit button
```javascript
const [isSubmitting, setIsSubmitting] = useState(false);

<button 
  type="submit" 
  disabled={isSubmitting}
  onClick={() => setIsSubmitting(true)}
>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</button>
```

---

### 5. 500 Internal Server Error

**Symptoms:**
```
❌ Submit Error: AxiosError
Status: 500
Response: { error: "Server error" }
```

**Causes:**
- Database connection lost
- MongoDB validation error
- Server crash
- Missing environment variables

**Solutions:**

#### Check server logs
```bash
# Look for error messages in terminal where server is running
❌ Save Error: ...
```

#### Verify MongoDB connection
```bash
# Check .env file
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
```

#### Check MongoDB Atlas
- Ensure IP whitelist includes your server IP
- Verify database user credentials
- Check if cluster is active

---

## Debugging Steps

### Step 1: Check Server Status
```bash
cd Render-Backend-main
node server.js
```

Expected output:
```
✅ MongoDB Connected Successfully
🚀 Server running on port 5000
```

### Step 2: Test Endpoint Directly
```bash
# Using curl (Windows PowerShell)
curl -X POST http://localhost:5000/api/applications `
  -H "Content-Type: application/json" `
  -d '{"name":"Test","mobile":"9876543210","email":"test@example.com"}'

# Or use the test script
node test-submission.js
```

### Step 3: Check Browser Console
Open browser DevTools (F12) and check:
- Network tab for request/response details
- Console tab for JavaScript errors
- Request payload and headers

### Step 4: Check Server Logs
Look for these log messages:
```
📥 Received submission request
Request body keys: [ 'name', 'mobile', 'email', ... ]
✅ Application saved successfully: 507f1f77bcf86cd799439011
```

Or error messages:
```
❌ Save Error: ...
⚠️ Validation failed - missing required fields
```

---

## Frontend Error Handling Template

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    const response = await axios.post(
      'http://localhost:5000/api/applications',
      formData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    if (response.data.success) {
      alert('✅ Application submitted successfully!');
      // Reset form or redirect
    }

  } catch (error) {
    console.error('Submit Error:', error);

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          alert(`❌ Validation Error: ${data.details || data.message}`);
          break;
        case 409:
          alert(`⚠️ ${data.message || 'Duplicate submission detected'}`);
          break;
        case 500:
          alert('❌ Server error. Please try again later.');
          break;
        default:
          alert(`❌ Error: ${data.message || 'Submission failed'}`);
      }

    } else if (error.request) {
      // Request made but no response
      alert('❌ Network error. Please check your connection and try again.');
      console.error('No response received:', error.request);

    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      alert('❌ Request timeout. Please try again.');

    } else {
      // Other errors
      alert('❌ An error occurred. Please try again.');
      console.error('Error:', error.message);
    }

  } finally {
    setIsSubmitting(false);
  }
};
```

---

## Environment Variables Checklist

Ensure `.env` file has:
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
PORT=5000
NODE_ENV=development
APPROVAL_PASSWORD=your_password
```

---

## Quick Fixes

### Fix 1: Restart Server
```bash
# Stop server (Ctrl+C)
# Start again
node server.js
```

### Fix 2: Clear Cache
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Fix 3: Check MongoDB Connection
```javascript
// Add this to server.js temporarily
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected');
});
```

### Fix 4: Test with Postman/Insomnia
1. Open Postman
2. Create POST request to `http://localhost:5000/api/applications`
3. Set header: `Content-Type: application/json`
4. Set body (raw JSON):
```json
{
  "name": "Test User",
  "mobile": "9876543210",
  "email": "test@example.com"
}
```
5. Send request and check response

---

## Still Having Issues?

### Enable Debug Mode

Add to server.js:
```javascript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});
```

### Check Logs
```bash
# Run server with verbose logging
DEBUG=* node server.js
```

### Contact Support
Provide:
1. Error message from browser console
2. Server logs
3. Request payload
4. Response (if any)
5. Environment (local/deployed)

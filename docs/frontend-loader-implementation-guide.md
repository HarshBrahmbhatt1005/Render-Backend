# Frontend Loader Modal Implementation Guide

## Overview
This guide shows how to implement a loader modal that displays while submitting the real estate application form to the backend.

## Implementation Options

### Option 1: React with State Management (Recommended)

#### Step 1: Create Loader Component

```jsx
// components/LoaderModal.jsx
import React from 'react';
import './LoaderModal.css';

const LoaderModal = ({ isOpen, message = "Submitting your application..." }) => {
  if (!isOpen) return null;

  return (
    <div className="loader-modal-overlay">
      <div className="loader-modal-content">
        <div className="spinner"></div>
        <p className="loader-message">{message}</p>
        <p className="loader-submessage">Please wait, do not close this window</p>
      </div>
    </div>
  );
};

export default LoaderModal;
```

#### Step 2: Add Styles

```css
/* components/LoaderModal.css */
.loader-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.loader-modal-content {
  background: white;
  padding: 40px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.spinner {
  width: 60px;
  height: 60px;
  border: 6px solid #f3f3f3;
  border-top: 6px solid #3498db;
  border-radius: 50%;
  margin: 0 auto 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loader-message {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 10px 0;
}

.loader-submessage {
  font-size: 14px;
  color: #666;
  margin: 0;
}
```

#### Step 3: Integrate with Form

```jsx
// pages/ApplicationForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import LoaderModal from '../components/LoaderModal';

const ApplicationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    // ... other fields
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    // Show loader
    setIsSubmitting(true);
    setLoaderMessage('Submitting your application...');

    try {
      const response = await axios.post(
        'http://localhost:5000/api/applications',
        formData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000 // 30 second timeout
        }
      );

      if (response.data.success) {
        setLoaderMessage('Application submitted successfully!');
        
        // Keep success message visible for 1 second
        setTimeout(() => {
          setIsSubmitting(false);
          alert('Application submitted successfully!');
          // Reset form or redirect
          setFormData({
            name: '',
            mobile: '',
            email: '',
            // ... reset other fields
          });
        }, 1000);
      }
    } catch (error) {
      setIsSubmitting(false);
      
      if (error.response) {
        // Server responded with error
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 409) {
          // Duplicate submission
          alert(data.message || 'This application was already submitted');
        } else if (status === 400) {
          // Validation error
          alert(data.details || data.message || 'Please fill all required fields');
        } else if (status === 500) {
          // Server error
          alert('Server error. Please try again later.');
        } else {
          alert(data.message || 'Submission failed');
        }
      } else if (error.request) {
        // No response from server
        alert('Network error. Please check your connection and try again.');
      } else {
        // Other errors
        alert('An error occurred. Please try again.');
      }
      
      console.error('Submission error:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <>
      <LoaderModal isOpen={isSubmitting} message={loaderMessage} />
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label>Mobile *</label>
          <input
            type="tel"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>

        {/* ... other form fields ... */}

        <button 
          type="submit" 
          disabled={isSubmitting}
          className={isSubmitting ? 'btn-disabled' : 'btn-primary'}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </>
  );
};

export default ApplicationForm;
```

---

### Option 2: Vanilla JavaScript (No Framework)

#### HTML Structure

```html
<!-- Add this to your HTML file -->
<div id="loaderModal" class="loader-modal-overlay" style="display: none;">
  <div class="loader-modal-content">
    <div class="spinner"></div>
    <p class="loader-message" id="loaderMessage">Submitting your application...</p>
    <p class="loader-submessage">Please wait, do not close this window</p>
  </div>
</div>
```

#### JavaScript Implementation

```javascript
// utils/loader.js
const LoaderModal = {
  show: (message = 'Submitting your application...') => {
    const modal = document.getElementById('loaderModal');
    const messageEl = document.getElementById('loaderMessage');
    if (modal && messageEl) {
      messageEl.textContent = message;
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
  },
  
  hide: () => {
    const modal = document.getElementById('loaderModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = ''; // Restore scrolling
    }
  },
  
  updateMessage: (message) => {
    const messageEl = document.getElementById('loaderMessage');
    if (messageEl) {
      messageEl.textContent = message;
    }
  }
};

// Form submission handler
document.getElementById('applicationForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Show loader
  LoaderModal.show('Submitting your application...');
  
  // Disable submit button
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  
  try {
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    const response = await fetch('http://localhost:5000/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      LoaderModal.updateMessage('Application submitted successfully!');
      
      setTimeout(() => {
        LoaderModal.hide();
        alert('Application submitted successfully!');
        e.target.reset(); // Reset form
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }, 1000);
    } else {
      LoaderModal.hide();
      
      if (response.status === 409) {
        alert(result.message || 'This application was already submitted');
      } else if (response.status === 400) {
        alert(result.details || result.message || 'Please fill all required fields');
      } else {
        alert(result.message || 'Submission failed');
      }
      
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  } catch (error) {
    LoaderModal.hide();
    alert('Network error. Please check your connection and try again.');
    console.error('Submission error:', error);
    
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});
```

---

### Option 3: Using Popular UI Libraries

#### With Material-UI (MUI)

```jsx
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  CircularProgress, 
  Typography, 
  Box 
} from '@mui/material';

const ApplicationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <>
      <Dialog 
        open={isSubmitting} 
        disableEscapeKeyDown
        PaperProps={{
          style: { padding: '20px', textAlign: 'center' }
        }}
      >
        <DialogContent>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Submitting your application...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Please wait, do not close this window
          </Typography>
        </DialogContent>
      </Dialog>
      
      {/* Your form here */}
    </>
  );
};
```

#### With Bootstrap

```jsx
import React, { useState } from 'react';
import { Modal, Spinner } from 'react-bootstrap';

const ApplicationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <>
      <Modal 
        show={isSubmitting} 
        backdrop="static" 
        keyboard={false}
        centered
      >
        <Modal.Body className="text-center py-4">
          <Spinner animation="border" variant="primary" style={{ width: '60px', height: '60px' }} />
          <h5 className="mt-3">Submitting your application...</h5>
          <p className="text-muted">Please wait, do not close this window</p>
        </Modal.Body>
      </Modal>
      
      {/* Your form here */}
    </>
  );
};
```

---

## Best Practices

### 1. Prevent Multiple Submissions
```javascript
// Disable form inputs while submitting
const disableForm = (form, disabled) => {
  const inputs = form.querySelectorAll('input, select, textarea, button');
  inputs.forEach(input => input.disabled = disabled);
};
```

### 2. Add Timeout Protection
```javascript
const SUBMISSION_TIMEOUT = 30000; // 30 seconds

const submitWithTimeout = async (url, data) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUBMISSION_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};
```

### 3. Handle Network Errors Gracefully
```javascript
try {
  // submission code
} catch (error) {
  if (error.name === 'AbortError') {
    alert('Request timeout. Please try again.');
  } else if (!navigator.onLine) {
    alert('No internet connection. Please check your network.');
  } else {
    alert('An error occurred. Please try again.');
  }
}
```

### 4. Show Progress Updates (Optional)
```javascript
const [progress, setProgress] = useState(0);

// Simulate progress
const simulateProgress = () => {
  let current = 0;
  const interval = setInterval(() => {
    current += 10;
    setProgress(current);
    if (current >= 90) clearInterval(interval);
  }, 300);
  return interval;
};
```

---

## Complete Example with All Features

```jsx
import React, { useState } from 'react';
import axios from 'axios';
import './ApplicationForm.css';

const LoaderModal = ({ isOpen, message, progress }) => {
  if (!isOpen) return null;

  return (
    <div className="loader-modal-overlay">
      <div className="loader-modal-content">
        <div className="spinner"></div>
        <p className="loader-message">{message}</p>
        <p className="loader-submessage">Please wait, do not close this window</p>
        {progress > 0 && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        )}
      </div>
    </div>
  );
};

const ApplicationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState('');
  const [progress, setProgress] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setLoaderMessage('Validating your information...');
    setProgress(20);

    try {
      // Simulate validation delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setLoaderMessage('Submitting your application...');
      setProgress(50);

      const response = await axios.post(
        'http://localhost:5000/api/applications',
        formData,
        { timeout: 30000 }
      );

      setProgress(90);

      if (response.data.success) {
        setLoaderMessage('Application submitted successfully!');
        setProgress(100);
        
        setTimeout(() => {
          setIsSubmitting(false);
          setProgress(0);
          alert('✅ Application submitted successfully!');
          setFormData({ name: '', mobile: '', email: '' });
        }, 1500);
      }
    } catch (error) {
      setIsSubmitting(false);
      setProgress(0);
      
      if (error.response?.status === 409) {
        alert('⚠️ ' + (error.response.data.message || 'Duplicate submission'));
      } else if (error.response?.status === 400) {
        alert('❌ ' + (error.response.data.details || 'Validation error'));
      } else {
        alert('❌ Submission failed. Please try again.');
      }
    }
  };

  return (
    <>
      <LoaderModal 
        isOpen={isSubmitting} 
        message={loaderMessage}
        progress={progress}
      />
      
      <form onSubmit={handleSubmit} className="application-form">
        <input
          type="text"
          name="name"
          placeholder="Name *"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
          disabled={isSubmitting}
        />
        
        <input
          type="tel"
          name="mobile"
          placeholder="Mobile *"
          value={formData.mobile}
          onChange={(e) => setFormData({...formData, mobile: e.target.value})}
          required
          disabled={isSubmitting}
        />
        
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          disabled={isSubmitting}
        />
        
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </>
  );
};

export default ApplicationForm;
```

---

## Summary

Choose the implementation that matches your frontend stack:
- **React**: Use Option 1 with state management
- **Vanilla JS**: Use Option 2 with plain JavaScript
- **UI Library**: Use Option 3 with MUI or Bootstrap

All implementations provide:
✅ Visual feedback during submission
✅ Prevention of multiple submissions
✅ Proper error handling
✅ User-friendly messages
✅ Disabled form inputs while submitting

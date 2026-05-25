// Test script for GET applications endpoint
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5000';

async function testGetApplications() {
  console.log('🧪 Testing GET /api/applications endpoint...\n');
  console.log('API URL:', `${API_URL}/api/applications`);
  console.log('\n---\n');

  try {
    const response = await axios.get(`${API_URL}/api/applications`, {
      timeout: 10000
    });

    console.log('✅ Success!');
    console.log('Status:', response.status);
    console.log('Response Type:', Array.isArray(response.data) ? 'Array' : typeof response.data);
    console.log('Number of applications:', Array.isArray(response.data) ? response.data.length : 'N/A');
    
    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log('\n📋 First application sample:');
      console.log(JSON.stringify(response.data[0], null, 2));
      
      console.log('\n📋 Application fields:');
      console.log('Keys:', Object.keys(response.data[0]));
    } else if (Array.isArray(response.data) && response.data.length === 0) {
      console.log('\n⚠️ No applications found in database');
    } else {
      console.log('\n⚠️ Unexpected response format:');
      console.log(JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error occurred:');
    
    if (error.response) {
      // Server responded with error
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // No response received
      console.error('No response from server');
      console.error('Is the server running on', API_URL, '?');
    } else {
      // Other error
      console.error('Error:', error.message);
    }
  }
}

// Run test
testGetApplications();

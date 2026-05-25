// Test script for submission endpoint
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5000';

const testData = {
  name: "Test User",
  mobile: "9876543210",
  email: "test@example.com",
  product: "Home Loan",
  amount: "5000000",
  bank: "HDFC",
  status: "Login",
  sales: "Test Sales"
};

async function testSubmission() {
  console.log('🧪 Testing submission endpoint...\n');
  console.log('API URL:', `${API_URL}/api/applications`);
  console.log('Test Data:', JSON.stringify(testData, null, 2));
  console.log('\n---\n');

  try {
    const response = await axios.post(
      `${API_URL}/api/applications`,
      testData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ Success!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error occurred:');
    
    if (error.response) {
      // Server responded with error
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // No response received
      console.error('No response from server');
      console.error('Request details:', error.request);
    } else {
      // Other error
      console.error('Error:', error.message);
    }
    
    console.error('\nFull error:', error);
  }
}

// Test duplicate submission
async function testDuplicateSubmission() {
  console.log('\n\n🧪 Testing duplicate submission prevention...\n');
  
  try {
    // First submission
    console.log('Submitting first time...');
    const response1 = await axios.post(`${API_URL}/api/applications`, testData);
    console.log('✅ First submission successful:', response1.status);
    
    // Immediate duplicate
    console.log('\nSubmitting duplicate immediately...');
    const response2 = await axios.post(`${API_URL}/api/applications`, testData);
    console.log('❌ Duplicate was NOT blocked! Status:', response2.status);
    
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('✅ Duplicate correctly blocked with 409 status');
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('❌ Unexpected error:', error.response?.status || error.message);
    }
  }
}

// Run tests
(async () => {
  await testSubmission();
  
  // Uncomment to test duplicate prevention
  // await testDuplicateSubmission();
})();

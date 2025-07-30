import { checkAndRecordUpload } from './utils/uploadLimiter.js';

// Test data for simulating uploads
const testUserId = 'test-user-123';
const createTestUploadData = (index) => ({
  user_id: testUserId,
  image_url: 'inline',
  food_items: [`Test Food ${index}`],
  total_calories: 100 + index,
  explanation: `Test explanation ${index}`,
  nutrition_table: null,
  serving_size: '1 serving',
  confidence_score: 0.9,
  ip_address: '127.0.0.1',
});

async function testConcurrentUploads() {
  console.log('🧪 Starting concurrent upload test...');
  
  // Clear any existing test data first (in a real scenario, this would be handled by daily reset)
  console.log('⚠️  Note: This test assumes a clean state or daily reset for the test user');
  
  // Create 5 concurrent upload attempts (should only allow 3)
  const uploadPromises = [];
  for (let i = 1; i <= 5; i++) {
    const uploadData = createTestUploadData(i);
    uploadPromises.push(
      checkAndRecordUpload(testUserId, uploadData)
        .then(result => ({ attempt: i, result }))
        .catch(error => ({ attempt: i, error }))
    );
  }
  
  // Wait for all uploads to complete
  const results = await Promise.all(uploadPromises);
  
  console.log('\n📊 Test Results:');
  console.log('================');
  
  let successCount = 0;
  let limitReachedCount = 0;
  let errorCount = 0;
  
  results.forEach(({ attempt, result, error }) => {
    if (error) {
      console.log(`❌ Attempt ${attempt}: Error - ${error.message}`);
      errorCount++;
    } else if (result.success) {
      console.log(`✅ Attempt ${attempt}: Success - Usage: ${result.usage.current}/${result.usage.max}`);
      successCount++;
    } else {
      console.log(`🚫 Attempt ${attempt}: Limit Reached - ${result.error.message}`);
      limitReachedCount++;
    }
  });
  
  console.log('\n📈 Summary:');
  console.log(`✅ Successful uploads: ${successCount}`);
  console.log(`🚫 Limit reached: ${limitReachedCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  
  // Verify the expected behavior
  if (successCount === 3 && limitReachedCount === 2 && errorCount === 0) {
    console.log('\n🎉 TEST PASSED: Exactly 3 uploads succeeded, 2 were blocked by limit');
  } else {
    console.log('\n⚠️  TEST ISSUES: Expected 3 successes, 2 limit blocks, 0 errors');
    console.log('This might indicate a race condition or other issue');
  }
  
  return {
    successCount,
    limitReachedCount,
    errorCount,
    passed: successCount === 3 && limitReachedCount === 2 && errorCount === 0
  };
}

async function testSequentialUploads() {
  console.log('\n🔄 Starting sequential upload test...');
  
  const results = [];
  for (let i = 1; i <= 5; i++) {
    const uploadData = createTestUploadData(i + 10); // Different data from concurrent test
    try {
      const result = await checkAndRecordUpload(testUserId, uploadData);
      results.push({ attempt: i, result });
      console.log(`Attempt ${i}: ${result.success ? 'Success' : 'Failed'} - ${result.success ? `Usage: ${result.usage.current}/${result.usage.max}` : result.error.message}`);
    } catch (error) {
      results.push({ attempt: i, error });
      console.log(`Attempt ${i}: Error - ${error.message}`);
    }
  }
  
  return results;
}

// Run the tests
async function runTests() {
  try {
    console.log('🚀 Upload Limit Race Condition Test');
    console.log('===================================');
    
    const concurrentResults = await testConcurrentUploads();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
    
    console.log('\n' + '='.repeat(50));
    await testSequentialUploads();
    
    if (concurrentResults.passed) {
      console.log('\n🎉 Overall Assessment: Upload limiting appears to be working correctly!');
    } else {
      console.log('\n⚠️  Overall Assessment: There may be issues with upload limiting that need investigation.');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Export for use in other test files
export { testConcurrentUploads, testSequentialUploads };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}
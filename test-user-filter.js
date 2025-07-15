// Test user filtering logic
// Run this in the browser console on the experiments page

// Get all experiment cards
const cards = document.querySelectorAll('[data-experiment-id]');
console.log(`Found ${cards.length} experiment cards`);

// Check if user filter is visible
const userFilterButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Users'));
if (userFilterButton) {
  console.log('✅ User filter button found');
  
  // Click to open dropdown
  userFilterButton.click();
  
  setTimeout(() => {
    // Check for user options
    const userOptions = document.querySelectorAll('[role="menuitemcheckbox"]');
    console.log(`Found ${userOptions.length} user/team options in dropdown`);
    
    // Try to find Ben and Alice
    const benOption = Array.from(userOptions).find(opt => opt.textContent.includes('Ben'));
    const aliceOption = Array.from(userOptions).find(opt => opt.textContent.includes('Alice'));
    
    console.log('Ben option:', benOption ? '✅ Found' : '❌ Not found');
    console.log('Alice option:', aliceOption ? '✅ Found' : '❌ Not found');
    
    // Close dropdown
    document.body.click();
  }, 500);
} else {
  console.log('❌ User filter button not found');
}

// Check localStorage for current user
const currentUser = localStorage.getItem('mltrack_current_user');
if (currentUser) {
  console.log('Current user in localStorage:', JSON.parse(currentUser));
} else {
  console.log('No current user set in localStorage');
}
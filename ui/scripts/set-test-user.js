// Script to set the current user in browser localStorage for testing
// Run this in the browser console while on the mltrack UI

// Set Ben as the current user
localStorage.setItem('mltrack_current_user', JSON.stringify({
  id: '3c699ebd5f7e',
  email: 'ben@workhelix.com', 
  name: 'Ben Labaschin',
  team: null
}));

console.log('✅ Current user set to Ben Labaschin');
console.log('Refresh the page to see "My Runs Only" filter in action');

// To set Alice as current user instead:
/*
localStorage.setItem('mltrack_current_user', JSON.stringify({
  id: 'alice123',
  email: 'alice@example.com',
  name: 'Alice Johnson', 
  team: 'Research'
}));
*/
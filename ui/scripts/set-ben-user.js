// Set Ben as the current user in localStorage
// Run this in browser console

localStorage.setItem('mltrack_current_user', JSON.stringify({
  id: '3c699ebd5f7e',
  email: 'ben@workhelix.com', 
  name: 'Ben Labaschin'
}));

console.log('✅ Current user set to Ben Labaschin');
console.log('Refresh the page to see "My Runs Only" filter option');
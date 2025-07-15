# User Filtering Demo Instructions

The user filtering feature is now implemented in the MLtrack UI. Here's how to test it:

## Setup

1. **UI is running on**: http://localhost:3000
2. **MLflow API is on**: http://localhost:5002

## Available Users

We have 2 users with runs:
- **Ben Labaschin** (ben@workhelix.com) - 9 runs
- **Alice Johnson** (alice@example.com) - 1 run, Team: Research

## Testing User Filtering

1. **Navigate to Experiments Page**
   - Go to http://localhost:3000/experiments
   - You should see the "ml-team/mltrack/experiments" experiment

2. **User Filter Dropdown**
   - Look for the "Users" button in the filter bar (next to Model Types)
   - Click it to see available users and teams

3. **Filter Options**
   - **Individual Users**: Check "Ben Labaschin" or "Alice Johnson" to see only their experiments
   - **Teams**: Check "Research" to see experiments from Research team members
   - **My Runs Only**: This requires setting your current user (see below)

4. **Setting Current User for "My Runs Only"**
   - Open browser console (F12)
   - Run this to set yourself as Ben:
   ```javascript
   localStorage.setItem('mltrack_current_user', JSON.stringify({
     id: '3c699ebd5f7e',
     email: 'ben@workhelix.com', 
     name: 'Ben Labaschin'
   }));
   ```
   - Refresh the page
   - Now "My Runs Only" will filter to Ben's runs

5. **View Filtering Results**
   - When filters are active, experiments without matching runs will be hidden
   - The summary text shows "Filtered by user" when filters are active
   - Filter count badge shows number of active filters

## Important Notes

- User filtering is based on run data, so it only shows experiments that have runs from selected users
- The filtering happens client-side for real-time updates
- Run data is only fetched when user filters are active (performance optimization)

## Troubleshooting

If you don't see user data:
1. Check that runs have user tags: `find mlruns -name "mltrack.user.*" -type f | head`
2. Verify the API is working: `curl http://localhost:3000/api/users`
3. Check browser console for errors
4. Make sure MLflow server is running on port 5002
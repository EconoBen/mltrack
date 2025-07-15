# User Filtering Implementation Status

## What's Been Fixed

### 1. Dashboard ML Experiments Count
- **Issue**: Was showing 0 for ML experiments (using hardcoded name checks)
- **Fix**: Now properly fetches experiment stats and counts by type (ML/LLM/Mixed)
- **Status**: ✅ Fixed

### 2. User Filtering API Path
- **Issue**: Client was calling wrong API endpoint `/api/mlflow` instead of full path
- **Fix**: Updated to call `/api/mlflow/api/2.0/mlflow/runs/search`
- **Status**: ✅ Fixed

### 3. Port Management
- **Issue**: Port 5000 conflicts with macOS AirPlay
- **Fix**: Added `kill_process_on_port()` function and fallback to port 5002
- **Status**: ✅ Fixed

## Current State

### Working Features
1. **User API** (`/api/users`): Returns correct user data
   - Ben Labaschin (9 runs)
   - Alice Johnson (1 run, Research team)

2. **Run Tags**: Properly set with user information
   - `mltrack.user.id`, `mltrack.user.email`, `mltrack.user.name`, `mltrack.user.team`
   - `mltrack.category` correctly set to "ml" or "llm"

3. **MLflow Server**: Running on port 5002
4. **UI**: Running on port 3000

### Known Issues

1. **User Filtering Not Hiding Experiments**
   - The filtering logic is correct but experiments still show when users are selected
   - This is because the data fetching happens asynchronously
   - Need to ensure loading states are handled properly

2. **Performance**
   - Each experiment card fetches its own run data when filters are active
   - Could be optimized to batch these requests

## How to Test

1. **Open UI**: http://localhost:3000
2. **Navigate to Experiments**: Click "Experiments" in sidebar
3. **Open User Filter**: Click "Users" button in filter bar
4. **Select Users**: Check "Ben Labaschin" or "Alice Johnson"
5. **Expected**: Only experiments with runs from selected users should show

## Debug Commands

```bash
# Check user tags in runs
curl -X POST http://localhost:3000/api/users | jq

# Check runs in an experiment
curl -X POST http://localhost:3000/api/mlflow/api/2.0/mlflow/runs/search \
  -H "Content-Type: application/json" \
  -d '{"experiment_ids": ["795316296244659681"], "max_results": 2}' | jq

# Set current user in browser console
localStorage.setItem('mltrack_current_user', JSON.stringify({
  id: '3c699ebd5f7e',
  email: 'ben@workhelix.com', 
  name: 'Ben Labaschin'
}));
```
import { NextRequest, NextResponse } from 'next/server';

const MLFLOW_BASE_URL = process.env.MLFLOW_TRACKING_URI || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  try {
    // Get all experiments first
    const experimentsResponse = await fetch(`${MLFLOW_BASE_URL}/api/2.0/mlflow/experiments/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_results: 1000 }),
    });
    
    if (!experimentsResponse.ok) {
      throw new Error('Failed to fetch experiments');
    }
    
    const experimentsData = await experimentsResponse.json();
    const experiments = experimentsData.experiments || [];
    
    // Collect unique users from all runs
    const userMap = new Map<string, any>();
    const teamSet = new Set<string>();
    
    // Fetch runs for each experiment
    for (const exp of experiments) {
      try {
        const runsResponse = await fetch(`${MLFLOW_BASE_URL}/api/2.0/mlflow/runs/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            experiment_ids: [exp.experiment_id],
            max_results: 100, // Limit to recent runs
          }),
        });
        
        if (!runsResponse.ok) continue;
        
        const runsData = await runsResponse.json();
        const runs = runsData.runs || [];
        
        // Extract user info from runs
        for (const run of runs) {
          const tags = run.data?.tags || [];
          
          // Handle both array and object tag formats
          let userTags: Record<string, string> = {};
          
          if (Array.isArray(tags)) {
            // Array format: [{key: 'mltrack.user.id', value: '123'}, ...]
            for (const tag of tags) {
              if (tag.key?.startsWith('mltrack.user.') || tag.key === 'user') {
                userTags[tag.key] = tag.value;
              }
            }
          } else if (typeof tags === 'object') {
            // Object format: {'mltrack.user.id': '123', ...}
            for (const [key, value] of Object.entries(tags)) {
              if (key.startsWith('mltrack.user.') || key === 'user') {
                userTags[key] = value as string;
              }
            }
          }
          
          // Extract user information
          const userId = userTags['mltrack.user.id'];
          const userEmail = userTags['mltrack.user.email'] || userTags['user'];
          const userName = userTags['mltrack.user.name'] || userEmail;
          const userTeam = userTags['mltrack.user.team'];
          
          if (userId && !userMap.has(userId)) {
            userMap.set(userId, {
              id: userId,
              email: userEmail,
              name: userName,
              team: userTeam,
            });
          }
          
          if (userTeam) {
            teamSet.add(userTeam);
          }
        }
      } catch (error) {
        console.error(`Failed to fetch runs for experiment ${exp.experiment_id}:`, error);
      }
    }
    
    // Convert to arrays
    const users = Array.from(userMap.values());
    const teams = Array.from(teamSet);
    
    return NextResponse.json({
      users,
      teams,
      total: users.length,
    });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', users: [], teams: [] },
      { status: 500 }
    );
  }
}
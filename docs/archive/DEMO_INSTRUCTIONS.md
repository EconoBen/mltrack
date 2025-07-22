# MLTrack Demo Instructions

## Quick Start Demo

### 1. Install MLTrack (if not already installed)
```bash
cd /Users/blabaschin/Documents/GitHub/mltrack
pip install -e .
```

### 2. Start MLflow Server
Open a terminal and run:
```bash
cd /Users/blabaschin/Documents/GitHub/mltrack
mlflow server --host 0.0.0.0 --port 5001
```

### 3. Start the UI Development Server
In another terminal:
```bash
cd /Users/blabaschin/Documents/GitHub/mltrack/ui
npm install  # Only needed first time
npm run dev
```

### 4. Run the Test Script
In a third terminal:
```bash
cd /Users/blabaschin/Documents/GitHub/mltrack
python test_mltrack.py
```

### 5. View the Results

#### In MLflow UI (http://localhost:5001):
1. Look for the "simple-test" run
2. Click on it to see details
3. Check the **Artifacts** tab - you should see:
   - `lineage/lineage.json` - The complete lineage data
4. Check the **Tags** - look for:
   - `mltrack.has_lineage: true`
   - `mltrack.lineage.num_inputs: 1`
   - `mltrack.lineage.num_outputs: 1`
   - `mltrack.lineage.num_transforms: 1`

#### In MLTrack UI (http://localhost:3001):
1. Navigate to **Analytics** page
2. Click on the **Reports** tab
3. You should see:
   - Report generation controls
   - Dynamic insights based on your data
   - Export options (JSON, CSV, PDF, Excel)

4. Navigate to **Experiments** page
5. Find your experiment and click on a run
6. Look for the **Lineage** tab (only appears if run has lineage data)
7. You'll see an interactive graph showing:
   - Input data sources
   - Transformations applied
   - Output artifacts

### 6. Run the Full Lineage Example (Optional)
For a more complex demo with multiple connected runs:
```bash
python examples/lineage_example.py
```

This creates a pipeline with:
- Data preprocessing step
- Model training step (depends on preprocessing)
- Model evaluation step (depends on training)

Each step tracks its lineage and creates parent/child relationships.

## Troubleshooting

### Reports Tab is Blank
1. Make sure you have some runs with data
2. Check browser console for errors (F12)
3. Ensure the API endpoint is accessible: http://localhost:3001/api/reports/insights

### Lineage Tab Not Showing
1. The run must have lineage data (check for `mltrack.has_lineage` tag)
2. Refresh the page after running the test script
3. Make sure reactflow is installed: `cd ui && npm install`

### No Insights Showing
1. You need at least a few runs for insights to be meaningful
2. Try changing the date range or report type
3. Check that runs have metrics (cost, accuracy, etc.)

## What You Should See

### Reports Tab Features:
- **Report Type Selector**: Executive, Technical, Cost, Performance, Usage
- **Date Range Picker**: Filter data by date
- **Export Buttons**: JSON, CSV, PDF, Excel
- **Report Sections**: Dynamic based on report type
- **Quick Insights**: AI-generated insights with icons and descriptions

### Lineage Visualization Features:
- **Interactive Graph**: Zoom, pan, and click on nodes
- **Node Types**:
  - Blue: Input data sources
  - Purple: Transformations
  - Orange: ML runs
  - Green: Output artifacts
- **Minimap**: For navigation
- **Controls**: Zoom in/out, fit to view
- **Click Navigation**: Click on run nodes to navigate to their details

## Example Insights You Might See:
- 🟢 "Performance Improvement: Success rate improved by X% in recent runs"
- 🟡 "Cost Optimization: Switching from Model A to Model B could save ~Y%"
- 🔵 "High Usage Volume: Processing Z runs per day across N users"
- 🔴 "Common Error Pattern: Timeout errors account for M failures"

## Next Steps
1. Create more runs with different parameters
2. Try different report types to see various insights
3. Export reports in different formats
4. Create a multi-step pipeline to see complex lineage graphs
5. Use the lineage tracking in your own ML workflows
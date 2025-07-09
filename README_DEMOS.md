# MLtrack Demo Scripts

This directory contains several demonstration scripts showcasing MLtrack's capabilities. Each script focuses on different aspects of ML and LLM tracking.

## Available Demos

### 1. **demo_quick_start.py** - Minimal Example (< 20 lines)
The simplest possible example showing how easy it is to track ML experiments.
```bash
python demo_quick_start.py
```
- Shows basic @track decorator usage
- Trains a Random Forest model
- Zero configuration required

### 2. **demo_hyperparameter_sweep.py** - ML Model Comparison
Demonstrates tracking multiple experiments across different models and hyperparameters.
```bash
python demo_hyperparameter_sweep.py
```
- Random Forest experiments (different n_estimators and max_depth)
- SVM experiments (different C values and kernels)
- Logistic Regression experiments (L1/L2 penalties)
- Perfect for comparing model performance

### 3. **demo_llm_costs.py** - LLM Cost Tracking
Shows real-time cost accumulation across different LLM models and tasks.
```bash
export OPENAI_API_KEY='your-key-here'
python demo_llm_costs.py
```
- Compares GPT-3.5 vs GPT-4 costs
- Different task types (classification, code generation, summarization)
- Token usage tracking
- Cost estimation

### 4. **demo_unified_workflow.py** - ML + LLM Integration
Demonstrates combining traditional ML with LLM-powered insights.
```bash
export OPENAI_API_KEY='your-key-here'
python demo_unified_workflow.py
```
- Trains ML models on iris and wine datasets
- Uses LLM to explain feature importance
- Auto-generates documentation
- Suggests model improvements

### 5. **demo_script.py** - Comprehensive Showcase
The full demo covering all MLtrack features.
```bash
# For full demo with both ML and LLM:
export OPENAI_API_KEY='your-key-here'
export ANTHROPIC_API_KEY='your-key-here'
python demo_script.py
```
- Multiple ML experiments
- OpenAI and Anthropic tracking
- Cost comparison
- Combined workflows

## Running the Demos

1. **Install mltrack** (if not already installed):
   ```bash
   uv add mltrack
   # or
   pip install mltrack
   ```

2. **Set up API keys** (for LLM demos):
   ```bash
   export OPENAI_API_KEY='your-openai-key'
   export ANTHROPIC_API_KEY='your-anthropic-key'
   ```

3. **Run a demo**:
   ```bash
   python demo_quick_start.py
   ```

4. **View results**:
   ```bash
   mltrack ui  # Opens Aim UI at http://localhost:43800
   ```

## What to Look for in the UI

### Aim UI Features:
- **Experiments Table**: Compare all runs side-by-side
- **Metrics Explorer**: Interactive plots of accuracy, loss, etc.
- **Hyperparameter Analysis**: See impact of parameters on performance
- **LLM Tracking**: Token usage, costs, and response times
- **Run Details**: Full parameters, metrics, and artifacts

### Key Metrics Tracked:
- **ML Models**: accuracy, training time, feature importance
- **LLM Calls**: tokens (input/output), cost, latency, model used
- **System**: memory usage, compute time
- **Git**: code version, uncommitted changes

## Tips for Demos

1. **For presentations**: Start with `demo_quick_start.py` to show simplicity
2. **For cost analysis**: Use `demo_llm_costs.py` to show ROI
3. **For ML teams**: Focus on `demo_hyperparameter_sweep.py`
4. **For showcasing integration**: Use `demo_unified_workflow.py`

## Customizing Demos

Feel free to modify these scripts for your specific use case:
- Change models and hyperparameters
- Add your own datasets
- Modify LLM prompts
- Add custom metrics

## Troubleshooting

- **"OPENAI_API_KEY not set"**: Export your API key first
- **"No module named mltrack"**: Install with `uv add mltrack`
- **Port already in use**: Change port with `mltrack ui --port 8080`
- **Can't see experiments**: Make sure you're in the right directory

#!/bin/bash
# Run MLtrack demos interactively

echo "🚀 MLtrack Demo Runner"
echo "====================="
echo ""
echo "Available demos:"
echo "1. Quick Start (minimal example)"
echo "2. Hyperparameter Sweep (ML model comparison)"
echo "3. LLM Cost Tracking (requires OpenAI API key)"
echo "4. Unified ML+LLM Workflow (requires OpenAI API key)"
echo "5. Comprehensive Demo (all features)"
echo "6. Run ALL demos"
echo ""
read -p "Select demo (1-6): " choice

# Function to check API keys
check_api_keys() {
    if [ -z "$OPENAI_API_KEY" ]; then
        echo "⚠️  OPENAI_API_KEY not set"
        echo "   This demo requires an OpenAI API key."
        read -p "   Skip this demo? (y/n): " skip
        if [ "$skip" = "y" ]; then
            return 1
        else
            echo "   Please run: export OPENAI_API_KEY='your-key-here'"
            exit 1
        fi
    fi
    return 0
}

# Run selected demo
case $choice in
    1)
        echo "Running Quick Start demo..."
        python demo_quick_start.py
        ;;
    2)
        echo "Running Hyperparameter Sweep demo..."
        python demo_hyperparameter_sweep.py
        ;;
    3)
        if check_api_keys; then
            echo "Running LLM Cost Tracking demo..."
            python demo_llm_costs.py
        fi
        ;;
    4)
        if check_api_keys; then
            echo "Running Unified ML+LLM Workflow demo..."
            python demo_unified_workflow.py
        fi
        ;;
    5)
        if check_api_keys; then
            echo "Running Comprehensive demo..."
            python demo_script.py
        fi
        ;;
    6)
        echo "Running ALL demos..."
        echo ""
        echo "=== Quick Start ==="
        python demo_quick_start.py
        echo ""
        echo "=== Hyperparameter Sweep ==="
        python demo_hyperparameter_sweep.py
        echo ""
        if check_api_keys; then
            echo "=== LLM Cost Tracking ==="
            python demo_llm_costs.py
            echo ""
            echo "=== Unified Workflow ==="
            python demo_unified_workflow.py
            echo ""
            echo "=== Comprehensive Demo ==="
            python demo_script.py
        fi
        ;;
    *)
        echo "Invalid choice. Please select 1-6."
        exit 1
        ;;
esac

echo ""
echo "✅ Demo complete!"
echo ""
echo "📊 To view your results:"
echo "   mltrack ui"
echo ""
echo "This will open the Aim UI at http://localhost:43800"
#!/usr/bin/env python3
"""
MLtrack Demo Runner - Safely run demos with proper cleanup
"""

import mlflow
import sys
import subprocess

def cleanup_active_runs():
    """End any active MLflow runs"""
    try:
        if mlflow.active_run():
            mlflow.end_run()
            print("✅ Cleaned up active MLflow run")
    except:
        pass

def run_demo(demo_name):
    """Run a demo script with proper cleanup"""
    print(f"\n{'='*60}")
    print(f"Running {demo_name}")
    print(f"{'='*60}\n")
    
    # Clean up before running
    cleanup_active_runs()
    
    # Run the demo
    result = subprocess.run([sys.executable, demo_name], capture_output=False)
    
    # Clean up after running
    cleanup_active_runs()
    
    return result.returncode

if __name__ == "__main__":
    demos = [
        "demo_simple.py",
        "demo_quick_start.py", 
        "demo_llm_costs.py",
        "demo_hyperparameter_sweep.py",
    ]
    
    if len(sys.argv) > 1:
        # Run specific demo
        demo = sys.argv[1]
        if not demo.endswith('.py'):
            demo += '.py'
        run_demo(demo)
    else:
        # Show menu
        print("🚀 MLtrack Demo Runner")
        print("Select a demo to run:\n")
        for i, demo in enumerate(demos, 1):
            print(f"{i}. {demo}")
        
        choice = input("\nEnter demo number (1-4): ")
        try:
            idx = int(choice) - 1
            if 0 <= idx < len(demos):
                run_demo(demos[idx])
            else:
                print("Invalid choice")
        except:
            print("Invalid input")
    
    print("\n✅ Demo complete! Run 'mltrack ui' to view results")
#!/usr/bin/env python3
"""
Simple MLtrack Demo - Works without ML dependencies
Shows basic tracking functionality
"""

from mltrack import track
import random
import time

print("🚀 Simple MLtrack Demo")
print("=" * 60)

@track(name="simple-experiment")
def simulate_training(learning_rate=0.01, batch_size=32, epochs=10):
    """Simulate a training process without actual ML libraries"""
    print(f"\nSimulating training with:")
    print(f"  Learning rate: {learning_rate}")
    print(f"  Batch size: {batch_size}")
    print(f"  Epochs: {epochs}")
    
    # Simulate training progress
    best_accuracy = 0
    for epoch in range(epochs):
        # Simulate some computation time
        time.sleep(0.1)
        
        # Simulate improving accuracy
        accuracy = 0.5 + (epoch / epochs) * 0.4 + random.uniform(-0.05, 0.05)
        accuracy = min(accuracy, 0.99)  # Cap at 99%
        
        if accuracy > best_accuracy:
            best_accuracy = accuracy
        
        if epoch % 3 == 0:
            print(f"  Epoch {epoch+1}: accuracy = {accuracy:.3f}")
    
    print(f"\n✅ Training complete! Best accuracy: {best_accuracy:.3f}")
    return {"best_accuracy": best_accuracy, "final_accuracy": accuracy}

# Run multiple experiments
print("\nRunning experiments with different hyperparameters...")

experiments = [
    {"learning_rate": 0.001, "batch_size": 16, "epochs": 5},
    {"learning_rate": 0.01, "batch_size": 32, "epochs": 10},
    {"learning_rate": 0.1, "batch_size": 64, "epochs": 15},
]

results = []
for exp in experiments:
    result = simulate_training(**exp)
    results.append(result)

print("\n" + "=" * 60)
print("📊 Results Summary:")
for i, (exp, result) in enumerate(zip(experiments, results)):
    print(f"\nExperiment {i+1}:")
    print(f"  Parameters: lr={exp['learning_rate']}, batch={exp['batch_size']}, epochs={exp['epochs']}")
    print(f"  Best accuracy: {result['best_accuracy']:.3f}")

print("\n✅ Demo complete!")
print("\n📊 View your results:")
print("  1. Run: mltrack ui")
print("  2. Open: http://localhost:43800 (Aim) or http://localhost:5000 (MLflow)")
print("=" * 60)
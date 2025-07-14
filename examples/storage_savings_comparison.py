#!/usr/bin/env python
"""Compare storage usage between old and new approaches."""


def calculate_old_approach_storage():
    """Calculate storage with the old experiment-centric approach."""
    print("\n📊 Old Approach (Experiment-Centric)")
    print("=" * 50)
    
    # Scenario: 100 experiments with same 1GB dataset
    dataset_size_gb = 1.0
    num_experiments = 100
    
    # Each experiment stores its own copy
    total_storage_gb = dataset_size_gb * num_experiments
    
    print(f"Dataset size: {dataset_size_gb} GB")
    print(f"Number of experiments: {num_experiments}")
    print(f"Storage per experiment: {dataset_size_gb} GB (full copy)")
    print(f"Total storage used: {total_storage_gb} GB ❌")
    
    # Additional scenario: Daily production runs
    print("\n\nScenario 2: Daily production runs for 30 days")
    daily_data_size_gb = 0.5
    num_days = 30
    reruns_per_week = 2  # Some days need reruns
    total_runs = num_days + (reruns_per_week * 4)  # 4 weeks
    
    prod_storage_gb = daily_data_size_gb * total_runs
    print(f"Daily data size: {daily_data_size_gb} GB")
    print(f"Total runs (including reruns): {total_runs}")
    print(f"Total storage: {prod_storage_gb} GB ❌")
    
    return {
        'experiment_storage': total_storage_gb,
        'production_storage': prod_storage_gb,
        'total': total_storage_gb + prod_storage_gb
    }


def calculate_new_approach_storage():
    """Calculate storage with the new flexible approach."""
    print("\n\n✨ New Approach (Content-Addressable)")
    print("=" * 50)
    
    # Scenario: 100 experiments with same 1GB dataset
    dataset_size_gb = 1.0
    num_experiments = 100
    
    # Dataset stored once, referenced 100 times
    unique_storage_gb = dataset_size_gb
    reference_size_kb = 1  # Each reference is ~1KB
    references_size_gb = (reference_size_kb * num_experiments) / (1024 * 1024)
    
    total_storage_gb = unique_storage_gb + references_size_gb
    
    print(f"Dataset size: {dataset_size_gb} GB")
    print(f"Number of experiments: {num_experiments}")
    print(f"Unique data stored: {unique_storage_gb} GB")
    print(f"References size: {references_size_gb:.4f} GB")
    print(f"Total storage used: {total_storage_gb:.4f} GB ✅")
    
    # Additional scenario: Daily production runs
    print("\n\nScenario 2: Daily production runs for 30 days")
    daily_data_size_gb = 0.5
    num_unique_days = 30
    reruns_per_week = 2  # Reruns reference existing data
    
    # Only unique days stored
    prod_unique_storage_gb = daily_data_size_gb * num_unique_days
    # References for reruns
    rerun_refs_gb = (reference_size_kb * reruns_per_week * 4) / (1024 * 1024)
    
    prod_total_gb = prod_unique_storage_gb + rerun_refs_gb
    
    print(f"Daily data size: {daily_data_size_gb} GB")
    print(f"Unique days stored: {num_unique_days}")
    print(f"Reruns (references only): {reruns_per_week * 4}")
    print(f"Total storage: {prod_total_gb:.4f} GB ✅")
    
    return {
        'experiment_storage': total_storage_gb,
        'production_storage': prod_total_gb,
        'total': total_storage_gb + prod_total_gb
    }


def compare_approaches():
    """Compare and visualize the savings."""
    old = calculate_old_approach_storage()
    new = calculate_new_approach_storage()
    
    print("\n\n💰 Storage Savings Summary")
    print("=" * 50)
    
    exp_savings = old['experiment_storage'] - new['experiment_storage']
    exp_savings_pct = (exp_savings / old['experiment_storage']) * 100
    
    prod_savings = old['production_storage'] - new['production_storage'] 
    prod_savings_pct = (prod_savings / old['production_storage']) * 100
    
    total_savings = old['total'] - new['total']
    total_savings_pct = (total_savings / old['total']) * 100
    
    print(f"\nExperiment Storage:")
    print(f"  Old approach: {old['experiment_storage']:.2f} GB")
    print(f"  New approach: {new['experiment_storage']:.4f} GB")
    print(f"  Savings: {exp_savings:.2f} GB ({exp_savings_pct:.1f}%)")
    
    print(f"\nProduction Storage:")
    print(f"  Old approach: {old['production_storage']:.2f} GB")
    print(f"  New approach: {new['production_storage']:.4f} GB")
    print(f"  Savings: {prod_savings:.2f} GB ({prod_savings_pct:.1f}%)")
    
    print(f"\nTotal Storage:")
    print(f"  Old approach: {old['total']:.2f} GB")
    print(f"  New approach: {new['total']:.4f} GB")
    print(f"  💰 Total Savings: {total_savings:.2f} GB ({total_savings_pct:.1f}%)")
    
    # Cost estimation (AWS S3 pricing ~$0.023/GB/month)
    monthly_cost_per_gb = 0.023
    monthly_savings_usd = total_savings * monthly_cost_per_gb
    yearly_savings_usd = monthly_savings_usd * 12
    
    print(f"\n💵 Cost Savings (AWS S3 Standard):")
    print(f"  Monthly: ${monthly_savings_usd:.2f}")
    print(f"  Yearly: ${yearly_savings_usd:.2f}")
    
    # Visual representation
    print("\n\n📊 Visual Comparison")
    print("=" * 50)
    
    def draw_bar(label, value, max_value, width=40):
        filled = int((value / max_value) * width)
        bar = "█" * filled + "░" * (width - filled)
        print(f"{label:20} [{bar}] {value:.2f} GB")
    
    max_storage = old['total']
    draw_bar("Old Approach", old['total'], max_storage)
    draw_bar("New Approach", new['total'], max_storage)
    
    print(f"\nReduction: {total_savings_pct:.1f}% 🎉")


def demonstrate_real_world_scenario():
    """Show a real-world ML team scenario."""
    print("\n\n🏢 Real-World Scenario: ML Team with 10 Data Scientists")
    print("=" * 60)
    
    # Team parameters
    team_size = 10
    experiments_per_person_per_week = 20
    weeks_per_year = 50
    avg_dataset_size_gb = 2.5
    
    # Common datasets (80% of experiments use shared data)
    shared_data_percentage = 0.8
    unique_datasets = 5  # Team typically works with 5 main datasets
    
    print(f"Team size: {team_size} data scientists")
    print(f"Experiments per person per week: {experiments_per_person_per_week}")
    print(f"Average dataset size: {avg_dataset_size_gb} GB")
    print(f"Shared data usage: {shared_data_percentage*100}% of experiments")
    
    total_experiments = team_size * experiments_per_person_per_week * weeks_per_year
    
    # Old approach
    old_storage_gb = total_experiments * avg_dataset_size_gb
    
    # New approach
    # Unique data storage
    unique_data_gb = unique_datasets * avg_dataset_size_gb
    # Non-shared experiments
    non_shared_experiments = total_experiments * (1 - shared_data_percentage)
    non_shared_storage_gb = non_shared_experiments * avg_dataset_size_gb
    # References (negligible)
    references_gb = (total_experiments * 1) / (1024 * 1024)  # 1KB per reference
    
    new_storage_gb = unique_data_gb + non_shared_storage_gb + references_gb
    
    savings_gb = old_storage_gb - new_storage_gb
    savings_pct = (savings_gb / old_storage_gb) * 100
    
    print(f"\nYearly experiments: {total_experiments:,}")
    print(f"\nOld approach storage: {old_storage_gb:,.0f} GB")
    print(f"New approach storage: {new_storage_gb:,.0f} GB")
    print(f"\n🎯 Savings: {savings_gb:,.0f} GB ({savings_pct:.1f}%)")
    
    # Cost at scale
    storage_cost_per_gb_per_month = 0.023
    yearly_cost_old = old_storage_gb * storage_cost_per_gb_per_month * 12
    yearly_cost_new = new_storage_gb * storage_cost_per_gb_per_month * 12
    yearly_savings = yearly_cost_old - yearly_cost_new
    
    print(f"\n💰 Yearly Storage Costs:")
    print(f"  Old approach: ${yearly_cost_old:,.2f}")
    print(f"  New approach: ${yearly_cost_new:,.2f}")
    print(f"  Savings: ${yearly_savings:,.2f} per year")
    
    # Additional benefits
    print(f"\n✨ Additional Benefits:")
    print(f"  - Faster experiment startup (no data copying)")
    print(f"  - Clear separation of production vs experimental runs")
    print(f"  - Better data lineage tracking")
    print(f"  - Simplified data governance")


def main():
    """Run all comparisons."""
    print("🚀 MLtrack Storage Savings Analysis")
    print("=" * 60)
    print("Comparing old experiment-centric approach with new flexible approach")
    
    compare_approaches()
    demonstrate_real_world_scenario()
    
    print("\n\n✅ Key Takeaways:")
    print("1. Content-addressable storage eliminates data duplication")
    print("2. Significant cost savings at scale (often 80%+ reduction)")
    print("3. Better organization with run types (not everything is an experiment)")
    print("4. Faster operations (reference data instead of copying)")
    print("5. Cleaner data governance and lineage tracking")


if __name__ == "__main__":
    main()
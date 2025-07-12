"""XGBoost and LightGBM examples for mltrack with enhanced model introspection."""

import numpy as np
import pandas as pd
from sklearn.datasets import make_classification, make_regression, load_breast_cancer
from sklearn.model_selection import train_test_split, KFold
from sklearn.metrics import accuracy_score, roc_auc_score, mean_squared_error, r2_score
import mlflow
from mltrack import track, track_context
from mltrack.model_registry import ModelRegistry

# Try to import XGBoost and LightGBM
try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("⚠️  XGBoost not installed. Skipping XGBoost examples.")

try:
    import lightgbm as lgb
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False
    print("⚠️  LightGBM not installed. Skipping LightGBM examples.")


@track(name="xgboost-classification")
def xgboost_classification():
    """XGBoost classification with feature importance and early stopping."""
    if not HAS_XGBOOST:
        print("  Skipping XGBoost classification (not installed)")
        return None
        
    print("🌳 XGBoost Binary Classification")
    
    # Load breast cancer dataset
    data = load_breast_cancer()
    X, y = data.data, data.target
    feature_names = data.feature_names
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Create validation set for early stopping
    X_train, X_val, y_train, y_val = train_test_split(
        X_train, y_train, test_size=0.2, random_state=42, stratify=y_train
    )
    
    # Create DMatrix objects
    dtrain = xgb.DMatrix(X_train, label=y_train)
    dval = xgb.DMatrix(X_val, label=y_val)
    dtest = xgb.DMatrix(X_test, label=y_test)
    
    # Set parameters
    params = {
        'objective': 'binary:logistic',
        'eval_metric': 'logloss',
        'max_depth': 6,
        'learning_rate': 0.1,
        'n_estimators': 200,
        'subsample': 0.8,
        'colsample_bytree': 0.8,
        'seed': 42
    }
    
    # Log parameters
    mlflow.log_params(params)
    
    # Train with early stopping
    print("  Training with early stopping...")
    model = xgb.train(
        params,
        dtrain,
        num_boost_round=200,
        evals=[(dtrain, 'train'), (dval, 'val')],
        early_stopping_rounds=20,
        verbose_eval=False
    )
    
    # Make predictions
    y_pred_proba = model.predict(dtest)
    y_pred = (y_pred_proba > 0.5).astype(int)
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_pred_proba)
    
    mlflow.log_metrics({
        "test_accuracy": accuracy,
        "test_auc": auc,
        "best_iteration": model.best_iteration
    })
    
    # Feature importance
    importance = model.get_score(importance_type='gain')
    importance_df = pd.DataFrame([
        {'feature': feature_names[int(k[1:])], 'importance': v} 
        for k, v in importance.items()
    ]).sort_values('importance', ascending=False)
    
    mlflow.log_text(importance_df.to_string(), "xgb_feature_importance.txt")
    
    print(f"  Accuracy: {accuracy:.3f}, AUC: {auc:.3f}")
    print(f"  Best iteration: {model.best_iteration}")
    print("  Top 3 Features:")
    for _, row in importance_df.head(3).iterrows():
        print(f"    - {row['feature']}: {row['importance']:.1f}")
    
    return model


@track(name="lightgbm-regression")
def lightgbm_regression():
    """LightGBM regression with categorical features."""
    if not HAS_LIGHTGBM:
        print("  Skipping LightGBM regression (not installed)")
        return None
        
    print("\n💡 LightGBM Regression with Categorical Features")
    
    # Create synthetic data with categorical features
    n_samples = 5000
    
    # Numerical features
    X_num = np.random.randn(n_samples, 5)
    
    # Categorical features
    categories = ['A', 'B', 'C', 'D']
    X_cat = np.random.choice(categories, size=(n_samples, 2))
    
    # Create target with relationships
    y = (
        2 * X_num[:, 0] +
        3 * X_num[:, 1] -
        1.5 * X_num[:, 2] +
        (X_cat[:, 0] == 'A').astype(float) * 5 +
        (X_cat[:, 0] == 'B').astype(float) * 3 +
        (X_cat[:, 1] == 'C').astype(float) * 2 +
        np.random.normal(0, 0.5, n_samples)
    )
    
    # Create DataFrame
    df = pd.DataFrame(X_num, columns=[f'num_{i}' for i in range(5)])
    df['cat_0'] = X_cat[:, 0]
    df['cat_1'] = X_cat[:, 1]
    df['target'] = y
    
    # Encode categorical features
    for col in ['cat_0', 'cat_1']:
        df[col] = df[col].astype('category')
    
    # Split data
    train_df = df.sample(frac=0.8, random_state=42)
    test_df = df.drop(train_df.index)
    
    X_train = train_df.drop('target', axis=1)
    y_train = train_df['target']
    X_test = test_df.drop('target', axis=1)
    y_test = test_df['target']
    
    # Create LightGBM datasets
    categorical_features = ['cat_0', 'cat_1']
    train_data = lgb.Dataset(
        X_train, label=y_train,
        categorical_feature=categorical_features
    )
    
    # Parameters
    params = {
        'objective': 'regression',
        'metric': 'rmse',
        'num_leaves': 31,
        'learning_rate': 0.05,
        'feature_fraction': 0.9,
        'bagging_fraction': 0.8,
        'bagging_freq': 5,
        'verbose': -1,
        'random_state': 42
    }
    
    mlflow.log_params(params)
    mlflow.log_param("categorical_features", categorical_features)
    
    # Train model
    print("  Training LightGBM...")
    model = lgb.train(
        params,
        train_data,
        num_boost_round=200,
        valid_sets=[train_data],
        callbacks=[lgb.early_stopping(20), lgb.log_evaluation(0)]
    )
    
    # Predictions
    y_pred = model.predict(X_test, num_iteration=model.best_iteration)
    
    # Metrics
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)
    
    mlflow.log_metrics({
        "test_mse": mse,
        "test_rmse": rmse,
        "test_r2": r2,
        "best_iteration": model.best_iteration
    })
    
    # Feature importance
    importance = model.feature_importance(importance_type='gain')
    importance_df = pd.DataFrame({
        'feature': model.feature_name(),
        'importance': importance
    }).sort_values('importance', ascending=False)
    
    mlflow.log_text(importance_df.to_string(), "lgb_feature_importance.txt")
    
    print(f"  RMSE: {rmse:.3f}, R²: {r2:.3f}")
    print(f"  Best iteration: {model.best_iteration}")
    print("  Top 3 Features:")
    for _, row in importance_df.head(3).iterrows():
        print(f"    - {row['feature']}: {row['importance']:.1f}")
    
    return model


@track(name="boosting-comparison")
def compare_boosting_methods():
    """Compare XGBoost and LightGBM on the same dataset."""
    if not HAS_XGBOOST or not HAS_LIGHTGBM:
        print("\n📊 Skipping boosting comparison (missing dependencies)")
        return
        
    print("\n📊 Comparing XGBoost vs LightGBM")
    
    # Create a moderately complex classification dataset
    X, y = make_classification(
        n_samples=10000,
        n_features=20,
        n_informative=15,
        n_redundant=3,
        n_repeated=2,
        n_classes=3,
        n_clusters_per_class=2,
        random_state=42
    )
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    results = {}
    
    # XGBoost
    with track_context("xgboost-multiclass", tags={"model": "xgboost", "task": "multiclass"}):
        print("\n  Training XGBoost...")
        
        dtrain = xgb.DMatrix(X_train, label=y_train)
        dtest = xgb.DMatrix(X_test, label=y_test)
        
        params = {
            'objective': 'multi:softprob',
            'num_class': 3,
            'max_depth': 6,
            'learning_rate': 0.1,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'seed': 42
        }
        
        xgb_model = xgb.train(
            params,
            dtrain,
            num_boost_round=100,
            evals=[(dtrain, 'train')],
            verbose_eval=False
        )
        
        # Predictions
        y_pred_proba = xgb_model.predict(dtest)
        y_pred = np.argmax(y_pred_proba, axis=1)
        
        xgb_accuracy = accuracy_score(y_test, y_pred)
        mlflow.log_metric("accuracy", xgb_accuracy)
        
        results['XGBoost'] = xgb_accuracy
        print(f"    XGBoost Accuracy: {xgb_accuracy:.3f}")
    
    # LightGBM
    with track_context("lightgbm-multiclass", tags={"model": "lightgbm", "task": "multiclass"}):
        print("\n  Training LightGBM...")
        
        train_data = lgb.Dataset(X_train, label=y_train)
        
        params = {
            'objective': 'multiclass',
            'num_class': 3,
            'metric': 'multi_logloss',
            'num_leaves': 31,
            'learning_rate': 0.1,
            'feature_fraction': 0.8,
            'bagging_fraction': 0.8,
            'bagging_freq': 5,
            'verbose': -1,
            'random_state': 42
        }
        
        lgb_model = lgb.train(
            params,
            train_data,
            num_boost_round=100,
            valid_sets=[train_data],
            callbacks=[lgb.log_evaluation(0)]
        )
        
        # Predictions
        y_pred_proba = lgb_model.predict(X_test, num_iteration=lgb_model.best_iteration)
        y_pred = np.argmax(y_pred_proba, axis=1)
        
        lgb_accuracy = accuracy_score(y_test, y_pred)
        mlflow.log_metric("accuracy", lgb_accuracy)
        
        results['LightGBM'] = lgb_accuracy
        print(f"    LightGBM Accuracy: {lgb_accuracy:.3f}")
    
    # Compare results
    print("\n  Summary:")
    winner = max(results.items(), key=lambda x: x[1])
    print(f"    Best Model: {winner[0]} (Accuracy: {winner[1]:.3f})")
    
    return results


@track(name="cross-validation-ensemble")
def cross_validation_ensemble():
    """Demonstrate cross-validation with boosting methods."""
    if not HAS_XGBOOST and not HAS_LIGHTGBM:
        print("\n🔄 Skipping cross-validation example (missing dependencies)")
        return
        
    print("\n🔄 Cross-Validation with Boosting Methods")
    
    # Use a regression dataset
    X, y = make_regression(
        n_samples=1000,
        n_features=10,
        n_informative=8,
        noise=0.1,
        random_state=42
    )
    
    # K-Fold cross-validation
    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    
    cv_scores = []
    
    for fold, (train_idx, val_idx) in enumerate(kf.split(X)):
        X_train_fold = X[train_idx]
        y_train_fold = y[train_idx]
        X_val_fold = X[val_idx]
        y_val_fold = y[val_idx]
        
        with track_context(f"cv-fold-{fold+1}", tags={"fold": str(fold+1)}):
            if HAS_XGBOOST:
                # Train XGBoost
                dtrain = xgb.DMatrix(X_train_fold, label=y_train_fold)
                dval = xgb.DMatrix(X_val_fold, label=y_val_fold)
                
                params = {
                    'objective': 'reg:squarederror',
                    'max_depth': 4,
                    'learning_rate': 0.1,
                    'seed': 42
                }
                
                model = xgb.train(
                    params,
                    dtrain,
                    num_boost_round=50,
                    evals=[(dval, 'val')],
                    verbose_eval=False
                )
                
                y_pred = model.predict(dval)
                
            elif HAS_LIGHTGBM:
                # Train LightGBM as fallback
                train_data = lgb.Dataset(X_train_fold, label=y_train_fold)
                
                params = {
                    'objective': 'regression',
                    'metric': 'rmse',
                    'num_leaves': 15,
                    'learning_rate': 0.1,
                    'verbose': -1
                }
                
                model = lgb.train(
                    params,
                    train_data,
                    num_boost_round=50,
                    valid_sets=[train_data],
                    callbacks=[lgb.log_evaluation(0)]
                )
                
                y_pred = model.predict(X_val_fold)
            
            # Calculate fold metrics
            fold_rmse = np.sqrt(mean_squared_error(y_val_fold, y_pred))
            cv_scores.append(fold_rmse)
            
            mlflow.log_metric("fold_rmse", fold_rmse)
            print(f"    Fold {fold+1}: RMSE = {fold_rmse:.3f}")
    
    # Log overall CV results
    mean_cv_score = np.mean(cv_scores)
    std_cv_score = np.std(cv_scores)
    
    mlflow.log_metrics({
        "cv_mean_rmse": mean_cv_score,
        "cv_std_rmse": std_cv_score
    })
    
    print(f"\n  Cross-Validation RMSE: {mean_cv_score:.3f} ± {std_cv_score:.3f}")
    
    return cv_scores


def main():
    """Run all XGBoost and LightGBM examples."""
    print("🚀 MLtrack XGBoost & LightGBM Examples\n")
    print("=" * 50)
    
    # Check if we have at least one library
    if not HAS_XGBOOST and not HAS_LIGHTGBM:
        print("\n⚠️  Neither XGBoost nor LightGBM is installed.")
        print("Install with: uv add xgboost lightgbm")
        return
    
    # Run examples
    xgboost_classification()
    lightgbm_regression()
    compare_boosting_methods()
    cross_validation_ensemble()
    
    print("\n" + "=" * 50)
    print("✅ All examples completed!")
    print("\nTo view results:")
    print("  1. Run: uv run python -m mlflow ui")
    print("  2. Open: http://localhost:5000")
    print("  3. Explore the different experiments")


if __name__ == "__main__":
    main()
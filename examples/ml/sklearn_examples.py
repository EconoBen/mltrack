"""Comprehensive scikit-learn examples for mltrack."""

import numpy as np
import pandas as pd
from sklearn.datasets import (
    make_classification, make_regression, load_iris, 
    load_wine, load_digits, fetch_california_housing
)
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, Ridge, Lasso, ElasticNet
from sklearn.svm import SVC, SVR
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    mean_squared_error, r2_score, mean_absolute_error,
    confusion_matrix, classification_report
)
import mlflow
from mltrack import track, track_context


@track(name="sklearn-classification-comparison")
def compare_classifiers():
    """Compare multiple classification algorithms on the same dataset."""
    print("📊 Comparing Classification Algorithms")
    
    # Load dataset
    X, y = make_classification(
        n_samples=1000, 
        n_features=20, 
        n_informative=15,
        n_redundant=5,
        n_classes=3,
        random_state=42
    )
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Define classifiers to compare
    classifiers = {
        "RandomForest": RandomForestClassifier(n_estimators=100, random_state=42),
        "LogisticRegression": LogisticRegression(max_iter=1000, random_state=42),
        "SVM": SVC(kernel='rbf', random_state=42),
        "GradientBoosting": GradientBoostingClassifier(n_estimators=100, random_state=42),
        "KNN": KNeighborsClassifier(n_neighbors=5),
        "NaiveBayes": GaussianNB(),
        "DecisionTree": DecisionTreeClassifier(max_depth=10, random_state=42)
    }
    
    results = {}
    
    for name, clf in classifiers.items():
        with track_context(f"train-{name}", tags={"algorithm": name, "task": "classification"}):
            print(f"\n  Training {name}...")
            
            # Use scaled features for algorithms that need it
            if name in ["LogisticRegression", "SVM", "KNN"]:
                clf.fit(X_train_scaled, y_train)
                y_pred = clf.predict(X_test_scaled)
            else:
                clf.fit(X_train, y_train)
                y_pred = clf.predict(X_test)
            
            # Calculate metrics
            accuracy = accuracy_score(y_test, y_pred)
            precision = precision_score(y_test, y_pred, average='weighted')
            recall = recall_score(y_test, y_pred, average='weighted')
            f1 = f1_score(y_test, y_pred, average='weighted')
            
            # Log metrics
            mlflow.log_metrics({
                "accuracy": accuracy,
                "precision": precision,
                "recall": recall,
                "f1_score": f1
            })
            
            # Log confusion matrix
            cm = confusion_matrix(y_test, y_pred)
            mlflow.log_text(str(cm), "confusion_matrix.txt")
            
            # Log classification report
            report = classification_report(y_test, y_pred)
            mlflow.log_text(report, "classification_report.txt")
            
            # Store results
            results[name] = {
                "accuracy": accuracy,
                "f1_score": f1,
                "model": clf
            }
            
            print(f"    Accuracy: {accuracy:.3f}, F1: {f1:.3f}")
    
    return results


@track(name="sklearn-regression-ensemble")
def regression_with_ensemble():
    """Demonstrate regression with ensemble methods and feature importance."""
    print("\n🏠 California Housing Price Prediction")
    
    # Load California housing dataset
    data = fetch_california_housing()
    X, y = data.data, data.target
    feature_names = data.feature_names
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Create and train Random Forest
    rf_model = RandomForestRegressor(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    
    print("  Training Random Forest Regressor...")
    rf_model.fit(X_train, y_train)
    
    # Make predictions
    y_pred = rf_model.predict(X_test)
    
    # Calculate metrics
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    # Log metrics
    mlflow.log_metrics({
        "mse": mse,
        "rmse": rmse,
        "mae": mae,
        "r2_score": r2
    })
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': feature_names,
        'importance': rf_model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    mlflow.log_text(feature_importance.to_string(), "feature_importance.txt")
    
    print(f"  RMSE: ${rmse*100000:.2f}, R²: {r2:.3f}")
    print("\n  Top 3 Important Features:")
    for idx, row in feature_importance.head(3).iterrows():
        print(f"    - {row['feature']}: {row['importance']:.3f}")
    
    return rf_model, feature_importance


@track(name="sklearn-hyperparameter-tuning")
def hyperparameter_tuning():
    """Demonstrate GridSearchCV for hyperparameter tuning."""
    print("\n🔧 Hyperparameter Tuning with GridSearchCV")
    
    # Load wine dataset for multi-class classification
    wine = load_wine()
    X, y = wine.data, wine.target
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Define parameter grid
    param_grid = {
        'n_estimators': [50, 100, 200],
        'max_depth': [5, 10, 15, None],
        'min_samples_split': [2, 5, 10],
        'min_samples_leaf': [1, 2, 4]
    }
    
    # Create base model
    rf = RandomForestClassifier(random_state=42)
    
    # Perform grid search
    print("  Searching best parameters...")
    grid_search = GridSearchCV(
        rf, param_grid, 
        cv=5, 
        scoring='f1_weighted',
        n_jobs=-1,
        verbose=1
    )
    
    grid_search.fit(X_train_scaled, y_train)
    
    # Log best parameters
    mlflow.log_params(grid_search.best_params_)
    mlflow.log_metric("best_cv_score", grid_search.best_score_)
    
    # Evaluate on test set
    best_model = grid_search.best_estimator_
    y_pred = best_model.predict(X_test_scaled)
    test_accuracy = accuracy_score(y_test, y_pred)
    test_f1 = f1_score(y_test, y_pred, average='weighted')
    
    mlflow.log_metrics({
        "test_accuracy": test_accuracy,
        "test_f1_score": test_f1
    })
    
    print(f"  Best Parameters: {grid_search.best_params_}")
    print(f"  Best CV Score: {grid_search.best_score_:.3f}")
    print(f"  Test Accuracy: {test_accuracy:.3f}")
    
    return best_model


@track(name="sklearn-pipeline-example")
def advanced_pipeline():
    """Demonstrate a more complex ML pipeline with cross-validation."""
    print("\n🔄 Advanced Pipeline with Cross-Validation")
    
    # Load digits dataset
    digits = load_digits()
    X, y = digits.data, digits.target
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Try different regularization strengths
    alphas = [0.001, 0.01, 0.1, 1.0, 10.0]
    
    for alpha in alphas:
        with track_context(f"regularization-alpha-{alpha}", 
                         tags={"alpha": str(alpha), "model": "LogisticRegression"}):
            
            model = LogisticRegression(
                C=1/alpha,  # C is inverse of regularization strength
                max_iter=1000,
                solver='saga',
                multi_class='multinomial',
                random_state=42
            )
            
            # Perform cross-validation
            cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
            
            # Fit final model
            model.fit(X_train, y_train)
            test_score = model.score(X_test, y_test)
            
            # Log metrics
            mlflow.log_metric("cv_mean_accuracy", cv_scores.mean())
            mlflow.log_metric("cv_std_accuracy", cv_scores.std())
            mlflow.log_metric("test_accuracy", test_score)
            
            print(f"  Alpha={alpha}: CV={cv_scores.mean():.3f}±{cv_scores.std():.3f}, Test={test_score:.3f}")


@track(name="sklearn-regression-comparison") 
def compare_regression_models():
    """Compare different regression algorithms."""
    print("\n📈 Comparing Regression Algorithms")
    
    # Create synthetic regression dataset
    X, y = make_regression(
        n_samples=1000,
        n_features=10,
        n_informative=8,
        noise=0.1,
        random_state=42
    )
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Define regressors
    regressors = {
        "Ridge": Ridge(alpha=1.0),
        "Lasso": Lasso(alpha=0.1),
        "ElasticNet": ElasticNet(alpha=0.1, l1_ratio=0.5),
        "RandomForest": RandomForestRegressor(n_estimators=100, random_state=42),
        "GradientBoosting": GradientBoostingRegressor(n_estimators=100, random_state=42),
        "SVR": SVR(kernel='rbf', C=1.0)
    }
    
    for name, reg in regressors.items():
        with track_context(f"regression-{name}", tags={"algorithm": name}):
            print(f"\n  Training {name}...")
            
            # Train model
            if name in ["Ridge", "Lasso", "ElasticNet", "SVR"]:
                reg.fit(X_train_scaled, y_train)
                y_pred = reg.predict(X_test_scaled)
            else:
                reg.fit(X_train, y_train)
                y_pred = reg.predict(X_test)
            
            # Calculate metrics
            mse = mean_squared_error(y_test, y_pred)
            rmse = np.sqrt(mse)
            mae = mean_absolute_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            # Log metrics
            mlflow.log_metrics({
                "mse": mse,
                "rmse": rmse, 
                "mae": mae,
                "r2_score": r2
            })
            
            print(f"    RMSE: {rmse:.3f}, R²: {r2:.3f}")


def main():
    """Run all sklearn examples."""
    print("🚀 MLtrack Scikit-learn Examples\n")
    print("=" * 50)
    
    # Run all examples
    compare_classifiers()
    regression_with_ensemble()
    hyperparameter_tuning()
    advanced_pipeline()
    compare_regression_models()
    
    print("\n" + "=" * 50)
    print("✅ All examples completed!")
    print("\nTo view results:")
    print("  1. Run: uv run python -m mlflow ui")
    print("  2. Open: http://localhost:5000")
    print("  3. Explore the different experiments")


if __name__ == "__main__":
    main()
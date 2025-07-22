#!/usr/bin/env python3
"""
Test the deployed model's inference API
"""

import requests
import json
import time
import numpy as np
from typing import List, Dict

# Configuration
API_BASE_URL = "http://localhost:8000"
MODEL_NAME = "wine_quality_classifier"

# Wine feature names for reference
WINE_FEATURES = [
    "alcohol", "malic_acid", "ash", "alcalinity_of_ash", "magnesium",
    "total_phenols", "flavanoids", "nonflavanoid_phenols", "proanthocyanins",
    "color_intensity", "hue", "od280/od315_of_diluted_wines", "proline"
]

# Sample wine data for testing
SAMPLE_WINES = [
    {
        "name": "High Quality Red",
        "features": [14.23, 1.71, 2.43, 15.6, 127.0, 2.8, 3.06, 0.28, 2.29, 5.64, 1.04, 3.92, 1065.0]
    },
    {
        "name": "Medium Quality White", 
        "features": [13.2, 1.78, 2.14, 11.2, 100.0, 2.65, 2.76, 0.26, 1.28, 4.38, 1.05, 3.4, 1050.0]
    },
    {
        "name": "Standard Table Wine",
        "features": [12.37, 0.94, 1.36, 10.6, 88.0, 1.98, 0.57, 0.28, 0.42, 1.95, 1.05, 1.82, 520.0]
    },
    {
        "name": "Premium Reserve",
        "features": [13.71, 1.86, 2.36, 16.6, 101.0, 2.61, 2.88, 0.27, 1.69, 3.8, 1.11, 4.0, 1035.0]
    }
]

def test_health_check():
    """Test health check endpoint"""
    print("🏥 Testing health check...")
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Health Status: {data['status']}")
            print(f"  Timestamp: {data['timestamp']}")
            return True
        else:
            print(f"✗ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_model_info():
    """Test model info endpoint"""
    print("\n📊 Testing model info...")
    try:
        response = requests.get(f"{API_BASE_URL}/v1/models/{MODEL_NAME}/info")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Model Name: {data['model_name']}")
            print(f"✓ Model Version: {data['model_version']}")
            print(f"✓ Input Schema: {len(data['input_schema']['items']['items'])} features required")
            return True
        else:
            print(f"✗ Model info failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_single_prediction():
    """Test single prediction"""
    print("\n🔮 Testing single prediction...")
    
    sample = SAMPLE_WINES[0]
    payload = {
        "features": [sample["features"]],
        "return_proba": True
    }
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_BASE_URL}/v1/models/{MODEL_NAME}/predict",
            json=payload
        )
        request_time = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Prediction for '{sample['name']}':")
            print(f"  Class: {data['predictions'][0]}")
            print(f"  Probabilities: {[f'{p:.3f}' for p in data['probabilities'][0]]}")
            print(f"  Model Version: {data['model_version']}")
            print(f"  Inference Time: {data['inference_time_ms']}ms")
            print(f"  Total Request Time: {request_time:.2f}ms")
            return True
        else:
            print(f"✗ Prediction failed: {response.status_code}")
            print(f"  Error: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_batch_prediction():
    """Test batch prediction"""
    print("\n📦 Testing batch prediction...")
    
    # Prepare batch request
    features = [wine["features"] for wine in SAMPLE_WINES]
    payload = {
        "features": features,
        "return_proba": False
    }
    
    try:
        start_time = time.time()
        response = requests.post(
            f"{API_BASE_URL}/v1/models/{MODEL_NAME}/predict",
            json=payload
        )
        request_time = (time.time() - start_time) * 1000
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Batch prediction successful:")
            print(f"  Samples: {len(features)}")
            print(f"  Predictions: {data['predictions']}")
            print(f"  Inference Time: {data['inference_time_ms']}ms")
            print(f"  Total Request Time: {request_time:.2f}ms")
            print(f"  Throughput: {len(features) / (request_time/1000):.1f} samples/sec")
            
            # Show individual results
            print("\n  Individual Results:")
            for i, wine in enumerate(SAMPLE_WINES):
                print(f"  - {wine['name']}: Class {data['predictions'][i]}")
            
            return True
        else:
            print(f"✗ Batch prediction failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_performance():
    """Test API performance"""
    print("\n⚡ Testing API performance...")
    
    # Prepare test data
    test_sizes = [1, 10, 50, 100]
    results = []
    
    for size in test_sizes:
        # Generate random samples
        features = np.random.rand(size, 13).tolist()
        payload = {
            "features": features,
            "return_proba": False
        }
        
        # Time the request
        start_time = time.time()
        try:
            response = requests.post(
                f"{API_BASE_URL}/v1/models/{MODEL_NAME}/predict",
                json=payload
            )
            request_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                data = response.json()
                results.append({
                    "batch_size": size,
                    "request_time": request_time,
                    "inference_time": data["inference_time_ms"],
                    "throughput": size / (request_time/1000)
                })
            else:
                print(f"  ✗ Failed for batch size {size}")
        except Exception as e:
            print(f"  ✗ Error for batch size {size}: {e}")
    
    # Show results
    if results:
        print("\n  Performance Results:")
        print("  " + "-"*60)
        print(f"  {'Batch Size':<12} {'Request (ms)':<15} {'Inference (ms)':<15} {'Throughput':<15}")
        print("  " + "-"*60)
        for r in results:
            print(f"  {r['batch_size']:<12} {r['request_time']:<15.2f} {r['inference_time']:<15.2f} {r['throughput']:<15.1f}")
    
    return len(results) > 0

def test_error_handling():
    """Test error handling"""
    print("\n🛡️  Testing error handling...")
    
    # Test 1: Invalid features (wrong number)
    print("  → Testing invalid feature count...")
    payload = {
        "features": [[1.0, 2.0, 3.0]],  # Only 3 features instead of 13
        "return_proba": False
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/v1/models/{MODEL_NAME}/predict",
            json=payload
        )
        if response.status_code == 400:
            print("  ✓ Correctly rejected invalid input")
        else:
            print(f"  ✗ Expected 400, got {response.status_code}")
    except Exception as e:
        print(f"  ✗ Error: {e}")
    
    # Test 2: Invalid endpoint
    print("  → Testing invalid endpoint...")
    try:
        response = requests.get(f"{API_BASE_URL}/invalid/endpoint")
        if response.status_code == 404:
            print("  ✓ Correctly returned 404 for invalid endpoint")
        else:
            print(f"  ✗ Expected 404, got {response.status_code}")
    except Exception as e:
        print(f"  ✗ Error: {e}")
    
    return True

def display_api_docs():
    """Display API documentation info"""
    print("\n📚 API Documentation")
    print("="*60)
    print(f"Interactive API docs: {API_BASE_URL}/docs")
    print(f"OpenAPI schema: {API_BASE_URL}/openapi.json")
    print("\nExample cURL commands:")
    print(f"""
# Health check
curl {API_BASE_URL}/health

# Model info  
curl {API_BASE_URL}/v1/models/{MODEL_NAME}/info

# Make prediction
curl -X POST {API_BASE_URL}/v1/models/{MODEL_NAME}/predict \\
  -H "Content-Type: application/json" \\
  -d '{{"features": [[14.23, 1.71, 2.43, 15.6, 127.0, 2.8, 3.06, 0.28, 2.29, 5.64, 1.04, 3.92, 1065.0]], "return_proba": true}}'
""")

def main():
    print("🧪 MLTrack Model Inference Testing")
    print("==================================\n")
    
    # Check if API is running
    print("Checking API availability...")
    try:
        response = requests.get(f"{API_BASE_URL}/", timeout=2)
        print("✓ API is running\n")
    except:
        print("❌ API is not running!")
        print("Please run deploy-model-demo.py first.")
        return
    
    # Run tests
    tests = [
        ("Health Check", test_health_check),
        ("Model Info", test_model_info),
        ("Single Prediction", test_single_prediction),
        ("Batch Prediction", test_batch_prediction),
        ("Performance", test_performance),
        ("Error Handling", test_error_handling)
    ]
    
    results = []
    for test_name, test_func in tests:
        result = test_func()
        results.append((test_name, result))
        time.sleep(0.5)  # Small delay between tests
    
    # Summary
    print("\n" + "="*60)
    print("📊 Test Summary")
    print("="*60)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name:<20} {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    # Show API docs
    display_api_docs()

if __name__ == "__main__":
    main()
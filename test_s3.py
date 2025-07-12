"""Test S3 configuration for mltrack."""

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import os

def test_aws_credentials():
    """Test if AWS credentials are configured."""
    print("🔍 Testing AWS credentials...")
    
    try:
        session = boto3.Session()
        credentials = session.get_credentials()
        
        if credentials is None:
            print("❌ No AWS credentials found")
            print("💡 Configure credentials with:")
            print("   aws configure")
            print("   OR set environment variables:")
            print("   export AWS_ACCESS_KEY_ID=your_key")
            print("   export AWS_SECRET_ACCESS_KEY=your_secret")
            print("   export AWS_DEFAULT_REGION=us-east-1")
            return False
        
        print(f"✅ AWS credentials found")
        print(f"   Access Key ID: {credentials.access_key[:8]}...")
        
        # Test credentials by listing buckets
        s3 = session.client('s3')
        response = s3.list_buckets()
        print(f"✅ Credentials work - found {len(response['Buckets'])} buckets")
        
        # List first few buckets
        for bucket in response['Buckets'][:3]:
            print(f"   - {bucket['Name']}")
        
        return True
        
    except NoCredentialsError:
        print("❌ AWS credentials not configured")
        return False
    except ClientError as e:
        print(f"❌ AWS error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_bucket_access(bucket_name):
    """Test access to a specific bucket."""
    print(f"\n🔍 Testing bucket '{bucket_name}'...")
    
    if not bucket_name or bucket_name == "asdf":
        print("❌ Invalid bucket name - 'asdf' is not a real bucket")
        print("💡 Use a real S3 bucket name or leave empty to skip S3")
        return False
    
    try:
        s3 = boto3.client('s3')
        
        # Check if bucket exists
        s3.head_bucket(Bucket=bucket_name)
        print(f"✅ Bucket '{bucket_name}' exists and is accessible")
        
        # Test write permissions
        test_key = "mltrack/.test"
        s3.put_object(Bucket=bucket_name, Key=test_key, Body=b'test')
        print(f"✅ Write permissions confirmed")
        
        # Clean up
        s3.delete_object(Bucket=bucket_name, Key=test_key)
        print(f"✅ Cleanup successful")
        
        return True
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'NoSuchBucket':
            print(f"❌ Bucket '{bucket_name}' does not exist")
        elif error_code == '403':
            print(f"❌ Access denied to bucket '{bucket_name}'")
            print("💡 Check bucket permissions and region")
        elif error_code == 'AllAccessDisabled':
            print(f"❌ All access to bucket '{bucket_name}' is disabled")
        else:
            print(f"❌ S3 error ({error_code}): {e}")
        
        return False

def main():
    print("🧪 MLtrack S3 Configuration Test")
    print("=" * 40)
    
    # Test 1: AWS credentials
    has_credentials = test_aws_credentials()
    
    if not has_credentials:
        print("\n❌ Cannot test S3 without credentials")
        return
    
    # Test 2: Environment variables
    print(f"\n🔍 Environment variables:")
    print(f"   AWS_ACCESS_KEY_ID: {'✅ Set' if os.getenv('AWS_ACCESS_KEY_ID') else '❌ Not set'}")
    print(f"   AWS_SECRET_ACCESS_KEY: {'✅ Set' if os.getenv('AWS_SECRET_ACCESS_KEY') else '❌ Not set'}")
    print(f"   AWS_DEFAULT_REGION: {os.getenv('AWS_DEFAULT_REGION', '❌ Not set')}")
    print(f"   MLTRACK_S3_BUCKET: {os.getenv('MLTRACK_S3_BUCKET', '❌ Not set')}")
    
    # Test 3: Bucket access
    bucket = os.getenv('MLTRACK_S3_BUCKET', 'asdf')
    test_bucket_access(bucket)
    
    print(f"\n💡 To fix S3 issues:")
    print(f"   1. Create a real S3 bucket in AWS Console")
    print(f"   2. Set MLTRACK_S3_BUCKET environment variable")
    print(f"   3. Ensure your AWS credentials have s3:PutObject permission")
    print(f"   4. Or leave S3 bucket empty to use local storage only")

if __name__ == "__main__":
    main()
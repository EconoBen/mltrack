"""S3 storage module for ML models."""

import os
import boto3
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
from botocore.exceptions import ClientError


class S3ModelStorage:
    """Handles S3 storage operations for ML models."""
    
    def __init__(self, 
                 bucket_name: Optional[str] = None,
                 region: str = "us-east-1",
                 aws_access_key_id: Optional[str] = None,
                 aws_secret_access_key: Optional[str] = None):
        """Initialize S3 storage handler.
        
        Args:
            bucket_name: S3 bucket name (defaults to MLTRACK_S3_BUCKET env var)
            region: AWS region
            aws_access_key_id: AWS access key ID
            aws_secret_access_key: AWS secret access key
        """
        self.bucket_name = bucket_name or os.getenv("MLTRACK_S3_BUCKET", "mltrack-models")
        self.region = region
        
        # Initialize S3 client
        if aws_access_key_id and aws_secret_access_key:
            self.s3_client = boto3.client(
                's3',
                region_name=region,
                aws_access_key_id=aws_access_key_id,
                aws_secret_access_key=aws_secret_access_key
            )
        else:
            # Use default credentials (IAM role, ~/.aws/credentials, etc.)
            self.s3_client = boto3.client('s3', region_name=region)
        
        # Ensure bucket exists
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Ensure the S3 bucket exists, create if not."""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                # Bucket doesn't exist, create it
                try:
                    if self.region == 'us-east-1':
                        self.s3_client.create_bucket(Bucket=self.bucket_name)
                    else:
                        self.s3_client.create_bucket(
                            Bucket=self.bucket_name,
                            CreateBucketConfiguration={'LocationConstraint': self.region}
                        )
                    
                    # Enable versioning
                    self.s3_client.put_bucket_versioning(
                        Bucket=self.bucket_name,
                        VersioningConfiguration={'Status': 'Enabled'}
                    )
                    
                    # Add lifecycle policy for old versions
                    lifecycle_config = {
                        'Rules': [{
                            'ID': 'delete-old-versions',
                            'Status': 'Enabled',
                            'NoncurrentVersionExpiration': {
                                'NoncurrentDays': 90
                            }
                        }]
                    }
                    
                    self.s3_client.put_bucket_lifecycle_configuration(
                        Bucket=self.bucket_name,
                        LifecycleConfiguration=lifecycle_config
                    )
                    
                except ClientError as create_error:
                    raise Exception(f"Failed to create bucket: {create_error}")
            else:
                raise
    
    def upload_model(self, 
                    local_path: str,
                    s3_key: str,
                    metadata: Optional[Dict[str, str]] = None) -> str:
        """Upload a model file to S3.
        
        Args:
            local_path: Local path to the model file
            s3_key: S3 key (path) for the model
            metadata: Optional metadata to attach
            
        Returns:
            S3 URI of the uploaded model
        """
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Model file not found: {local_path}")
        
        # Add timestamp to key if not present
        if not any(ts in s3_key for ts in ['/', '-', '_']):
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            s3_key = f"{s3_key}_{timestamp}"
        
        # Prepare metadata
        upload_metadata = {
            'uploaded_at': datetime.now().isoformat(),
            'file_size': str(os.path.getsize(local_path)),
            'original_filename': os.path.basename(local_path)
        }
        
        if metadata:
            upload_metadata.update(metadata)
        
        # Upload file
        try:
            with open(local_path, 'rb') as f:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=f,
                    Metadata=upload_metadata
                )
            
            # Return S3 URI
            return f"s3://{self.bucket_name}/{s3_key}"
            
        except ClientError as e:
            raise Exception(f"Failed to upload model to S3: {e}")
    
    def download_model(self, 
                      s3_uri: str,
                      local_path: str) -> str:
        """Download a model from S3.
        
        Args:
            s3_uri: S3 URI of the model
            local_path: Local path to save the model
            
        Returns:
            Local path of the downloaded model
        """
        # Parse S3 URI
        if not s3_uri.startswith('s3://'):
            raise ValueError(f"Invalid S3 URI: {s3_uri}")
        
        parts = s3_uri.replace('s3://', '').split('/', 1)
        if len(parts) != 2:
            raise ValueError(f"Invalid S3 URI format: {s3_uri}")
        
        bucket = parts[0]
        key = parts[1]
        
        # Create directory if needed
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        
        # Download file
        try:
            self.s3_client.download_file(bucket, key, local_path)
            return local_path
            
        except ClientError as e:
            raise Exception(f"Failed to download model from S3: {e}")
    
    def list_models(self, 
                   prefix: Optional[str] = None,
                   max_results: int = 100) -> List[Dict[str, Any]]:
        """List models in S3 bucket.
        
        Args:
            prefix: Optional prefix to filter models
            max_results: Maximum number of results
            
        Returns:
            List of model information
        """
        models = []
        
        try:
            # List objects
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(
                Bucket=self.bucket_name,
                Prefix=prefix or '',
                PaginationConfig={'MaxItems': max_results}
            )
            
            for page in pages:
                if 'Contents' in page:
                    for obj in page['Contents']:
                        # Get object metadata
                        try:
                            head_response = self.s3_client.head_object(
                                Bucket=self.bucket_name,
                                Key=obj['Key']
                            )
                            
                            metadata = head_response.get('Metadata', {})
                            
                            models.append({
                                'key': obj['Key'],
                                's3_uri': f"s3://{self.bucket_name}/{obj['Key']}",
                                'size': obj['Size'],
                                'last_modified': obj['LastModified'].isoformat(),
                                'metadata': metadata
                            })
                            
                        except ClientError:
                            # Skip if we can't get metadata
                            pass
            
            return models
            
        except ClientError as e:
            raise Exception(f"Failed to list models from S3: {e}")
    
    def delete_model(self, s3_uri: str) -> bool:
        """Delete a model from S3.
        
        Args:
            s3_uri: S3 URI of the model
            
        Returns:
            True if successful
        """
        # Parse S3 URI
        if not s3_uri.startswith('s3://'):
            raise ValueError(f"Invalid S3 URI: {s3_uri}")
        
        parts = s3_uri.replace('s3://', '').split('/', 1)
        if len(parts) != 2:
            raise ValueError(f"Invalid S3 URI format: {s3_uri}")
        
        bucket = parts[0]
        key = parts[1]
        
        try:
            self.s3_client.delete_object(Bucket=bucket, Key=key)
            return True
            
        except ClientError as e:
            raise Exception(f"Failed to delete model from S3: {e}")
    
    def get_presigned_url(self, 
                         s3_uri: str,
                         expiration: int = 3600) -> str:
        """Generate a presigned URL for downloading a model.
        
        Args:
            s3_uri: S3 URI of the model
            expiration: URL expiration time in seconds
            
        Returns:
            Presigned URL
        """
        # Parse S3 URI
        if not s3_uri.startswith('s3://'):
            raise ValueError(f"Invalid S3 URI: {s3_uri}")
        
        parts = s3_uri.replace('s3://', '').split('/', 1)
        if len(parts) != 2:
            raise ValueError(f"Invalid S3 URI format: {s3_uri}")
        
        bucket = parts[0]
        key = parts[1]
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket, 'Key': key},
                ExpiresIn=expiration
            )
            return url
            
        except ClientError as e:
            raise Exception(f"Failed to generate presigned URL: {e}")
    
    def copy_model(self, 
                  source_s3_uri: str,
                  dest_s3_key: str) -> str:
        """Copy a model within S3.
        
        Args:
            source_s3_uri: Source S3 URI
            dest_s3_key: Destination S3 key
            
        Returns:
            Destination S3 URI
        """
        # Parse source S3 URI
        if not source_s3_uri.startswith('s3://'):
            raise ValueError(f"Invalid S3 URI: {source_s3_uri}")
        
        parts = source_s3_uri.replace('s3://', '').split('/', 1)
        if len(parts) != 2:
            raise ValueError(f"Invalid S3 URI format: {source_s3_uri}")
        
        source_bucket = parts[0]
        source_key = parts[1]
        
        try:
            # Copy object
            copy_source = {'Bucket': source_bucket, 'Key': source_key}
            self.s3_client.copy_object(
                CopySource=copy_source,
                Bucket=self.bucket_name,
                Key=dest_s3_key
            )
            
            return f"s3://{self.bucket_name}/{dest_s3_key}"
            
        except ClientError as e:
            raise Exception(f"Failed to copy model in S3: {e}")


# Convenience functions
def upload_model_to_s3(local_path: str,
                      s3_key: str,
                      metadata: Optional[Dict[str, str]] = None,
                      bucket_name: Optional[str] = None) -> str:
    """Upload a model to S3.
    
    Args:
        local_path: Local path to model
        s3_key: S3 key for the model
        metadata: Optional metadata
        bucket_name: Optional bucket name
        
    Returns:
        S3 URI
    """
    storage = S3ModelStorage(bucket_name=bucket_name)
    return storage.upload_model(local_path, s3_key, metadata)


def download_model_from_s3(s3_uri: str,
                          local_path: str) -> str:
    """Download a model from S3.
    
    Args:
        s3_uri: S3 URI of the model
        local_path: Local path to save
        
    Returns:
        Local path
    """
    storage = S3ModelStorage()
    return storage.download_model(s3_uri, local_path)


def list_s3_models(prefix: Optional[str] = None,
                  bucket_name: Optional[str] = None) -> List[Dict[str, Any]]:
    """List models in S3.
    
    Args:
        prefix: Optional prefix filter
        bucket_name: Optional bucket name
        
    Returns:
        List of models
    """
    storage = S3ModelStorage(bucket_name=bucket_name)
    return storage.list_models(prefix)
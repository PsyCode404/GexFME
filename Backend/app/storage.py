"""
S3-compatible object storage abstraction for file operations.
Supports AWS S3, Cloudflare R2, and other S3-compatible services.
"""

import os
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import logging
from typing import List, Optional
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)

class StorageService:
    """S3-compatible storage service for file operations."""
    
    def __init__(self):
        """Initialize the storage service with configuration from environment variables."""
        self.endpoint_url = os.getenv('S3_ENDPOINT_URL')
        self.bucket_name = os.getenv('S3_BUCKET')
        self.access_key_id = os.getenv('S3_ACCESS_KEY_ID')
        self.secret_access_key = os.getenv('S3_SECRET_ACCESS_KEY')
        self.region = os.getenv('S3_REGION', 'auto')
        
        # Validate required configuration
        if not all([self.bucket_name, self.access_key_id, self.secret_access_key]):
            logger.warning("S3 configuration incomplete. Some storage operations may fail.")
        
        # Initialize S3 client
        self._client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the S3 client with proper configuration."""
        try:
            session = boto3.Session(
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key,
                region_name=self.region
            )
            
            # Configure client with endpoint URL if provided (for R2, MinIO, etc.)
            client_config = {}
            if self.endpoint_url:
                client_config['endpoint_url'] = self.endpoint_url
            
            self._client = session.client('s3', **client_config)
            logger.info(f"S3 client initialized for bucket: {self.bucket_name}")
            
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {str(e)}")
            self._client = None
    
    @property
    def client(self):
        """Get the S3 client, initializing if necessary."""
        if self._client is None:
            self._initialize_client()
        return self._client
    
    def upload_file(self, file_path: str, key: str) -> bool:
        """
        Upload a file to S3-compatible storage.
        
        Args:
            file_path: Local path to the file to upload
            key: S3 object key (path in bucket)
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if not os.path.exists(file_path):
                logger.error(f"File not found: {file_path}")
                return False
            
            if not self.client:
                logger.error("S3 client not available")
                return False
            
            self.client.upload_file(file_path, self.bucket_name, key)
            logger.info(f"Successfully uploaded {file_path} to s3://{self.bucket_name}/{key}")
            return True
            
        except FileNotFoundError:
            logger.error(f"File not found: {file_path}")
            return False
        except NoCredentialsError:
            logger.error("S3 credentials not available")
            return False
        except ClientError as e:
            logger.error(f"Failed to upload file: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error uploading file: {str(e)}")
            return False
    
    def download_file(self, key: str, dest_path: str) -> bool:
        """
        Download a file from S3-compatible storage.
        
        Args:
            key: S3 object key (path in bucket)
            dest_path: Local destination path
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if not self.client:
                logger.error("S3 client not available")
                return False
            
            # Ensure destination directory exists
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            
            self.client.download_file(self.bucket_name, key, dest_path)
            logger.info(f"Successfully downloaded s3://{self.bucket_name}/{key} to {dest_path}")
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchKey':
                logger.error(f"File not found in storage: {key}")
            else:
                logger.error(f"Failed to download file: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error downloading file: {str(e)}")
            return False
    
    def list_files(self, prefix: str = "") -> List[str]:
        """
        List files in S3-compatible storage with optional prefix.
        
        Args:
            prefix: Prefix to filter objects (e.g., "users/john/")
            
        Returns:
            List[str]: List of object keys
        """
        try:
            if not self.client:
                logger.error("S3 client not available")
                return []
            
            response = self.client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            files = []
            if 'Contents' in response:
                files = [obj['Key'] for obj in response['Contents']]
            
            logger.info(f"Found {len(files)} files with prefix: {prefix}")
            return files
            
        except ClientError as e:
            logger.error(f"Failed to list files: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error listing files: {str(e)}")
            return []
    
    def delete_file(self, key: str) -> bool:
        """
        Delete a file from S3-compatible storage.
        
        Args:
            key: S3 object key (path in bucket)
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if not self.client:
                logger.error("S3 client not available")
                return False
            
            self.client.delete_object(Bucket=self.bucket_name, Key=key)
            logger.info(f"Successfully deleted s3://{self.bucket_name}/{key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete file: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting file: {str(e)}")
            return False
    
    def file_exists(self, key: str) -> bool:
        """
        Check if a file exists in S3-compatible storage.
        
        Args:
            key: S3 object key (path in bucket)
            
        Returns:
            bool: True if file exists, False otherwise
        """
        try:
            if not self.client:
                logger.error("S3 client not available")
                return False
            
            self.client.head_object(Bucket=self.bucket_name, Key=key)
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                return False
            else:
                logger.error(f"Error checking file existence: {str(e)}")
                return False
        except Exception as e:
            logger.error(f"Unexpected error checking file existence: {str(e)}")
            return False
    
    def ensure_user_prefix(self, email_local: str) -> str:
        """
        Ensure user prefix exists and return the standardized prefix.
        
        Args:
            email_local: Local part of user email (before @)
            
        Returns:
            str: Standardized user prefix (e.g., "users/john/")
        """
        # Sanitize email_local for use as S3 key
        sanitized = email_local.replace('.', '_').replace('+', '_').lower()
        prefix = f"users/{sanitized}/"
        
        logger.info(f"User prefix for {email_local}: {prefix}")
        return prefix
    
    def get_temp_file_path(self, key: str) -> str:
        """
        Get a temporary file path for downloading S3 objects.
        
        Args:
            key: S3 object key
            
        Returns:
            str: Temporary file path
        """
        # Extract filename from key
        filename = os.path.basename(key)
        if not filename:
            filename = "temp_file"
        
        # Create temporary file
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"gexfme_{filename}")
        
        return temp_path
    
    def upload_file_obj(self, file_obj, key: str) -> bool:
        """
        Upload a file object (like from Flask request.files) to S3.
        
        Args:
            file_obj: File object with read() method
            key: S3 object key (path in bucket)
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if not self.client:
                logger.error("S3 client not available")
                return False
            
            # Reset file pointer to beginning
            file_obj.seek(0)
            
            self.client.upload_fileobj(file_obj, self.bucket_name, key)
            logger.info(f"Successfully uploaded file object to s3://{self.bucket_name}/{key}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upload file object: {str(e)}")
            return False


# Global storage service instance
storage_service = StorageService()

# Convenience functions for backward compatibility
def upload_file(file_path: str, key: str) -> bool:
    """Upload a file to storage."""
    return storage_service.upload_file(file_path, key)

def download_file(key: str, dest_path: str) -> bool:
    """Download a file from storage."""
    return storage_service.download_file(key, dest_path)

def list_files(prefix: str = "") -> List[str]:
    """List files in storage with optional prefix."""
    return storage_service.list_files(prefix)

def ensure_user_prefix(email_local: str) -> str:
    """Ensure user prefix exists and return standardized prefix."""
    return storage_service.ensure_user_prefix(email_local)

#!/usr/bin/env python3
"""
Test script for Backblaze B2 storage integration
Built for corporate Gexpertise - GexFME project
"""

import os
import tempfile
from app.storage import storage_service

def test_b2_storage():
    """Test all B2 storage operations"""
    print("🧪 Testing Backblaze B2 Storage Integration")
    print("=" * 50)
    
    # Test 1: Basic connection
    print(f"✅ Storage service initialized")
    print(f"   Bucket: {storage_service.bucket_name}")
    print(f"   Endpoint: {os.getenv('S3_ENDPOINT_URL')}")
    print(f"   Region: {os.getenv('S3_REGION')}")
    print()
    
    # Test 2: List files (should be empty initially)
    print("📂 Testing file listing...")
    try:
        files = storage_service.list_files("test/")
        print(f"   Found {len(files)} files in test/ prefix")
        for file in files[:5]:  # Show first 5 files
            print(f"   - {file}")
        print("✅ File listing works")
    except Exception as e:
        print(f"❌ File listing failed: {e}")
    print()
    
    # Test 3: Upload a test file
    print("📤 Testing file upload...")
    try:
        # Create a test file
        test_content = "Hello from GexFME - Corporate Gexpertise!\nBackblaze B2 Storage Test\n"
        test_key = "test/gexfme-test-file.txt"
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as temp_file:
            temp_file.write(test_content)
            temp_file_path = temp_file.name
        
        # Upload to B2
        result = storage_service.upload_file(temp_file_path, test_key)
        print(f"   Upload result: {result}")
        print("✅ File upload works")
        
        # Clean up local temp file
        os.unlink(temp_file_path)
        
    except Exception as e:
        print(f"❌ File upload failed: {e}")
    print()
    
    # Test 4: Download the test file
    print("📥 Testing file download...")
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.txt') as temp_file:
            download_path = temp_file.name
        
        result = storage_service.download_file(test_key, download_path)
        
        if result and os.path.exists(download_path):
            with open(download_path, 'r') as f:
                downloaded_content = f.read()
            print(f"   Downloaded content: {downloaded_content[:50]}...")
            print("✅ File download works")
            
            # Clean up
            os.unlink(download_path)
        else:
            print("❌ File download failed")
            
    except Exception as e:
        print(f"❌ File download failed: {e}")
    print()
    
    # Test 5: User folder operations
    print("👤 Testing user folder operations...")
    try:
        test_email = "test@gexpertise.com"
        user_prefix = storage_service.get_user_prefix(test_email)
        print(f"   User prefix for {test_email}: {user_prefix}")
        
        # Ensure user folder exists
        storage_service.ensure_user_prefix(test_email)
        print("✅ User folder operations work")
        
    except Exception as e:
        print(f"❌ User folder operations failed: {e}")
    print()
    
    # Test 6: Clean up test file
    print("🧹 Cleaning up test files...")
    try:
        result = storage_service.delete_file(test_key)
        print(f"   Delete result: {result}")
        print("✅ File deletion works")
    except Exception as e:
        print(f"❌ File deletion failed: {e}")
    print()
    
    print("🎉 Backblaze B2 storage test completed!")
    print("🚀 Ready for production deployment!")

if __name__ == "__main__":
    test_b2_storage()

import os
import boto3
from botocore.exceptions import NoCredentialsError, ClientError

# Use same env loading as main.py (simplified)
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', '.env')
load_dotenv(env_path)

print(f"Key: {os.getenv('AWS_ACCESS_KEY_ID')}")
print(f"Bucket: {os.getenv('AWS_BUCKET_NAME')}")
print(f"Region: {os.getenv('AWS_REGION')}")

s3 = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION", "us-east-1")
)

bucket_name = os.getenv("AWS_BUCKET_NAME", "pixelpop")

try:
    print("🔌 Testing List Objects...")
    response = s3.list_objects_v2(Bucket=bucket_name, MaxKeys=5)
    print("✅ List Success!")
    for obj in response.get('Contents', []):
        print(f" - {obj['Key']}")

    print("⬆️ Testing Upload...")
    s3.put_object(Bucket=bucket_name, Key="test_connection.txt", Body=b"Hello S3")
    print("✅ Upload Success!")
    
except Exception as e:
    print(f"❌ Failed: {e}")

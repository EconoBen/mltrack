#!/bin/bash

# Setup script for Modal deployment configuration

echo "🚀 MLTrack Modal Setup"
echo "===================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📄 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Check for Modal CLI
if ! command -v modal &> /dev/null; then
    echo ""
    echo "📦 Modal CLI not found. Installing..."
    pip install modal
    echo "✅ Modal CLI installed"
else
    echo "✅ Modal CLI is installed"
fi

# Check Modal authentication
echo ""
echo "🔐 Checking Modal authentication..."
if modal token list &> /dev/null; then
    echo "✅ Modal is authenticated"
else
    echo ""
    echo "⚠️  Modal is not authenticated"
    echo ""
    echo "To authenticate Modal, you need to:"
    echo "1. Create an account at https://modal.com"
    echo "2. Get your tokens from https://modal.com/settings/tokens"
    echo "3. Run: modal token set --token-id YOUR_TOKEN_ID --token-secret YOUR_TOKEN_SECRET"
    echo ""
    echo "Or add them to your .env file:"
    echo "  MODAL_TOKEN_ID=your_token_id"
    echo "  MODAL_TOKEN_SECRET=your_token_secret"
fi

# Check AWS credentials
echo ""
echo "☁️  Checking AWS configuration..."
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "✅ AWS credentials found in environment"
elif [ -f ~/.aws/credentials ]; then
    echo "✅ AWS credentials found in ~/.aws/credentials"
else
    echo ""
    echo "⚠️  AWS credentials not found"
    echo ""
    echo "Modal deployments require AWS S3 for model storage."
    echo "Please add your AWS credentials to the .env file:"
    echo "  AWS_ACCESS_KEY_ID=your_access_key"
    echo "  AWS_SECRET_ACCESS_KEY=your_secret_key"
    echo "  AWS_DEFAULT_REGION=us-east-1"
    echo "  MLTRACK_S3_BUCKET=your-bucket-name"
fi

# Check Python dependencies
echo ""
echo "📦 Checking Python dependencies..."
if python -c "import modal" 2>/dev/null; then
    echo "✅ Modal Python SDK is installed"
else
    echo "Installing Modal Python SDK..."
    pip install modal
fi

if python -c "import boto3" 2>/dev/null; then
    echo "✅ Boto3 (AWS SDK) is installed"
else
    echo "Installing Boto3..."
    pip install boto3
fi

# Create Modal secrets (if authenticated)
if modal token list &> /dev/null; then
    echo ""
    echo "🔑 Setting up Modal secrets..."
    
    # Check if aws-secret exists
    if modal secret list | grep -q "aws-secret"; then
        echo "✅ Modal secret 'aws-secret' already exists"
    else
        echo ""
        echo "Creating Modal secret for AWS credentials..."
        echo "Please enter your AWS credentials:"
        read -p "AWS Access Key ID: " aws_key_id
        read -sp "AWS Secret Access Key: " aws_secret_key
        echo ""
        read -p "AWS Region (default: us-east-1): " aws_region
        aws_region=${aws_region:-us-east-1}
        
        modal secret create aws-secret \
            AWS_ACCESS_KEY_ID="$aws_key_id" \
            AWS_SECRET_ACCESS_KEY="$aws_secret_key" \
            AWS_DEFAULT_REGION="$aws_region"
        
        echo "✅ Modal secret 'aws-secret' created"
    fi
fi

echo ""
echo "📋 Setup Summary"
echo "================"
echo ""
echo "✅ Environment file: .env"
echo "✅ Modal CLI: $(which modal)"
echo "✅ Python Modal SDK: $(pip show modal | grep Version | cut -d' ' -f2)"
echo "✅ Boto3 SDK: $(pip show boto3 | grep Version | cut -d' ' -f2)"
echo ""

# Show next steps
echo "📌 Next Steps"
echo "============="
echo ""
echo "1. Edit .env file with your credentials:"
echo "   - Modal tokens"
echo "   - AWS credentials"
echo "   - S3 bucket name"
echo ""
echo "2. Authenticate Modal (if not done):"
echo "   modal token set --token-id YOUR_TOKEN_ID --token-secret YOUR_TOKEN_SECRET"
echo ""
echo "3. Train a model:"
echo "   make train"
echo ""
echo "4. Deploy to Modal:"
echo "   make modal-deploy"
echo ""
echo "Happy deploying! 🚀"
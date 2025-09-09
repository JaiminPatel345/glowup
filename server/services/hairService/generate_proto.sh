#!/bin/bash
# Generate Python gRPC code from proto files

# Set paths
PROTO_DIR="../../../proto"
OUTPUT_DIR="."
PROTO_FILE="video_processing.proto"

# Create output directory if it doesn't exist
mkdir -p $OUTPUT_DIR

# Generate Python gRPC code
python -m grpc_tools.protoc \
    --proto_path=$PROTO_DIR \
    --python_out=$OUTPUT_DIR \
    --grpc_python_out=$OUTPUT_DIR \
    $PROTO_FILE

echo "Generated gRPC Python files:"
echo "- video_processing_pb2.py"
echo "- video_processing_pb2_grpc.py"

# Hair Service

---
## Powered with HairFastGen and gRPC

### For compile `.proto` files 
```bash
#make sure you are in virtual environment 
# Also make sure you are at growup/server.
pip install grpc_tools
python3 -m grpc_tools.protoc --proto_path=proto --python_out=services/hairService/ --grpc_python_out=services/hairService  proto/chat.proto 
```
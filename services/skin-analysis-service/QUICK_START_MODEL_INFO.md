# Quick Start: Model Info Endpoint

## 🚀 Quick Access

```bash
# If server is running
curl http://localhost:8000/api/v1/model/info
```

## 📋 What You Get

- ✅ Model name and version
- ✅ Accuracy metrics (>=90%)
- ✅ Device info (GPU/CPU)
- ✅ Loading status
- ✅ 5 supported skin types
- ✅ 8 supported skin issues
- ✅ Configuration details

## 🧪 Quick Test

```bash
# Test without server
python test_model_info_endpoint.py

# Test with FastAPI
python test_model_info_api.py

# Test with curl (requires running server)
./test_model_info_curl.sh
```

## 💡 Common Use Cases

### Check if model is ready
```python
import requests
r = requests.get("http://localhost:8000/api/v1/model/info")
is_ready = r.json()['status']['loaded']
```

### Get supported capabilities
```python
import requests
r = requests.get("http://localhost:8000/api/v1/model/info")
data = r.json()
print("Skin Types:", data['capabilities']['supported_skin_types'])
print("Issues:", data['capabilities']['supported_issues'])
```

### Monitor GPU usage
```python
import requests
r = requests.get("http://localhost:8000/api/v1/model/info")
data = r.json()
if data['status']['device'] == 'cuda':
    print(f"GPU Memory: {data['performance'].get('gpu_memory_allocated_mb', 0)} MB")
```

## 📚 Full Documentation

- **Usage Guide**: `MODEL_INFO_ENDPOINT_GUIDE.md`
- **Verification**: `TASK_19_VERIFICATION.md`
- **Summary**: `TASK_19_SUMMARY.md`

## ✅ Status

**Task 19**: ✅ Complete  
**Tests**: ✅ All Passing  
**Documentation**: ✅ Complete

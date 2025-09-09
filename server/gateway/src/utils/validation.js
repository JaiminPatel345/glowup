function validateFrame(frameData) {
  if (!frameData) {
    return { valid: false, error: 'Frame data is required' };
  }

  if (!frameData.frameData) {
    return { valid: false, error: 'frameData is required' };
  }

  if (typeof frameData.frameData !== 'string') {
    return { valid: false, error: 'frameData must be a base64 string' };
  }

  // Check if it's a valid base64 string
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(frameData.frameData.replace(/^data:image\/[^;]+;base64,/, ''))) {
    return { valid: false, error: 'frameData must be valid base64' };
  }

  // Check frame size (limit to 10MB)
  const sizeInBytes = (frameData.frameData.length * 3) / 4;
  if (sizeInBytes > 10 * 1024 * 1024) {
    return { valid: false, error: 'Frame size exceeds 10MB limit' };
  }

  return { valid: true };
}

function validateSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return { valid: false, error: 'Invalid session ID' };
  }
  
  // UUID v4 format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    return { valid: false, error: 'Session ID must be a valid UUID' };
  }
  
  return { valid: true };
}

module.exports = {
  validateFrame,
  validateSessionId
};

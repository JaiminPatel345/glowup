class Session {
  constructor(id, ws) {
    this.id = id;
    this.ws = ws;
    this.grpcStream = null;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
    this.frameCount = 0;
    this.bytesReceived = 0;
  }

  setGrpcStream(stream) {
    this.grpcStream = stream;
  }

  updateStats(bytesReceived = 0) {
    this.lastActivity = Date.now();
    this.frameCount++;
    this.bytesReceived += bytesReceived;
  }

  getStats() {
    const now = Date.now();
    return {
      sessionId: this.id,
      duration: now - this.createdAt,
      lastActivity: this.lastActivity,
      frameCount: this.frameCount,
      bytesReceived: this.bytesReceived,
      fps: this.frameCount / ((now - this.createdAt) / 1000),
      isActive: (now - this.lastActivity) < 30000 // 30 seconds timeout
    };
  }
}

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.startCleanupTimer();
  }

  createSession(sessionId, ws) {
    const session = new Session(sessionId, ws);
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  removeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session && session.grpcStream) {
      session.grpcStream.end();
    }
    this.sessions.delete(sessionId);
  }

  getActiveSessionsCount() {
    return this.sessions.size;
  }

  getAllSessions() {
    return Array.from(this.sessions.values()).map(session => session.getStats());
  }

  startCleanupTimer() {
    // Clean up inactive sessions every 60 seconds
    setInterval(() => {
      const now = Date.now();
      const inactiveSessions = [];

      for (const [sessionId, session] of this.sessions) {
        if (now - session.lastActivity > 60000) { // 1 minute timeout
          inactiveSessions.push(sessionId);
        }
      }

      inactiveSessions.forEach(sessionId => {
        console.log(`Cleaning up inactive session: ${sessionId}`);
        this.removeSession(sessionId);
      });
    }, 60000);
  }
}

module.exports = SessionManager;

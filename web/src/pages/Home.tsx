import React, { useRef, useState } from "react";

const ChatBot: React.FC<{
  label: string;
  wsPort: number;
}> = ({ label, wsPort }) => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const wsRef = useRef<WebSocket | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const firstTokenRef = useRef(true);

  const handleSend = () => {
    if (!input.trim()) return;
    setOutput("");
    setStatus("Connecting...");
    const now = Date.now();
    setStartTime(now);
    startTimeRef.current = now;
    setElapsed(null);
    firstTokenRef.current = true;
    const ws = new window.WebSocket(`ws://${window.location.hostname}:${wsPort}`);
    wsRef.current = ws;
    ws.onopen = () => {
      setStatus("Connected.");
      ws.send(JSON.stringify({ input, sessionId }));
    };
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "token" || msg.type === "graph_step") {
        if (firstTokenRef.current) {
          const st = startTimeRef.current;
          if (st) setElapsed(Date.now() - st);
          firstTokenRef.current = false;
        }
        setOutput((prev) => prev + msg.data);
      } else if (msg.type === "end") {
        setStatus("Done.");
        setInput("");
      } else if (msg.type === "error") {
        setStatus("Error: " + msg.data);
      }
    };
    ws.onerror = () => setStatus("WebSocket error.");
    ws.onclose = () => setStatus((s) => s + " (Connection closed)");
  };

  const handleClose = () => {
    wsRef.current?.close();
    setStatus("");
    setOutput("");
    setInput("");
    setElapsed(null);
    setStartTime(null);
    startTimeRef.current = null;
    firstTokenRef.current = true;
    setSessionId(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  };

  return (
    <div style={{
      border: "1px solid #e0e0e0",
      borderRadius: 16,
      padding: "clamp(16px, 4vw, 24px)",
      margin: "0 auto 24px",
      maxWidth: 800,
      width: "min(100%, 800px)",
      background: "#ffffff",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
      position: "relative",
      transition: "all 0.3s ease"
    }}>
      {elapsed !== null && (
        <div style={{
          position: "absolute",
          top: "clamp(12px, 3vw, 16px)",
          right: "clamp(16px, 4vw, 20px)",
          color: "#6a5acd",
          fontSize: "clamp(12px, 2.5vw, 14px)",
          fontWeight: 600,
          background: "#f7f8fa",
          borderRadius: 8,
          padding: "4px 12px",
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)"
        }}>
          {elapsed} ms
        </div>
      )}
      <h3 style={{ 
        color: "#6a5acd", 
        marginBottom: "clamp(12px, 3vw, 16px)",
        fontSize: "clamp(18px, 3.5vw, 20px)",
        fontWeight: 600,
        borderBottom: "2px solid #f0f0f0",
        paddingBottom: "clamp(8px, 2vw, 12px)"
      }}>{label}</h3>
      <div style={{ 
        minHeight: 100, 
        maxHeight: "clamp(200px, 40vh, 300px)",
        overflowY: "auto",
        whiteSpace: "pre-wrap", 
        marginBottom: 12, 
        color: "#333",
        padding: "clamp(12px, 3vw, 16px)",
        background: "#fafaff",
        borderRadius: 8,
        border: "1px solid #f0f0f0",
        fontSize: "clamp(14px, 2.5vw, 15px)",
        lineHeight: 1.6
      }}>{output || "Waiting for input..."}</div>
      <div style={{ 
        color: "#888", 
        fontSize: "clamp(12px, 2.5vw, 13px)",
        marginBottom: 12,
        fontStyle: "italic"
      }}>{status}</div>
      <div style={{ 
        display: "flex", 
        gap: "clamp(6px, 2vw, 8px)", 
        marginTop: 16,
        flexWrap: "wrap"
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your message..."
          style={{ 
            flex: "1 1 200px",
            padding: "clamp(8px, 2vw, 10px) clamp(12px, 3vw, 16px)", 
            borderRadius: 8, 
            border: "1px solid #e0e0e0",
            fontSize: "clamp(14px, 2.5vw, 15px)",
            transition: "all 0.3s ease",
            outline: "none",
            minWidth: 0
          }}
          onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
        />
        <button 
          onClick={handleSend} 
          style={{ 
            padding: "clamp(8px, 2vw, 10px) clamp(16px, 3vw, 20px)", 
            borderRadius: 8, 
            border: "none", 
            background: "#6a5acd", 
            color: "#fff", 
            fontWeight: 600,
            fontSize: "clamp(14px, 2.5vw, 15px)",
            cursor: "pointer",
            transition: "all 0.3s ease",
            flex: "0 0 auto"
          }}
        >
          Send
        </button>
        <button 
          onClick={handleClose} 
          style={{ 
            padding: "clamp(8px, 2vw, 10px) clamp(16px, 3vw, 20px)", 
            borderRadius: 8, 
            border: "1px solid #e0e0e0", 
            background: "#fff",
            color: "#666",
            fontSize: "clamp(14px, 2.5vw, 15px)",
            cursor: "pointer",
            transition: "all 0.3s ease",
            flex: "0 0 auto"
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

const Home: React.FC = () => (
  <div style={{ 
    minHeight: "100vh", 
    background: "#f7f8fa", 
    padding: "clamp(20px, 5vw, 40px) clamp(12px, 3vw, 20px)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  }}>
    <h1 style={{
      color: "#333",
      marginBottom: "clamp(24px, 6vw, 32px)",
      fontSize: "clamp(24px, 5vw, 28px)",
      fontWeight: 700,
      textAlign: "center"
    }}>
      AI Chat Test
    </h1>
    <ChatBot label="Single Agent (LangChain)" wsPort={3000} />
    <ChatBot label="LangGraph Multi-Agent" wsPort={3001} />
  </div>
);

export default Home; 
export default function TypingIndicator() {
  return (
    <div style={{
      display: "flex", gap: "5px", padding: "12px 18px",
      background: "var(--bg-card)", borderRadius: "18px 18px 18px 4px",
      maxWidth: "fit-content",
      border: "1px solid var(--border)",
      alignItems: "center",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
    }}>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        .typing-dot {
          width: 7px; height: 7px;
          background: linear-gradient(135deg, var(--accent-from), var(--accent-to));
          border-radius: 50%;
          animation: typingBounce 1.4s infinite ease-in-out both;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.16s; }
        .typing-dot:nth-child(3) { animation-delay: 0.32s; }
      `}</style>
      <div className="typing-dot" />
      <div className="typing-dot" />
      <div className="typing-dot" />
    </div>
  );
}

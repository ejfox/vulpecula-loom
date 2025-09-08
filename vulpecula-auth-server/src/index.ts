import express from "express";
import cors from "cors";
import helmet from "helmet";
import { auth } from "./auth/config";
import chatsRouter from "./routes/chats";
import { betterAuthHandler } from "./middleware/auth-handler";

// Initialize database connection
import "./db/connection";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: [
    "http://localhost:3344",
    "http://localhost:5173", 
    "vulpecula://"
  ],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Mount better-auth handler
app.all("/api/auth/*", betterAuthHandler);

// Custom API routes
app.use("/api/chats", chatsRouter);

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Server error:", err);
  res.status(500).json({ 
    success: false, 
    error: { message: "Internal server error" } 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Vulpecula Auth Server running on http://localhost:${PORT}`);
  console.log(`📚 Auth endpoints available at http://localhost:${PORT}/api/auth/*`);
  console.log(`💬 Chat endpoints available at http://localhost:${PORT}/api/chats/*`);
});
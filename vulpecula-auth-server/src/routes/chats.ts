import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db/connection";
import { chats, type NewChat } from "../db/schema";
import { auth } from "../auth/config";

const router = Router();

// Middleware to verify authentication
const requireAuth = async (req: any, res: any, next: any) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = session.user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid session" });
  }
};

// GET /api/chats - Get user's chats
router.get("/", requireAuth, async (req: any, res) => {
  try {
    const userChats = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, req.user.id))
      .orderBy(desc(chats.updatedAt));

    res.json({ success: true, data: userChats });
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ 
      success: false, 
      error: { message: "Failed to fetch chats" } 
    });
  }
});

// POST /api/chats - Create new chat
router.post("/", requireAuth, async (req: any, res) => {
  try {
    const { title, messages, model, metadata, threadId } = req.body;

    const newChat: NewChat = {
      userId: req.user.id,
      title: title || "New Chat",
      messages: messages || [],
      model: model || "gpt-4",
      metadata: {
        ...metadata,
        messageCount: messages?.length || 0,
        lastUpdated: new Date().toISOString(),
      },
      threadId: threadId || null,
    };

    const [createdChat] = await db.insert(chats).values(newChat).returning();

    res.json({ success: true, data: createdChat });
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ 
      success: false, 
      error: { message: "Failed to create chat" } 
    });
  }
});

// PUT /api/chats/:id - Update chat
router.put("/:id", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { title, messages, metadata, model, threadId } = req.body;

    const updatedMetadata = {
      ...metadata,
      messageCount: messages?.length || 0,
      lastUpdated: new Date().toISOString(),
    };

    const [updatedChat] = await db
      .update(chats)
      .set({
        title,
        messages,
        metadata: updatedMetadata,
        model,
        threadId,
        updatedAt: new Date(),
      })
      .where(eq(chats.id, id))
      .returning();

    if (!updatedChat) {
      return res.status(404).json({ 
        success: false, 
        error: { message: "Chat not found" } 
      });
    }

    res.json({ success: true, data: updatedChat });
  } catch (error) {
    console.error("Error updating chat:", error);
    res.status(500).json({ 
      success: false, 
      error: { message: "Failed to update chat" } 
    });
  }
});

// DELETE /api/chats/:id - Delete chat
router.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;

    const [deletedChat] = await db
      .delete(chats)
      .where(eq(chats.id, id))
      .returning();

    if (!deletedChat) {
      return res.status(404).json({ 
        success: false, 
        error: { message: "Chat not found" } 
      });
    }

    res.json({ success: true, message: "Chat deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ 
      success: false, 
      error: { message: "Failed to delete chat" } 
    });
  }
});

export default router;
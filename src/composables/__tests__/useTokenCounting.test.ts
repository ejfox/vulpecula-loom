import { describe, it, expect } from "vitest";

describe("Token Counting", () => {
  describe("estimateTokenCount", () => {
    it("estimates tokens for simple text", () => {
      const text = "This is a simple message";
      const count = estimateTokenCount(text);
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThan(10);
    });

    it("estimates tokens for code blocks", () => {
      const text = "```typescript\nfunction test() {\n  return true;\n}\n```";
      const count = estimateTokenCount(text);
      expect(count).toBeGreaterThan(10);
      expect(count).toBeLessThan(30);
    });

    it("handles empty strings", () => {
      expect(estimateTokenCount("")).toBe(0);
    });
  });

  describe("calculateMessageCost", () => {
    it("calculates cost for GPT-4 model", () => {
      const tokens = 1000;
      const model = "gpt-4";
      const cost = calculateMessageCost(tokens, model);
      expect(cost).toBeCloseTo(0.03); // $0.03 per 1K tokens
    });

    it("calculates cost for GPT-3.5 model", () => {
      const tokens = 1000;
      const model = "gpt-3.5-turbo";
      const cost = calculateMessageCost(tokens, model);
      expect(cost).toBeCloseTo(0.002); // $0.002 per 1K tokens
    });

    it("handles zero tokens", () => {
      expect(calculateMessageCost(0, "gpt-4")).toBe(0);
    });
  });

  describe("trackModelUsage", () => {
    it("accumulates token usage", () => {
      const usage = new ModelUsageTracker();

      usage.trackUsage("gpt-4", 1000);
      expect(usage.getModelTotal("gpt-4")).toBe(1000);

      usage.trackUsage("gpt-4", 500);
      expect(usage.getModelTotal("gpt-4")).toBe(1500);
    });

    it("tracks multiple models separately", () => {
      const usage = new ModelUsageTracker();

      usage.trackUsage("gpt-4", 1000);
      usage.trackUsage("gpt-3.5-turbo", 2000);

      expect(usage.getModelTotal("gpt-4")).toBe(1000);
      expect(usage.getModelTotal("gpt-3.5-turbo")).toBe(2000);
    });

    it("calculates total cost across models", () => {
      const usage = new ModelUsageTracker();

      usage.trackUsage("gpt-4", 1000); // $0.03
      usage.trackUsage("gpt-3.5-turbo", 1000); // $0.002

      expect(usage.getTotalCost()).toBeCloseTo(0.032);
    });
  });
});

// Helper classes and functions
class ModelUsageTracker {
  private usage: Record<string, number> = {};

  trackUsage(model: string, tokens: number) {
    this.usage[model] = (this.usage[model] || 0) + tokens;
  }

  getModelTotal(model: string): number {
    return this.usage[model] || 0;
  }

  getTotalCost(): number {
    return Object.entries(this.usage).reduce((total, [model, tokens]) => {
      return total + calculateMessageCost(tokens, model);
    }, 0);
  }
}

function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

function calculateMessageCost(tokens: number, model: string): number {
  const rates: Record<string, number> = {
    "gpt-4": 0.03,
    "gpt-3.5-turbo": 0.002,
  };

  return (tokens / 1000) * (rates[model] || 0);
}

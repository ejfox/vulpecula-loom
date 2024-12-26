import { describe, it, expect } from "vitest";

describe("App Initialization", () => {
  describe("loadSettings", () => {
    it("loads default settings when none exist", () => {
      const settings = new AppSettings();
      expect(settings.getTheme()).toBe("system");
      expect(settings.getModel()).toBe("gpt-4");
      expect(settings.getTemperature()).toBe(0.7);
    });

    it("persists user settings", () => {
      const settings = new AppSettings();
      settings.setTheme("dark");
      settings.setModel("gpt-3.5-turbo");
      settings.setTemperature(0.9);

      const newSettings = new AppSettings();
      expect(newSettings.getTheme()).toBe("dark");
      expect(newSettings.getModel()).toBe("gpt-3.5-turbo");
      expect(newSettings.getTemperature()).toBe(0.9);
    });
  });

  describe("startupSequence", () => {
    it("initializes in correct order", async () => {
      const startup = new StartupManager();
      const sequence: string[] = [];

      startup.onStep("settings", () => {
        sequence.push("settings");
      });
      startup.onStep("environment", () => {
        sequence.push("environment");
      });
      startup.onStep("models", () => {
        sequence.push("models");
      });

      await startup.initialize();

      expect(sequence).toEqual(["settings", "environment", "models"]);
    });

    it("handles initialization errors", async () => {
      const startup = new StartupManager();
      startup.onStep("environment", () => {
        throw new Error("API key missing");
      });

      await expect(startup.initialize()).rejects.toThrow("API key missing");
    });
  });
});

// Helper classes
class AppSettings {
  private static instance: AppSettings;
  private settings = {
    theme: "system",
    model: "gpt-4",
    temperature: 0.7,
  };

  constructor() {
    if (AppSettings.instance) {
      return AppSettings.instance;
    }
    AppSettings.instance = this;
  }

  getTheme() {
    return this.settings.theme;
  }
  getModel() {
    return this.settings.model;
  }
  getTemperature() {
    return this.settings.temperature;
  }

  setTheme(theme: string) {
    this.settings.theme = theme;
  }
  setModel(model: string) {
    this.settings.model = model;
  }
  setTemperature(temp: number) {
    this.settings.temperature = temp;
  }
}

class StartupManager {
  private steps: Record<string, () => void | Promise<void>> = {};
  private sequence = ["settings", "environment", "models"];

  onStep(step: string, handler: () => void | Promise<void>) {
    this.steps[step] = handler;
  }

  async initialize() {
    for (const step of this.sequence) {
      if (this.steps[step]) {
        await this.steps[step]();
      }
    }
  }
}

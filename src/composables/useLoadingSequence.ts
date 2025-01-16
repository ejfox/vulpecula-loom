import { ref, computed } from "vue";

export interface LoadingStep {
  id: string;
  label: string;
  state: "loading" | "success" | "error";
  progress?: number;
  delay?: number;
}

export function useLoadingSequence() {
  const steps = ref<LoadingStep[]>([]);
  const currentStepIndex = ref(-1);

  const addStep = (step: Omit<LoadingStep, "state">) => {
    steps.value.push({
      ...step,
      state: "loading",
    });
  };

  const startSequence = async () => {
    currentStepIndex.value = 0;
    for (let i = 0; i < steps.value.length; i++) {
      const step = steps.value[i];
      if (step.delay) {
        await new Promise((resolve) => setTimeout(resolve, step.delay));
      }
      currentStepIndex.value = i;
    }
  };

  const updateStep = (id: string, updates: Partial<LoadingStep>) => {
    const index = steps.value.findIndex((s) => s.id === id);
    if (index !== -1) {
      steps.value[index] = {
        ...steps.value[index],
        ...updates,
      };
    }
  };

  const completeStep = (id: string, success = true) => {
    const index = steps.value.findIndex((s) => s.id === id);
    if (index !== -1) {
      steps.value[index] = {
        ...steps.value[index],
        state: success ? "success" : "error",
        progress: 100,
      };
      if (currentStepIndex.value === index && index < steps.value.length - 1) {
        currentStepIndex.value = index + 1;
      }
    }
  };

  const currentStep = computed(() =>
    currentStepIndex.value >= 0 ? steps.value[currentStepIndex.value] : null
  );

  const isComplete = computed(() =>
    steps.value.every(
      (step) => step.state === "success" || step.state === "error"
    )
  );

  const hasError = computed(() =>
    steps.value.some((step) => step.state === "error")
  );

  const reset = () => {
    steps.value = [];
    currentStepIndex.value = -1;
  };

  return {
    steps,
    currentStep,
    isComplete,
    hasError,
    addStep,
    startSequence,
    updateStep,
    completeStep,
    reset,
  };
}

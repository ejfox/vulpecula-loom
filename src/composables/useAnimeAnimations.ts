import {
  animate,
  createAnimatable,
  stagger,
  onScroll,
} from "../../anime.esm.js";
import type { Ref } from "vue";
import type {
  AnimeInstance,
  AnimeParams,
  ScrollObserverParams,
  StaggerOptions,
  AnimatableInstance,
} from "../types";

// Animation configuration constants
const DURATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

const EASINGS = {
  smooth: "cubicBezier(.4, 0, .2, 1)",
  enter: "outExpo",
  exit: "inExpo",
  bounce: "outBounce",
  snappy: "outBack(1.5)",
} as const;

// Types for our enhanced animation system
type KeyframeDefinition = {
  [key: string]: any;
  duration?: number;
  ease?: keyof typeof EASINGS;
};

type StaggerConfig = {
  value: any;
  from?: any;
  grid?: [number, number];
  axis?: "x" | "y";
  start?: number;
};

type ScrollConfig = Omit<ScrollObserverParams, "container" | "target"> & {
  container?: Ref<Element>;
  target?: Ref<Element>;
};

type AnimationConfig = AnimeParams & {
  autoplay?: any;
};

export const useAnimeAnimations = () => {
  // Create scroll observer for animation
  const createScrollObserver = (config: ScrollConfig): any => {
    return onScroll({
      container: config.container?.value,
      target: config.target?.value,
      enter: config.enter ?? "bottom-=20% top",
      leave: config.leave ?? "top+=20% bottom",
      sync:
        config.sync === false
          ? false
          : config.sync
          ? EASINGS[config.sync as keyof typeof EASINGS] || config.sync
          : "play pause",
      debug: config.debug ?? false,
      axis: config.axis ?? "y",
      repeat: config.repeat ?? true,
      onEnter: config.onEnter,
      onLeave: config.onLeave,
      onUpdate: config.onUpdate,
    });
  };

  // Enhanced message animation with scroll sync
  const scrollMessage = (
    el: Ref<Element>,
    options: {
      enter?: boolean;
      duration?: keyof typeof DURATIONS;
      keyframes?: KeyframeDefinition[];
      scroll?: ScrollConfig;
      stagger?: StaggerConfig;
    }
  ): AnimeInstance => {
    const {
      enter = true,
      duration = "normal",
      keyframes,
      scroll,
      stagger: staggerOpts,
    } = options;

    const config: AnimationConfig = {
      translateY: {
        from: enter ? 20 : 0,
        to: enter ? 0 : -20,
      },
      opacity: {
        from: enter ? 0 : 1,
        to: enter ? 1 : 0,
      },
      scale: {
        from: enter ? 0.97 : 1,
        to: enter ? 1 : 0.97,
      },
      duration: DURATIONS[duration],
      ease: enter ? EASINGS.smooth : EASINGS.exit,
    };

    // Add scroll observer if configured
    if (scroll) {
      config.autoplay = createScrollObserver({
        ...scroll,
        target: scroll.target ?? el,
        // Default to smooth easing for scroll sync
        sync: scroll.sync ?? "smooth",
      });
    }

    // Add stagger if configured
    if (staggerOpts) {
      config.delay = stagger(staggerOpts.value, {
        from: staggerOpts.from,
        grid: staggerOpts.grid,
        axis: staggerOpts.axis,
        start: staggerOpts.start,
      });
    }

    // Use keyframes if provided
    if (keyframes) {
      config.keyframes = keyframes.map((frame) => ({
        translateY: frame.translateY,
        opacity: frame.opacity,
        scale: frame.scale,
        duration: frame.duration ?? DURATIONS[duration] / keyframes.length,
        ease: frame.ease ? EASINGS[frame.ease] : EASINGS.smooth,
      }));
    }

    return animate(el.value, config);
  };

  // Create a scroll-synced timeline for multiple elements
  const scrollTimeline = (
    elements: Ref<Element>[],
    options: {
      scroll?: ScrollConfig;
      stagger?: StaggerConfig;
      duration?: keyof typeof DURATIONS;
    }
  ): AnimeInstance => {
    const { scroll, stagger: staggerOpts, duration = "normal" } = options;

    const config: AnimationConfig = {
      translateY: {
        from: 20,
        to: 0,
      },
      opacity: {
        from: 0,
        to: 1,
      },
      scale: {
        from: 0.97,
        to: 1,
      },
      duration: DURATIONS[duration],
      ease: EASINGS.smooth,
    };

    // Add scroll observer if configured
    if (scroll) {
      config.autoplay = createScrollObserver({
        ...scroll,
        target: scroll.target ?? elements[0],
        // Default to smooth easing for scroll sync
        sync: scroll.sync ?? "smooth",
      });
    }

    // Add stagger if configured
    if (staggerOpts) {
      config.delay = stagger(staggerOpts.value, {
        from: staggerOpts.from,
        grid: staggerOpts.grid,
        axis: staggerOpts.axis,
        start: staggerOpts.start,
      });
    }

    return animate(
      elements.map((el) => el.value),
      config
    );
  };

  // Create reusable animatable instances for performance
  const createDraggable = (el: Ref<Element>): AnimatableInstance => {
    return createAnimatable(el.value, {
      x: { duration: 300 },
      y: { duration: 300 },
      scale: { duration: 200 },
      rotate: { duration: 400 },
      ease: EASINGS.smooth,
    });
  };

  // Enhanced slide with keyframe sequences
  const slide = (
    el: Ref<Element>,
    options: {
      direction: "left" | "right" | "up" | "down";
      enter?: boolean;
      duration?: keyof typeof DURATIONS;
      keyframes?: KeyframeDefinition[];
    }
  ): AnimeInstance => {
    const { direction, enter = true, duration = "normal", keyframes } = options;

    const axis =
      direction === "left" || direction === "right"
        ? "translateX"
        : "translateY";
    const movement =
      direction === "left" || direction === "up" ? "-100%" : "100%";

    // If keyframes are provided, use them for more complex animations
    if (keyframes) {
      const config: AnimationConfig = {
        duration: DURATIONS[duration],
        keyframes: keyframes.map((frame) => ({
          [axis]: frame[axis] ?? (enter ? 0 : movement),
          opacity: frame.opacity ?? 1,
          scale: frame.scale,
          duration: frame.duration ?? DURATIONS[duration] / keyframes.length,
          ease: frame.ease ? EASINGS[frame.ease] : EASINGS.smooth,
        })),
      };

      return animate(el.value, config);
    }

    const config: AnimationConfig = {
      [axis]: {
        from: enter ? movement : 0,
        to: enter ? 0 : movement,
      },
      duration: DURATIONS[duration],
      ease: enter ? EASINGS.enter : EASINGS.exit,
    };

    return animate(el.value, config);
  };

  // Enhanced fade with stagger support
  const fade = (
    el: Ref<Element> | Ref<Element>[],
    options: {
      enter?: boolean;
      duration?: keyof typeof DURATIONS;
      scale?: boolean;
      stagger?: StaggerConfig;
    }
  ) => {
    const {
      enter = true,
      duration = "normal",
      scale = false,
      stagger: staggerOpts,
    } = options;

    const config: AnimationConfig = {
      opacity: {
        from: enter ? 0 : 1,
        to: enter ? 1 : 0,
      },
      duration: DURATIONS[duration],
      ease: enter ? EASINGS.enter : EASINGS.exit,
    };

    if (scale) {
      config.scale = {
        from: enter ? 0.95 : 1,
        to: enter ? 1 : 0.95,
      };
    }

    // Apply stagger if configured
    if (staggerOpts) {
      config.delay = stagger(staggerOpts.value, {
        from: staggerOpts.from,
        grid: staggerOpts.grid,
        axis: staggerOpts.axis,
        start: staggerOpts.start,
      });
    }

    return animate(
      Array.isArray(el) ? el.map((ref) => ref.value) : el.value,
      config
    );
  };

  // Enhanced message animation with keyframes
  const message = (
    el: Ref<Element>,
    options: {
      enter?: boolean;
      duration?: keyof typeof DURATIONS;
      keyframes?: KeyframeDefinition[];
    }
  ) => {
    const { enter = true, duration = "normal", keyframes } = options;

    if (keyframes) {
      const config: AnimationConfig = {
        duration: DURATIONS[duration],
        keyframes: keyframes.map((frame) => ({
          translateY: frame.translateY,
          opacity: frame.opacity,
          scale: frame.scale,
          duration: frame.duration ?? DURATIONS[duration] / keyframes.length,
          ease: frame.ease ? EASINGS[frame.ease] : EASINGS.smooth,
        })),
      };

      return animate(el.value, config);
    }

    const config: AnimationConfig = {
      translateY: {
        from: enter ? 20 : 0,
        to: enter ? 0 : -20,
      },
      opacity: {
        from: enter ? 0 : 1,
        to: enter ? 1 : 0,
      },
      duration: DURATIONS[duration],
      ease: enter ? EASINGS.smooth : EASINGS.exit,
    };

    return animate(el.value, config);
  };

  // Enhanced collapse with animatable properties
  const collapse = (
    el: Ref<Element>,
    options: {
      enter?: boolean;
      duration?: keyof typeof DURATIONS;
      direction?: "vertical" | "horizontal";
    }
  ) => {
    const {
      enter = true,
      duration = "normal",
      direction = "vertical",
    } = options;
    const prop = direction === "vertical" ? "height" : "width";

    // Create an animatable instance for smooth transitions
    const animatable = createAnimatable(el.value, {
      [prop]: { duration: DURATIONS[duration] },
      ease: EASINGS.smooth,
    });

    // Get initial size before animation
    const initialSize = el.value.getBoundingClientRect()[prop];

    // Animate the property
    animatable[prop](enter ? initialSize : 0);

    return {
      // Return the animatable instance for more control
      animatable,
      // Provide a promise-based interface for consistency
      finished: new Promise((resolve) => {
        setTimeout(resolve, DURATIONS[duration]);
      }),
    };
  };

  return {
    // Animation helpers
    DURATIONS,
    EASINGS,
    // Animation functions
    slide,
    fade,
    message,
    collapse,
    // Scroll-synced animations
    scrollMessage,
    scrollTimeline,
    createScrollObserver,
    // Utility functions
    createDraggable,
  };
};

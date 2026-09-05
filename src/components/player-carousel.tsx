"use client";

import {
  Children,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui";
import { carouselTarget, easeInOutCubic } from "@/lib/carousel-motion";

export function PlayerCarousel({ children }: { children: ReactNode }) {
  const slides = Children.toArray(children);
  const id = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const moveRef = useRef<(direction: -1 | 1, automatic?: boolean) => void>(
    () => {},
  );
  const cancelRef = useRef<() => void>(() => {});
  const dragging = useRef(false);
  const pointerFocusing = useRef(false);
  const focused = useRef(false);
  const resumeAt = useRef(0);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let measureFrame = 0;
    let direction: -1 | 1 = 1;
    let visible = false;

    const measure = () => {
      measureFrame = 0;
      const maximum = viewport.scrollWidth - viewport.clientWidth;
      const next = {
        start: viewport.scrollLeft <= 2,
        end: viewport.scrollLeft >= maximum - 2,
      };
      setEdges((old) =>
        old.start === next.start && old.end === next.end ? old : next,
      );
    };
    const scheduleMeasure = () => {
      if (!measureFrame) measureFrame = window.requestAnimationFrame(measure);
    };
    const cancel = () => {
      window.cancelAnimationFrame(frame);
      frame = 0;
      delete viewport.dataset.animating;
      scheduleMeasure();
    };
    const move = (nextDirection: -1 | 1, automatic = false) => {
      cancel();
      const items = [...viewport.children] as HTMLElement[];
      const first = items[0]?.offsetLeft ?? 0;
      const maximum = viewport.scrollWidth - viewport.clientWidth;
      const start = viewport.scrollLeft;
      const target = carouselTarget(
        start,
        items.map((item) => item.offsetLeft - first),
        maximum,
        nextDirection,
      );
      if (Math.abs(target - start) < 1) return;
      if (preference.matches) {
        viewport.scrollLeft = target;
        return;
      }
      // Native touch scrolling stays native; arrows and autoplay share this eased step.
      viewport.dataset.animating = "true";
      const started = performance.now();
      const duration = automatic ? 2000 : 720;
      if (automatic) resumeAt.current = started + duration + 800;
      const tick = (now: number) => {
        const progress = Math.min(1, (now - started) / duration);
        viewport.scrollLeft =
          start + (target - start) * easeInOutCubic(progress);
        if (progress < 1) frame = window.requestAnimationFrame(tick);
        else {
          frame = 0;
          delete viewport.dataset.animating;
          measure();
        }
      };
      frame = window.requestAnimationFrame(tick);
    };
    moveRef.current = move;
    cancelRef.current = cancel;
    const resize = new ResizeObserver(() => {
      cancel();
      scheduleMeasure();
    });
    resize.observe(viewport);
    const intersection = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = visible;
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.35;
        if (visible && !wasVisible) resumeAt.current = performance.now() + 1000;
        if (!visible) cancel();
      },
      { threshold: [0, 0.35] },
    );
    intersection.observe(viewport);
    const timer = window.setInterval(() => {
      if (
        !visible ||
        document.hidden ||
        pausedRef.current ||
        dragging.current ||
        focused.current ||
        preference.matches ||
        frame ||
        performance.now() < resumeAt.current
      )
        return;
      const maximum = viewport.scrollWidth - viewport.clientWidth;
      if (maximum < 2) return;
      if (viewport.scrollLeft >= maximum - 2) direction = -1;
      if (viewport.scrollLeft <= 2) direction = 1;
      move(direction, true);
    }, 250);
    const stopWhenHidden = () => {
      if (document.hidden) cancel();
      else resumeAt.current = performance.now() + 1000;
    };
    const stopForPreference = () => {
      if (preference.matches) cancel();
    };
    const releasePointer = () => {
      pointerFocusing.current = false;
      if (!dragging.current) return;
      dragging.current = false;
      resumeAt.current = performance.now() + 1800;
    };
    viewport.addEventListener("scroll", scheduleMeasure, { passive: true });
    document.addEventListener("visibilitychange", stopWhenHidden);
    preference.addEventListener("change", stopForPreference);
    window.addEventListener("pointerup", releasePointer);
    window.addEventListener("pointercancel", releasePointer);
    scheduleMeasure();
    return () => {
      window.clearInterval(timer);
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(measureFrame);
      resize.disconnect();
      intersection.disconnect();
      viewport.removeEventListener("scroll", scheduleMeasure);
      document.removeEventListener("visibilitychange", stopWhenHidden);
      preference.removeEventListener("change", stopForPreference);
      window.removeEventListener("pointerup", releasePointer);
      window.removeEventListener("pointercancel", releasePointer);
      moveRef.current = () => {};
      cancelRef.current = () => {};
    };
  }, [slides.length]);

  const hold = () => {
    resumeAt.current = performance.now() + 2800;
    cancelRef.current();
  };
  const step = (direction: -1 | 1) => {
    hold();
    moveRef.current(direction);
  };

  return (
    <div
      className="player-carousel"
      onPointerDownCapture={() => {
        pointerFocusing.current = true;
        focused.current = false;
      }}
      onFocusCapture={(event) => {
        focused.current =
          !pointerFocusing.current && event.target.matches(":focus-visible");
        if (focused.current) cancelRef.current();
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focused.current = false;
          resumeAt.current = performance.now() + 1000;
        }
      }}
    >
      <div
        id={id}
        ref={viewportRef}
        className="player-carousel-viewport"
        role="region"
        aria-label="交大玩家轮播"
        aria-roledescription="轮播"
        tabIndex={0}
        onPointerDown={() => {
          dragging.current = true;
          focused.current = false;
          hold();
        }}
        onWheel={(event) => {
          if (Math.abs(event.deltaX) > 0) hold();
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            step(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        {slides.map((slide, index) => (
          <div
            className="player-carousel-slide"
            key={index}
            role="group"
            aria-roledescription="幻灯片"
            aria-label={`${index + 1} / ${slides.length}`}
          >
            {slide}
          </div>
        ))}
      </div>
      {!(edges.start && edges.end) ? (
        <div className="player-carousel-controls">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="上一组玩家"
            aria-controls={id}
            isDisabled={edges.start}
            onPress={() => step(-1)}
          >
            <ArrowLeft size={18} />
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            className="player-carousel-autoplay"
            aria-label={paused ? "开始自动滚动玩家" : "暂停自动滚动玩家"}
            aria-controls={id}
            onPress={() => {
              const next = !pausedRef.current;
              pausedRef.current = next;
              setPaused(next);
              if (next) cancelRef.current();
              else {
                focused.current = false;
                resumeAt.current = performance.now() + 250;
              }
            }}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </Button>
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label="下一组玩家"
            aria-controls={id}
            isDisabled={edges.end}
            onPress={() => step(1)}
          >
            <ArrowRight size={18} />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

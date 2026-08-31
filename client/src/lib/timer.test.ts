import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMER_MS,
  MAX_TIMER_MS,
  MIN_TIMER_MS,
  computeRemainingMs,
  formatTimer,
  isTimerFinished,
  parseDurationInput,
} from "./timer.js";
import type { TimerFields } from "./timer.js";

describe("parseDurationInput", () => {
  it("parses bare seconds", () => {
    expect(parseDurationInput("90")).toBe(90_000);
  });

  it("parses MM:SS", () => {
    expect(parseDurationInput("5:30")).toBe(330_000);
  });

  it("parses H:MM:SS", () => {
    expect(parseDurationInput("1:00:00")).toBe(3_600_000);
  });

  it("tolerates surrounding whitespace and zero-padding", () => {
    expect(parseDurationInput(" 05:30 ")).toBe(330_000);
  });

  it("rejects invalid input with null", () => {
    expect(parseDurationInput("")).toBeNull();
    expect(parseDurationInput("abc")).toBeNull();
    expect(parseDurationInput("5:")).toBeNull();
    expect(parseDurationInput(":30")).toBeNull();
    expect(parseDurationInput("1:2:3:4")).toBeNull();
    expect(parseDurationInput("5:99")).toBeNull(); // 99 seconds invalid
  });

  it("clamps out-of-range values", () => {
    expect(parseDurationInput("0")).toBe(MIN_TIMER_MS); // clamped up to 1s
    expect(parseDurationInput("100:00:00")).toBe(MAX_TIMER_MS); // clamped to 8h
  });
});

describe("formatTimer", () => {
  it("formats zero", () => {
    expect(formatTimer(0)).toBe("00:00");
  });

  it("formats seconds under a minute", () => {
    expect(formatTimer(9_000)).toBe("00:09");
  });

  it("formats minutes and seconds", () => {
    expect(formatTimer(65_000)).toBe("01:05");
  });

  it("formats exactly one hour and above", () => {
    expect(formatTimer(3_600_000)).toBe("1:00:00");
    expect(formatTimer(90 * 60_000)).toBe("1:30:00");
  });

  it("never renders negative time", () => {
    expect(formatTimer(-5_000)).toBe("00:00");
  });
});

describe("computeRemainingMs", () => {
  const NOW = 1_000_000_000_000;

  it("shows the full duration when idle", () => {
    const box: TimerFields = { timerStatus: "idle", timerDurationMs: 300_000 };
    expect(computeRemainingMs(box, NOW)).toBe(300_000);
  });

  it("falls back to the default duration on old boards without timer fields", () => {
    const box: TimerFields = {};
    expect(computeRemainingMs(box, NOW)).toBe(DEFAULT_TIMER_MS);
  });

  it("counts down while running", () => {
    const box: TimerFields = {
      timerStatus: "running",
      timerStartedAt: NOW - 10_000,
      timerRemainingMs: 300_000,
      timerDurationMs: 300_000,
    };
    expect(computeRemainingMs(box, NOW)).toBe(290_000);
  });

  it("clamps at zero past the end", () => {
    const box: TimerFields = {
      timerStatus: "running",
      timerStartedAt: NOW - 500_000,
      timerRemainingMs: 300_000,
      timerDurationMs: 300_000,
    };
    expect(computeRemainingMs(box, NOW)).toBe(0);
  });

  it("uses the duration as the run basis when timerRemainingMs is missing", () => {
    const box: TimerFields = {
      timerStatus: "running",
      timerStartedAt: NOW - 60_000,
      timerDurationMs: 300_000,
    };
    expect(computeRemainingMs(box, NOW)).toBe(240_000);
  });

  it("stays frozen when paused or stopped", () => {
    const box: TimerFields = {
      timerStatus: "paused",
      timerRemainingMs: 123_456,
      timerDurationMs: 300_000,
    };
    expect(computeRemainingMs(box, NOW)).toBe(123_456);
    expect(computeRemainingMs({ ...box, timerStatus: "stopped" }, NOW + 60_000)).toBe(
      123_456
    );
  });
});

describe("isTimerFinished", () => {
  const NOW = 1_000_000_000_000;

  it("is true only when running and at zero", () => {
    expect(
      isTimerFinished(
        { timerStatus: "running", timerStartedAt: NOW - 999_000, timerRemainingMs: 300_000 },
        NOW
      )
    ).toBe(true);
    expect(
      isTimerFinished(
        { timerStatus: "running", timerStartedAt: NOW - 10_000, timerRemainingMs: 300_000 },
        NOW
      )
    ).toBe(false);
    expect(
      isTimerFinished({ timerStatus: "stopped", timerRemainingMs: 0 }, NOW)
    ).toBe(false);
  });
});
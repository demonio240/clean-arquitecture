import type { Clock } from "../../shared/time/SystemClock";

export class SystemClock implements Clock {
  now(): Date {
    return new Date(); // 👈 El único lugar de tu app donde haces "new Date()"
  }
}
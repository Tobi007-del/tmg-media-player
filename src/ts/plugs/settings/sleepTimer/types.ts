export interface SleepTimerConfig {
  ms?: number; // delete/== null = kill, 0 = off, <0 = end, >0 = ms
  target?: number;
  minutes: number[];
}

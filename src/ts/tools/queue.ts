export interface QueueJob<T = any> {
  id?: string;
  task: () => Promise<T>;
  preTask?: () => void;
  resolve: (value: T | QueueResult) => void;
  cancelled?: boolean;
}

export interface QueueResult {
  success: boolean;
  cancelled: boolean;
  dropped: boolean;
}

// for ffmpeg future tasks
export class AsyncQueue {
  // add jobs, performs and reports sequentially; drop job: reports; cancel job: records, reports when about to perform
  private jobs: QueueJob[] = [];
  private running = false;

  private async handle(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.jobs.length > 0) {
      const job = this.jobs.shift();
      if (job) job.cancelled ? job.resolve({ success: false, cancelled: true, dropped: false }) : (job.preTask?.(), job.resolve(await job.task()));
    }
    this.running = false;
  }

  public add<T = any>(task: () => Promise<T>, id?: string, cancelled?: boolean, preTask?: () => void): Promise<QueueResult | T> {
    return new Promise((resolve) => (this.jobs.push({ task, id, preTask, cancelled, resolve }), this.handle()));
  }

  public drop(id: string): boolean {
    const idx = this.jobs.findIndex((j) => j.id === id);
    this.jobs[idx]?.resolve({ success: false, cancelled: true, dropped: true });
    return idx !== -1 && this.jobs.splice(idx, 1), !!~idx; // stops immediately, cant't remove a running job
  }

  public cancel(id: string): boolean {
    const job = this.jobs.find((j) => j.id === id);
    return job && (job.cancelled = true), !!job?.cancelled; // stops when it should have for metrics, can't cancel a running job
  }

  public dropAll(): void {
    for (const job of this.jobs) job.resolve({ success: false, cancelled: true, dropped: true });
    this.jobs = [];
  }

  public cancelAll(): void {
    for (const job of this.jobs) job.cancelled = true;
  }
}

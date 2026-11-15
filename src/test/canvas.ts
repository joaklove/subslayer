import { vi } from 'vitest';

type Gradient = { addColorStop: ReturnType<typeof vi.fn> };

export interface MockContext {
  font: string;
  fillStyle: string | CanvasGradient;
  strokeStyle: string | CanvasGradient;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  globalAlpha: number;
  textAlign: string;
  textBaseline: string;
  shadowColor: string;
  shadowBlur: number;
  measureText: ReturnType<typeof vi.fn>;
  createLinearGradient: ReturnType<typeof vi.fn>;
  createRadialGradient: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
  roundRect: ReturnType<typeof vi.fn>;
  arc: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  setLineDash: ReturnType<typeof vi.fn>;
}

/** jsdom 没有 2D 上下文，这里给一个记录调用的替身，用来断言海报真的画了东西 */
export const createMockContext = (): MockContext => {
  const gradient: Gradient = { addColorStop: vi.fn() };
  return {
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    shadowColor: '',
    shadowBlur: 0,
    measureText: vi.fn((text: string) => ({ width: String(text).length * 12 })),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    fillText: vi.fn(),
    roundRect: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    setLineDash: vi.fn(),
  };
};

const contexts = new WeakMap<HTMLCanvasElement, MockContext>();

export const contextOf = (canvas: HTMLCanvasElement) => contexts.get(canvas);

export const drawnText = (ctx: MockContext) =>
  ctx.fillText.mock.calls.map((call) => String(call[0]));

export const installCanvasMock = () => {
  HTMLCanvasElement.prototype.getContext = vi.fn(function (this: HTMLCanvasElement) {
    let ctx = contexts.get(this);
    if (!ctx) {
      ctx = createMockContext();
      contexts.set(this, ctx);
    }
    return ctx;
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toBlob = vi.fn(function (
    this: HTMLCanvasElement,
    callback: BlobCallback
  ) {
    callback(new Blob(['poster'], { type: 'image/png' }));
  }) as unknown as typeof HTMLCanvasElement.prototype.toBlob;

  // jsdom 没有 Path2D，海报画品牌路径时会用到
  class Path2DStub {
    d: string | undefined;
    constructor(d?: string) {
      this.d = d;
    }
  }
  vi.stubGlobal('Path2D', Path2DStub);

  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
};

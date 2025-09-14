import { useEffect, useMemo, useRef, useState } from 'react';
import { type GameState } from '@shared/schema';

interface MinimapProps {
  gameState: GameState;
  gridWidth: number;
  gridHeight: number;
  contentWidth: number;
  contentHeight: number;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

export default function Minimap({ gameState, gridWidth, gridHeight, contentWidth, contentHeight, scrollContainerRef }: MinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });

  const size = useMemo(() => {
    // Keep aspect ratio to the map
    const scale = 6; // pixels per tile on the minimap (approx)
    const width = Math.max(120, Math.min(320, gridWidth * scale));
    const height = Math.max(90, Math.min(240, Math.round((gridHeight / gridWidth) * width)));
    return { width, height };
  }, [gridWidth, gridHeight]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tileW = size.width / gridWidth;
    const tileH = size.height / gridHeight;

    ctx.clearRect(0, 0, size.width, size.height);

    // Draw terrain/fog
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const hidden = gameState.fogOfWar[y][x];
        const terrain = gameState.gridData[y][x];
        let fill = hidden ? 'hsl(0, 0%, 10%)' : (terrain === 'land' ? 'hsl(60, 20%, 35%)' : 'hsl(220, 50%, 22%)');
        ctx.fillStyle = fill;
        ctx.fillRect(Math.floor(x * tileW), Math.floor(y * tileH), Math.ceil(tileW), Math.ceil(tileH));
      }
    }

    // Draw cities as small brighter dots where visible
    ctx.fillStyle = 'hsl(45, 100%, 55%)';
    for (const city of gameState.cities) {
      if (!gameState.fogOfWar[city.y][city.x]) {
        ctx.fillRect(Math.floor(city.x * tileW), Math.floor(city.y * tileH), Math.max(1, Math.floor(tileW)), Math.max(1, Math.floor(tileH)));
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size.width;
    canvas.height = size.height;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.width, size.height, gridWidth, gridHeight, gameState.gridData, gameState.fogOfWar, gameState.cities]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const update = () => {
      const x = (el.scrollLeft / contentWidth) * size.width;
      const y = (el.scrollTop / contentHeight) * size.height;
      const w = (el.clientWidth / contentWidth) * size.width;
      const h = (el.clientHeight / contentHeight) * size.height;
      setViewport({ x, y, w, h });
    };
    update();
    el.addEventListener('scroll', update);
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [scrollContainerRef, contentWidth, contentHeight, size.width, size.height]);

  const onMiniClick = (e: React.MouseEvent) => {
    const wrapper = containerRef.current;
    const el = scrollContainerRef.current;
    if (!wrapper || !el) return;
    const rect = wrapper.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width; // 0..1
    const relY = (e.clientY - rect.top) / rect.height; // 0..1
    const targetX = relX * contentWidth - el.clientWidth / 2;
    const targetY = relY * contentHeight - el.clientHeight / 2;
    el.scrollTo({ left: Math.max(0, Math.min(el.scrollWidth, targetX)), top: Math.max(0, Math.min(el.scrollHeight, targetY)), behavior: 'smooth' });
  };

  return (
    <div className="relative inline-block" ref={containerRef} style={{ width: `${size.width}px`, height: `${size.height}px` }}>
      <canvas ref={canvasRef} width={size.width} height={size.height} className="rounded border border-border cursor-pointer" onClick={onMiniClick} />
      <div
        className="absolute border-2 border-secondary pointer-events-none"
        style={{ left: `${viewport.x}px`, top: `${viewport.y}px`, width: `${viewport.w}px`, height: `${viewport.h}px`, boxShadow: '0 0 0 9999px rgba(0,0,0,0.3) inset' }}
      />
    </div>
  );
}



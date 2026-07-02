import { cn } from '@/lib/utils';

interface AmbientBackgroundProps {
  /** Intensity of the glow (0-100) */
  intensity?: number;
  /** Position variant */
  variant?: 'default' | 'hero' | 'cta' | 'subtle';
  className?: string;
}

/**
 * Reusable ambient glow background with neural grid texture.
 * Renders layered radial-gradient orbs (cyan + violet) and a subtle grid overlay.
 * Always pointer-events-none and behind content (z-0).
 */
export function AmbientBackground({
  intensity = 100,
  variant = 'default',
  className,
}: AmbientBackgroundProps) {
  const opacity = intensity / 100;

  const orbs: Record<NonNullable<AmbientBackgroundProps['variant']>, string> = {
    default:
      'bg-glow-cyan w-[500px] h-[500px] -top-40 -right-40, bg-glow-violet w-[400px] h-[400px] -bottom-32 -left-32',
    hero: 'bg-glow-cyan w-[600px] h-[600px] -top-60 -right-20, bg-glow-violet w-[500px] h-[500px] top-40 -left-40, bg-glow w-[400px] h-[400px] bottom-0 left-1/3',
    cta: 'bg-glow-cyan w-[500px] h-[400px] top-0 left-1/4, bg-glow-violet w-[500px] h-[400px] bottom-0 right-1/4',
    subtle: 'bg-glow-cyan w-[300px] h-[300px] -top-20 -right-20',
  };

  const orbClasses = orbs[variant].split(', ');

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 z-0 overflow-hidden',
        className,
      )}
    >
      {/* Neural grid texture */}
      <div className="absolute inset-0 bg-neural-grid opacity-40" />

      {/* Glow orbs */}
      {orbClasses.map((orb, i) => (
        <div key={i} className={cn('glow-orb', orb)} style={{ opacity }} />
      ))}
    </div>
  );
}

type LogoProps = {
  src: string | null;
  alt: string;
  size?: number;
  className?: string;
};

export function TeamLogo({ src, alt, size = 56, className = "" }: LogoProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/95 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] ${className}`}
      style={{ width: size, height: size }}
    >
      {src ? (
        // External CloudFront logos vary wildly in size and format.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-[78%] w-[78%] object-contain" />
      ) : (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {alt.slice(0, 3)}
        </span>
      )}
    </span>
  );
}

function Skeleton({ className, ...props }) {
  return <div data-slot="skeleton" className={`animate-pulse rounded-md bg-muted ${className || ""}`} {...props} />;
}

export { Skeleton };
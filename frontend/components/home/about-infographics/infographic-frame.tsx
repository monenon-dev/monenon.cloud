import { forwardRef, type ReactNode } from "react";

type InfographicFrameProps = {
  children: ReactNode;
  label?: string;
};

export const InfographicFrame = forwardRef<HTMLDivElement, InfographicFrameProps>(
  function InfographicFrame({ children, label }, ref) {
    return (
      <div
        ref={ref}
        className="moneo-glass flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-white/15 bg-white/[0.02] p-4 sm:aspect-video sm:p-6"
        role="img"
        aria-label={label}
      >
        <div className="w-full max-w-lg">{children}</div>
      </div>
    );
  }
);

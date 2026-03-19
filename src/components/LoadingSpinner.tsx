import jasonerLoading from "@/assets/jasoner-loading.gif";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  className?: string;
}

const sizeMap = { sm: "h-8 w-8", md: "h-12 w-12", lg: "h-16 w-16" };

export default function LoadingSpinner({ size = "md", fullScreen = false, className = "" }: LoadingSpinnerProps) {
  const img = <img src={jasonerLoading} alt="Loading…" className={`${sizeMap[size]} object-contain ${className}`} />;
  if (fullScreen) {
    return <div className="min-h-screen flex items-center justify-center">{img}</div>;
  }
  return img;
}

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Lock } from 'lucide-react';

interface LockedFieldWrapperProps {
  isLocked: boolean;
  children: React.ReactNode;
  fieldName?: string;
}

export const LockedFieldWrapper = ({ isLocked, children, fieldName }: LockedFieldWrapperProps) => {
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            {children}
            <div className="absolute top-2 right-2 pointer-events-none">
              <Lock className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">
            This field is locked by your administrator. Contact your service team for access.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

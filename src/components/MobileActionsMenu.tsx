import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MoreVertical } from 'lucide-react';
import { ReactNode, useState } from 'react';

interface MobileActionsMenuProps {
  children: ReactNode;
  title?: string;
}

export const MobileActionsMenu = ({ children, title = "Actions" }: MobileActionsMenuProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[80vh]">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-2 mt-4" onClick={() => setOpen(false)}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
};

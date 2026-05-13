import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  onConfirm: () => void;
  isLoading?: boolean;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  onConfirm,
  isLoading = false,
  confirmText = "Đồng ý",
  cancelText = "Hủy bỏ",
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle asChild className="text-red-500">
            <div className="flex items-center gap-2">{title}</div>
          </DialogTitle>
          <DialogDescription asChild className="pt-2 text-zinc-400">
            <div>{description}</div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

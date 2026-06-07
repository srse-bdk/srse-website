"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, DollarSign } from "lucide-react";
import { feeService } from "@/lib/services/fee.service";
import { toast } from "sonner";
import { FeeConfiguration } from "@/lib/types/fee.type";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { Class } from "@/lib/types/class.type";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SetClassFeesDialogProps {
  config: FeeConfiguration;
  onSuccess?: () => void;
}

export function SetClassFeesDialog({
  config,
  onSuccess,
}: SetClassFeesDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [classFees, setClassFees] = useState<Record<string, number>>(
    config.classFees || {},
  );

  const { data: classesData, loading: classesLoading } =
    useFirebaseRealtime<Class>("classes", { asArray: true });
  const classes = (classesData as Class[]) || [];

  // Filter classes (show all for now, or filter by active status if needed)
  const filteredClasses = useMemo(() => {
    return classes.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [classes]);

  async function handleSave() {
    setLoading(true);
    try {
      await feeService.updateFeeConfig(config.id, { classFees });
      toast.success("Class-wise fees updated");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update class fees");
    } finally {
      setLoading(false);
    }
  }

  const handleAmountChange = (className: string, amount: string) => {
    const val = parseFloat(amount) || 0;
    setClassFees((prev) => ({ ...prev, [className]: val }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <DollarSign className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Set Fee for {config.name}</DialogTitle>
        </DialogHeader>

        {classesLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              Set the fee amount for each class for the academic year{" "}
              {config.academicYear}.
            </div>

            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              <div className="space-y-4">
                {filteredClasses.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No classes found.
                  </div>
                ) : (
                  filteredClasses.map((cls) => (
                    <div
                      key={cls.id}
                      className="grid grid-cols-2 items-center gap-4 border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-col">
                        <Label className="font-bold">{cls.name}</Label>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          {cls.sections.length} Sections
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          ₹
                        </span>
                        <Input
                          type="number"
                          className="pl-7"
                          placeholder="0.00"
                          value={classFees[cls.name] || ""}
                          onChange={(e) =>
                            handleAmountChange(cls.name, e.target.value)
                          }
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

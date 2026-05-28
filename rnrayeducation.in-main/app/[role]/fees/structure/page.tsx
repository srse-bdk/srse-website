"use client";

import React from "react";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { FeeConfiguration, FeeRecord } from "@/lib/types/fee.type";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FeeConfigDialog } from "../_components/fee-config-dialog";
import { SetClassFeesDialog } from "../_components/set-class-fees-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Loader2, Wallet, Send } from "lucide-react";
import { feeService } from "@/lib/services/fee.service";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

function getPeriodKey(cycle: FeeConfiguration["cycle"], date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  if (cycle === "monthly") return `${y}-${String(m).padStart(2, "0")}`;
  if (cycle === "quarterly") return `${y}-q${Math.floor((m - 1) / 3) + 1}`;
  if (cycle === "annually") return `${y}`;
  return "one-time";
}

function getIssueLabel(cycle: FeeConfiguration["cycle"], date: Date) {
  if (cycle === "monthly") return `Issue ${format(date, "MMMM yyyy")}`;
  if (cycle === "quarterly") return `Issue Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
  if (cycle === "annually") return `Issue ${date.getFullYear()}`;
  return "Issue One-time";
}

export default function FeeStructurePage() {
  const { data: configsData, loading } = useFirebaseRealtime<FeeConfiguration>(
    "feeConfigurations",
    {
      asArray: true,
    },
  );
  const { data: issuedData } = useFirebaseRealtime<FeeRecord>("feeIssued", {
    asArray: true,
  });

  const configs = (configsData as FeeConfiguration[]) || [];
  const issued = (issuedData as FeeRecord[]) || [];
  const [isSeedingDefault, setIsSeedingDefault] = React.useState(false);
  const [issuingConfigId, setIssuingConfigId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (loading || isSeedingDefault) return;

    const hasDefaultTution = configs.some(
      (cfg) => {
        const name = cfg.name.trim().toLowerCase();
        return name === "tuition";
      },
    );
    if (hasDefaultTution) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startYear = month < 3 ? year - 1 : year;
    const academicYear = `${startYear}-${startYear + 1}`;

    setIsSeedingDefault(true);
    feeService
      .createFeeConfig({
        name: "Tuition",
        cycle: "monthly",
        isOptional: false,
        academicYear,
        classFees: {},
      })
      .then(() => {
        toast.success('Default "Tuition Fee" added');
      })
      .catch((error) => {
        console.error(error);
        toast.error('Failed to auto-create default "Tuition Fee"');
      })
      .finally(() => {
        setIsSeedingDefault(false);
      });
  }, [configs, loading, isSeedingDefault]);

  const handleDelete = async (id: string) => {
    try {
      await feeService.deleteFeeConfig(id);
      toast.success("Fee configuration deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete fee configuration");
    }
  };

  const handleIssue = async (config: FeeConfiguration) => {
    setIssuingConfigId(config.id);
    try {
      const result = await feeService.issueFeesForConfig(config.id, new Date());
      if (result.created > 0) {
        toast.success(`Issued ${result.created} fee records for ${config.name}`);
      } else {
        toast.info(`${config.name} is already issued for this period`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to issue fee records");
    } finally {
      setIssuingConfigId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fee Structure</h1>
          <p className="text-muted-foreground">
            Manage fee types and class-wise fee structures.
          </p>
        </div>
        {/* Button to add new fee with Name, Cycle, Is Optional */}
        <FeeConfigDialog />
      </div>

      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Fee List
          </CardTitle>
          <CardDescription>List of all configured fees.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fee Name</TableHead>
                <TableHead>Fee Cycle</TableHead>
                <TableHead>Is Optional</TableHead>
                <TableHead>Set Fee</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No fees defined. Default "Tuition Fee" will be auto-created.
                  </TableCell>
                </TableRow>
              ) : (
                configs.map((config) => {
                  const periodKey = getPeriodKey(config.cycle, new Date());
                  const alreadyIssued = issued.some(
                    (item) =>
                      item.feeConfigId === config.id &&
                      item.issuePeriodKey === periodKey,
                  );
                  const disableIssue = config.isOptional || alreadyIssued;

                  return (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.name}</TableCell>
                      <TableCell className="capitalize">{config.cycle}</TableCell>
                      <TableCell>
                        <Checkbox
                          checked={config.isOptional}
                          disabled
                          className="opacity-100 disabled:cursor-default"
                        />
                      </TableCell>
                      <TableCell>
                        {config.isOptional ? (
                          <span className="text-muted-foreground text-sm italic">
                            Set per student
                          </span>
                        ) : (
                          <SetClassFeesDialog config={config} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={alreadyIssued ? "outline" : "default"}
                          disabled={disableIssue || issuingConfigId === config.id}
                          onClick={() => handleIssue(config)}
                        >
                          {issuingConfigId === config.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          {alreadyIssued ? "Already Issued" : getIssueLabel(config.cycle, new Date())}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <FeeConfigDialog config={config} />

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Fee?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will delete <strong>{config.name}</strong>{" "}
                                  permanently.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(config.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

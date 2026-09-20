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
import { Trash2, Loader2, Wallet, RefreshCw } from "lucide-react";
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
  const [issuingConfigId, setIssuingConfigId] = React.useState<string | null>(
    null,
  );
  const [catchingUpAll, setCatchingUpAll] = React.useState(false);
  const autoCatchUpDone = React.useRef(false);

  React.useEffect(() => {
    if (loading || isSeedingDefault) return;

    const hasDefaultTution = configs.some((cfg) => {
      const name = cfg.name.trim().toLowerCase();
      return name === "tuition";
    });
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

  // Auto catch-up missing months once when the page has configs.
  React.useEffect(() => {
    if (loading || autoCatchUpDone.current) return;
    const mandatory = configs.filter((c) => !c.isOptional);
    if (mandatory.length === 0) return;

    autoCatchUpDone.current = true;
    void feeService
      .catchUpAllMandatoryFees(new Date())
      .then((result) => {
        if (result.created > 0) {
          toast.success(
            `Caught up ${result.created} missing fee bill${result.created === 1 ? "" : "s"}`,
          );
        }
      })
      .catch((error) => {
        console.error(error);
        autoCatchUpDone.current = false;
      });
  }, [configs, loading]);

  const handleDelete = async (id: string) => {
    try {
      await feeService.deleteFeeConfig(id);
      toast.success("Fee configuration deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete fee configuration");
    }
  };

  const handleCatchUp = async (config: FeeConfiguration) => {
    setIssuingConfigId(config.id);
    try {
      const result = await feeService.issueFeesForConfigThroughDate(
        config.id,
        new Date(),
      );
      if (result.created > 0) {
        toast.success(
          `Caught up ${result.created} ${config.name} bill${result.created === 1 ? "" : "s"} through this month`,
        );
      } else {
        toast.info(
          `${config.name} is already up to date through this month`,
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to catch up fee records");
    } finally {
      setIssuingConfigId(null);
    }
  };

  const handleCatchUpAll = async () => {
    setCatchingUpAll(true);
    try {
      const result = await feeService.catchUpAllMandatoryFees(new Date());
      if (result.created > 0) {
        toast.success(
          `Caught up ${result.created} missing fee bill${result.created === 1 ? "" : "s"}`,
        );
      } else {
        toast.info("All mandatory fees are already up to date");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to catch up fees");
    } finally {
      setCatchingUpAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const issuedCountByConfig = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const item of issued) {
      if (!item.feeConfigId) continue;
      map.set(item.feeConfigId, (map.get(item.feeConfigId) || 0) + 1);
    }
    return map;
  }, [issued]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fee Structure</h1>
          <p className="text-muted-foreground">
            Manage fee types and class-wise amounts. Bills auto-catch up from
            admission through the current month.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleCatchUpAll}
            disabled={catchingUpAll || configs.every((c) => c.isOptional)}
          >
            {catchingUpAll ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Catch up all fees
          </Button>
          <FeeConfigDialog />
        </div>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Fee List
          </CardTitle>
          <CardDescription>
            Catch up creates any missing monthly/period bills through this
            month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fee Name</TableHead>
                <TableHead>Fee Cycle</TableHead>
                <TableHead>Is Optional</TableHead>
                <TableHead>Set Fee</TableHead>
                <TableHead>Issued bills</TableHead>
                <TableHead>Catch up</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {configs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No fees defined. Default &quot;Tuition Fee&quot; will be
                    auto-created.
                  </TableCell>
                </TableRow>
              ) : (
                configs.map((config) => {
                  const billCount = issuedCountByConfig.get(config.id) || 0;
                  return (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">
                        {config.name}
                      </TableCell>
                      <TableCell className="capitalize">
                        {config.cycle}
                      </TableCell>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {config.isOptional ? "—" : billCount}
                      </TableCell>
                      <TableCell>
                        {config.isOptional ? (
                          <span className="text-muted-foreground text-sm">
                            —
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={issuingConfigId === config.id}
                            onClick={() => handleCatchUp(config)}
                          >
                            {issuingConfigId === config.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Through this month
                          </Button>
                        )}
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
                                  This will delete{" "}
                                  <strong>{config.name}</strong> permanently.
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

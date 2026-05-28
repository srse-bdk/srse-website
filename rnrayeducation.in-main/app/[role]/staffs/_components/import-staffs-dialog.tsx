"use client";

import { useState, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Upload,
    FileText,
    CheckCircle,
    XCircle,
    AlertCircle,
    Download,
} from "lucide-react";
import {
    parseCSVToStaffs,
    validateStaffData,
    generateStaffCSVTemplate,
    downloadCSV,
} from "@/lib/utils/staffs-import-export";
import { staffService } from "@/lib/services";
import type { UserInput } from "@/lib/types/user.type";
import { toast } from "sonner";

interface ImportStaffsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    staffType?: string | null;
}

interface ParsedStaff extends Partial<UserInput> {
    _rowNumber: number;
    _errors: string[];
    _valid: boolean;
}

export function ImportStaffsDialog({
    open,
    onOpenChange,
    onSuccess,
    staffType,
}: ImportStaffsDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [parsedStaffs, setParsedStaffs] = useState<ParsedStaff[]>([]);
    const [parseErrors, setParseErrors] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        if (!selectedFile.name.endsWith(".csv")) {
            toast.error("Please select a CSV file");
            return;
        }

        setFile(selectedFile);
        setParseErrors([]);
        setParsedStaffs([]);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) {
                toast.error("Failed to read file");
                return;
            }

            const { staffs, errors } = parseCSVToStaffs(text);

            const validatedStaffs: ParsedStaff[] = staffs.map(
                (staff, index) => {
                    const validation = validateStaffData(staff);
                    return {
                        ...staff,
                        _rowNumber: index + 2,
                        _errors: validation.errors,
                        _valid: validation.valid,
                    };
                }
            );

            setParsedStaffs(validatedStaffs);
            setParseErrors(errors);

            if (errors.length > 0) {
                toast.warning(`Found ${errors.length} error(s) in CSV file`);
            }
        };

        reader.onerror = () => {
            toast.error("Failed to read file");
        };

        reader.readAsText(selectedFile);
    };

    const handleDownloadTemplate = () => {
        if (staffType === "teaching") {
            const link = document.createElement("a");
            link.href = "/templates/school_teacher_profile.numbers";
            link.download = "school_teacher_profile.numbers";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Teaching staff template downloaded");
            return;
        }

        if (staffType === "non-teaching") {
            const link = document.createElement("a");
            link.href = "/templates/school_non_teaching_profile.numbers";
            link.download = "school_non_teaching_profile.numbers";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Non-teaching staff template downloaded");
            return;
        }

        const template = generateStaffCSVTemplate();
        downloadCSV(template, "staffs_import_template.csv");
        toast.success("Template downloaded");
    };

    const handleImport = async () => {
        if (parsedStaffs.length === 0) {
            toast.error("No staffs to import");
            return;
        }

        const validStaffs = parsedStaffs.filter((s) => s._valid);

        if (validStaffs.length === 0) {
            toast.error("No valid staffs to import. Please fix errors first.");
            return;
        }

        setIsImporting(true);
        try {
            let successCount = 0;
            let errorCount = 0;

            for (const staff of validStaffs) {
                try {
                    await staffService.create(staff as UserInput);
                    successCount++;
                } catch (error) {
                    console.error(
                        `Error importing staff ${staff._rowNumber}:`,
                        error
                    );
                    errorCount++;
                }
            }

            if (successCount > 0) {
                toast.success(
                    `Successfully imported ${successCount} staff${errorCount > 0 ? `. ${errorCount} failed.` : ""
                    }`
                );
                onSuccess();
                handleClose();
            } else {
                toast.error("Failed to import staffs. Please check the errors.");
            }
        } catch (error) {
            console.error("Error importing staffs:", error);
            toast.error("Failed to import staffs. Please try again.");
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setParsedStaffs([]);
        setParseErrors([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        onOpenChange(false);
    };

    const validCount = parsedStaffs.filter((s) => s._valid).length;
    const invalidCount = parsedStaffs.filter((s) => !s._valid).length;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Import Staffs from CSV
                    </DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to import multiple staffs at once. This will create Firebase Auth accounts for them.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2"
                            >
                                <FileText className="h-4 w-4" />
                                {file ? "Change File" : "Select CSV File"}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleDownloadTemplate}
                                className="flex items-center gap-2"
                            >
                                <Download className="h-4 w-4" />
                                Download Template
                            </Button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                        {file && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                <span>{file.name}</span>
                                <span className="text-xs">
                                    ({(file.size / 1024).toFixed(2)} KB)
                                </span>
                            </div>
                        )}
                    </div>

                    {parseErrors.length > 0 && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <div className="space-y-1">
                                    <p className="font-semibold">
                                        Found {parseErrors.length} error(s):
                                    </p>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                        {parseErrors.slice(0, 5).map((error, index) => (
                                            <li key={index}>{error}</li>
                                        ))}
                                        {parseErrors.length > 5 && (
                                            <li>... and {parseErrors.length - 5} more</li>
                                        )}
                                    </ul>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {parsedStaffs.length > 0 && (
                        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium">
                                    {validCount} valid staff(s)
                                </span>
                            </div>
                            {invalidCount > 0 && (
                                <div className="flex items-center gap-2">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    <span className="text-sm font-medium">
                                        {invalidCount} invalid staff(s)
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {parsedStaffs.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                            <div className="max-h-[400px] overflow-y-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background">
                                        <TableRow>
                                            <TableHead className="w-[50px]">Row</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Position</TableHead>
                                            <TableHead className="w-[100px]">Validation</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parsedStaffs.map((staff, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-mono text-xs">
                                                    {staff._rowNumber}
                                                </TableCell>
                                                <TableCell>
                                                    {staff.name}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {staff.email || "-"}
                                                </TableCell>
                                                <TableCell>
                                                    {staff.position || "-"}
                                                </TableCell>
                                                <TableCell>
                                                    {staff._valid ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="bg-green-50 text-green-700 border-green-200"
                                                        >
                                                            <CheckCircle className="h-3 w-3 mr-1" />
                                                            Valid
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="bg-red-50 text-red-700 border-red-200"
                                                        >
                                                            <XCircle className="h-3 w-3 mr-1" />
                                                            Invalid
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    {parsedStaffs.some((s) => !s._valid && s._errors.length > 0) && (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold">Validation Errors:</p>
                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                {parsedStaffs
                                    .filter((s) => !s._valid)
                                    .map((staff, index) => (
                                        <Alert key={index} variant="destructive" className="py-2">
                                            <AlertDescription className="text-xs">
                                                <span className="font-semibold">
                                                    Row {staff._rowNumber}:
                                                </span>{" "}
                                                {staff._errors.join(", ")}
                                            </AlertDescription>
                                        </Alert>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={isImporting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={
                            isImporting || parsedStaffs.length === 0 || validCount === 0
                        }
                    >
                        {isImporting ? "Importing..." : `Import ${validCount} Staff(s)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

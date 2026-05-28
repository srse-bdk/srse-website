import type { UserInput, UserStatus } from "@/lib/types/user.type";

/**
 * CSV Headers for staff import
 */
export const CSV_HEADERS = [
    "Name",
    "Email",
    "Password",
    "Phone", // Added phone as it's common, though UserInput doesn't explicitly mandate it, usually it's good to have. Checking UserInput type...
    // UserInput in user.type.ts: name, email, password, role, gender, position. 
    // It doesn't have phone? Let's check keys again.
    // user.type.ts line 22: name, email, password, role, gender(enum), position.
    // Wait, phone is not in UserInput?
    "Gender",
    "Position",
] as const;

// Note: I will strictly stick to UserInput fields.
// UserInput: name, email, password, role, gender, position.

export const STAFF_CSV_HEADERS = [
    "Name",
    "Email",
    "Password",
    "Gender",
    "Position"
] as const;


/**
 * Parse CSV text to staff objects
 */
export function parseCSVToStaffs(csvText: string): {
    staffs: Partial<UserInput>[];
    errors: string[];
} {
    const errors: string[] = [];
    const staffs: Partial<UserInput>[] = [];

    // Split by lines
    const lines = csvText.split("\n").filter((line) => line.trim());

    if (lines.length < 2) {
        errors.push("CSV file must contain at least a header row and one data row");
        return { staffs, errors };
    }

    // Parse header row
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);

    // Validate headers (flexible matching)
    const expectedHeaders = STAFF_CSV_HEADERS.map(h => h.toLowerCase());
    const actualHeaders = headers.map(h => h.toLowerCase().trim());

    const missingHeaders: string[] = [];
    expectedHeaders.forEach(expected => {
        if (!actualHeaders.some(actual => actual.includes(expected))) {
            missingHeaders.push(expected);
        }
    });

    if (missingHeaders.length > 0) {
        errors.push(`Missing required headers: ${missingHeaders.join(", ")}`);
    }

    // Create header map
    const headerMap: Record<string, number> = {};
    headers.forEach((header, index) => {
        headerMap[header.toLowerCase().trim()] = index;
    });

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values = parseCSVLine(line);

        const getValue = (fieldName: string): string => {
            const index = Object.entries(headerMap).find(([key]) => key.includes(fieldName.toLowerCase()))?.[1];
            return index !== undefined ? (values[index] || "").trim() : "";
        }

        const name = getValue("name");
        const email = getValue("email");
        const password = getValue("password");
        const genderStr = getValue("gender");
        const position = getValue("position");

        const rowErrors: string[] = [];
        if (!name) rowErrors.push("Name is required");
        if (!email) rowErrors.push("Email is required");
        if (!password) rowErrors.push("Password is required");

        let gender: "male" | "female" | "other" = "male"; // Default
        if (genderStr) {
            const g = genderStr.toLowerCase();
            if (["male", "female", "other"].includes(g)) {
                gender = g as "male" | "female" | "other";
            } else {
                rowErrors.push("Gender must be male, female, or other");
            }
        }

        if (rowErrors.length > 0) {
            errors.push(`Row ${i + 1}: ${rowErrors.join(", ")}`);
            continue;
        }

        staffs.push({
            name,
            email,
            password,
            gender, // role is fixed to 'staff' in service call, or we can add here if we want to follow type exactly.
            role: "staff",
            position: position || "Staff"
        });
    }

    return { staffs, errors };
}

export function validateStaffData(data: Partial<UserInput>): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];
    if (!data.name || data.name.length < 2) errors.push("Name must be at least 2 chars");
    if (!data.email || !isValidEmail(data.email)) errors.push("Invalid email");
    if (!data.password || data.password.length < 6) errors.push("Password must be at least 6 chars");

    return {
        valid: errors.length === 0,
        errors
    };
}

export function generateStaffCSVTemplate(): string {
    const headers = STAFF_CSV_HEADERS.join(",");
    const example = "John Doe,john.staff@school.com,securePassword123,male,Teacher";
    return [headers, example].join("\n");
}

export function downloadCSV(csvContent: string, filename: string): void {
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            values.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    values.push(current);
    return values;
}

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

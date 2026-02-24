import Papa from "papaparse";
import * as XLSX from "xlsx";
import { CreateStudentRequest } from "../types";

interface FileRow {
    [key: string]: any;
}

const FIELD_MAP: Record<string, keyof CreateStudentRequest> = {
    "student name": "studentName",
    "student_name": "studentName",
    "studentname": "studentName",
    "name": "studentName",
    "date of birth": "dateOfBirth",
    "date_of_birth": "dateOfBirth",
    "dob": "dateOfBirth",
    "dateofbirth": "dateOfBirth",
    "grade": "grade",
    "section": "section",
    "gender": "gender",
    "school name": "schoolName",
    "school_name": "schoolName",
    "schoolname": "schoolName",
    "school": "schoolName",
    "parent name": "parentName",
    "parent_name": "parentName",
    "parentname": "parentName",
    "parent": "parentName",
    "contact number": "contactNumber",
    "contact_number": "contactNumber",
    "contactnumber": "contactNumber",
    "phone": "contactNumber",
    "contact": "contactNumber",
    "student id": "studentRef",
    "student_id": "studentRef",
    "studentid": "studentRef",
    "student ref": "studentRef",
    "id": "studentRef",
    "mother tongue": "motherTongue",
    "mother_tongue": "motherTongue",
    "mothertongue": "motherTongue",
    "language": "motherTongue",
    "health notes": "healthNotes",
    "health_notes": "healthNotes",
    "healthnotes": "healthNotes",
    "health": "healthNotes",
    "notes": "notes",
};

const REQUIRED_FIELDS: (keyof CreateStudentRequest)[] = [
    "studentName",
    "dateOfBirth",
    "grade",
    "section",
    "gender",
    "schoolName",
    "parentName",
    "contactNumber",
];

interface ParseResult {
    students: CreateStudentRequest[];
    errors: Array<{ row: number; message: string }>;
}

/**
 * Normalizes a row object by mapping headers to student request fields
 */
function mapRow(row: FileRow, defaultSchoolName: string): Partial<CreateStudentRequest> {
    const mapped: Partial<CreateStudentRequest> = {};

    for (const [key, value] of Object.entries(row)) {
        const fieldName = FIELD_MAP[key.toLowerCase().trim()];
        if (fieldName && value !== undefined && value !== null) {
            const valStr = String(value).trim();
            if (valStr) {
                (mapped as any)[fieldName] = valStr;
            }
        }
    }

    // Default school name if not provided
    if (!mapped.schoolName) {
        mapped.schoolName = defaultSchoolName;
    }

    // Normalise gender
    if (mapped.gender) {
        const g = String(mapped.gender).toUpperCase().trim();
        if (g === "M" || g === "MALE") mapped.gender = "MALE" as any;
        else if (g === "F" || g === "FEMALE") mapped.gender = "FEMALE" as any;
        else mapped.gender = "OTHER" as any;
    }

    return mapped;
}

/**
 * Parses a CSV buffer
 */
export function parseCsvBuffer(buffer: Buffer, defaultSchoolName: string): ParseResult {
    const csvString = buffer.toString("utf-8");
    const { data, errors: parseErrors } = Papa.parse<FileRow>(csvString, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase(),
    });

    const students: CreateStudentRequest[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    if (parseErrors.length > 0) {
        parseErrors.forEach((e) => {
            errors.push({ row: (e.row ?? 0) + 1, message: e.message });
        });
    }

    data.forEach((row, i) => {
        const rowNum = i + 2; // 1-indexed + header row
        const mapped = mapRow(row, defaultSchoolName);

        const missing = REQUIRED_FIELDS.filter((f) => !mapped[f]);
        if (missing.length > 0) {
            errors.push({
                row: rowNum,
                message: `Missing required fields: ${missing.join(", ")}`,
            });
            return;
        }

        students.push(mapped as CreateStudentRequest);
    });

    return { students, errors };
}

/**
 * Parses an Excel buffer (XLSX, XLS)
 */
export function parseExcelBuffer(buffer: Buffer, defaultSchoolName: string): ParseResult {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to JSON with original headers
    const data = XLSX.utils.sheet_to_json<FileRow>(worksheet);

    const students: CreateStudentRequest[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    data.forEach((row, i) => {
        const rowNum = i + 2; // 1-indexed + header row
        const mapped = mapRow(row, defaultSchoolName);

        const missing = REQUIRED_FIELDS.filter((f) => !mapped[f]);
        if (missing.length > 0) {
            errors.push({
                row: rowNum,
                message: `Missing required fields: ${missing.join(", ")}`,
            });
            return;
        }

        students.push(mapped as CreateStudentRequest);
    });

    return { students, errors };
}

/**
 * Utility to parse either CSV or Excel based on filename or inspection
 */
export function parseStudentFile(buffer: Buffer, filename: string, defaultSchoolName: string): ParseResult {
    const ext = filename.toLowerCase().split(".").pop();

    if (ext === "xlsx" || ext === "xls") {
        return parseExcelBuffer(buffer, defaultSchoolName);
    } else {
        // Default to CSV
        return parseCsvBuffer(buffer, defaultSchoolName);
    }
}

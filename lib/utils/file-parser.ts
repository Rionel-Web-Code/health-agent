import Papa from 'papaparse';

export interface ParseResult<T> {
  data: T[];
  errors: Array<{ row?: number; message: string; code: string }>;
  warnings: Array<{ row?: number; message: string; code: string }>;
  meta: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    columns: string[];
  };
}

export type FileType = 'csv' | 'json';

export async function parseFile<T extends Record<string, unknown>>(
  file: File,
  fileType: FileType
): Promise<ParseResult<T>> {
  if (fileType === 'csv') {
    return parseCsvFile<T>(file);
  } else {
    return parseJsonFile<T>(file);
  }
}

async function parseCsvFile<T extends Record<string, unknown>>(
  file: File
): Promise<ParseResult<T>> {
  return new Promise((resolve) => {
    Papa.parse<T>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        const errors: ParseResult<T>['errors'] = [];
        const warnings: ParseResult<T>['warnings'] = [];

        // Convert Papa parse errors
        results.errors.forEach((err) => {
          errors.push({
            row: err.row,
            message: err.message,
            code: err.code,
          });
        });

        // Get columns from first row if available
        const columns = results.meta.fields || [];

        // Validate data
        const validData: T[] = [];
        results.data.forEach((row, index) => {
          const rowErrors = validateRow(row, columns, index);
          if (rowErrors.length > 0) {
            errors.push(...rowErrors);
          } else {
            validData.push(row);
          }
        });

        resolve({
          data: results.data,
          errors,
          warnings,
          meta: {
            totalRows: results.data.length,
            validRows: validData.length,
            invalidRows: results.data.length - validData.length,
            columns,
          },
        });
      },
      error: (error) => {
        resolve({
          data: [],
          errors: [{ message: error.message, code: 'PARSE_ERROR' }],
          warnings: [],
          meta: {
            totalRows: 0,
            validRows: 0,
            invalidRows: 0,
            columns: [],
          },
        });
      },
    });
  });
}

async function parseJsonFile<T extends Record<string, unknown>>(
  file: File
): Promise<ParseResult<T>> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Handle both array and object with data property
        const data: T[] = Array.isArray(parsed) ? parsed : parsed.data || [];

        if (!Array.isArray(data)) {
          resolve({
            data: [],
            errors: [{ message: 'JSON must contain an array of records', code: 'INVALID_STRUCTURE' }],
            warnings: [],
            meta: {
              totalRows: 0,
              validRows: 0,
              invalidRows: 0,
              columns: [],
            },
          });
          return;
        }

        // Extract columns from first record
        const columns = data.length > 0 ? Object.keys(data[0]) : [];

        const errors: ParseResult<T>['errors'] = [];
        const warnings: ParseResult<T>['warnings'] = [];

        // Validate each row
        data.forEach((row, index) => {
          const rowErrors = validateRow(row, columns, index);
          errors.push(...rowErrors);
        });

        resolve({
          data,
          errors,
          warnings,
          meta: {
            totalRows: data.length,
            validRows: data.length - errors.filter((e) => e.row !== undefined).length,
            invalidRows: errors.filter((e) => e.row !== undefined).length,
            columns,
          },
        });
      } catch {
        resolve({
          data: [],
          errors: [{ message: 'Invalid JSON format', code: 'PARSE_ERROR' }],
          warnings: [],
          meta: {
            totalRows: 0,
            validRows: 0,
            invalidRows: 0,
            columns: [],
          },
        });
      }
    };

    reader.onerror = () => {
      resolve({
        data: [],
        errors: [{ message: 'Error reading file', code: 'READ_ERROR' }],
        warnings: [],
        meta: {
          totalRows: 0,
          validRows: 0,
          invalidRows: 0,
          columns: [],
        },
      });
    };

    reader.readAsText(file);
  });
}

function validateRow<T extends Record<string, unknown>>(
  row: T,
  columns: string[],
  rowIndex: number
): ParseResult<T>['errors'] {
  const errors: ParseResult<T>['errors'] = [];

  // Validate document type vs age (Resolución 00002275/2023, Annex 1, Article U04)
  const docType = row['documentType'] ?? row['tipoDocumentoIdentificacion'];
  const birthDate = row['birthDate'] ?? row['fechaNacimiento'];

  if (docType && birthDate && typeof birthDate === 'string') {
    const birth = new Date(birthDate as string);
    if (!isNaN(birth.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const mDiff = today.getMonth() - birth.getMonth();
      if (mDiff < 0 || (mDiff === 0 && today.getDate() < birth.getDate())) age--;

      if (age <= 6 && docType === 'CC') {
        errors.push({
          row: rowIndex,
          message: `Document type CC invalid for age ${age} (should be RC per Res. 2275/2023 Art. U04)`,
          code: 'DOC_TYPE_AGE_MISMATCH',
        });
      }
      if (age >= 7 && age <= 17 && docType === 'CC') {
        errors.push({
          row: rowIndex,
          message: `Document type CC invalid for age ${age} (should be TI per Res. 2275/2023 Art. U04)`,
          code: 'DOC_TYPE_AGE_MISMATCH',
        });
      }
    }
  }

  // Validate sex code (Article U05)
  const sex = row['gender'] ?? row['codSexo'];
  if (sex && typeof sex === 'string' && !['M', 'F', 'I'].includes(sex as string)) {
    errors.push({
      row: rowIndex,
      message: `Invalid sex code "${sex}" (must be M, F, or I per Res. 2275/2023 Art. U05)`,
      code: 'INVALID_SEX_CODE',
    });
  }

  // Validate date format (Article U04)
  if (birthDate && typeof birthDate === 'string') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate as string)) {
      errors.push({
        row: rowIndex,
        message: 'Birth date must be in YYYY-MM-DD format',
        code: 'INVALID_DATE_FORMAT',
      });
    } else if (new Date(birthDate as string) > new Date()) {
      errors.push({
        row: rowIndex,
        message: 'Birth date cannot be in the future',
        code: 'FUTURE_DATE',
      });
    }
  }

  return errors;
}

// Utility to detect duplicates
export function detectDuplicates<T extends Record<string, unknown>>(
  data: T[],
  keyField: keyof T
): Array<{ row: number; message: string; code: string }> {
  const seen = new Map<unknown, number>();
  const duplicates: Array<{ row: number; message: string; code: string }> = [];

  data.forEach((row, index) => {
    const key = row[keyField];
    if (seen.has(key)) {
      duplicates.push({
        row: index,
        message: `Duplicate value "${key}" (first seen at row ${seen.get(key)! + 1})`,
        code: 'DUPLICATE',
      });
    } else {
      seen.set(key, index);
    }
  });

  return duplicates;
}

// Utility to convert parsed data to expected types
export function transformNumericFields<T extends Record<string, unknown>>(
  data: T[],
  numericFields: (keyof T)[]
): T[] {
  return data.map((row) => {
    const transformed = { ...row };
    numericFields.forEach((field) => {
      const value = row[field];
      if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(/[,$]/g, ''));
        if (!isNaN(parsed)) {
          (transformed as Record<string, unknown>)[field as string] = parsed;
        }
      }
    });
    return transformed;
  });
}

import { RowDataPacket } from 'mysql2/promise';
import { Category, RealEstateObject, PaymentRecord, Document, PaymentType } from './types';

export function rowToCategory(row: RowDataPacket): Category {
  return {
    id:        row.id as string,
    name:      row.name as string,
    icon:      row.icon as string,
    color:     row.color as string,
    isDefault: Boolean(row.is_default),
    order:     row.sort_order as number,
  };
}

export function rowToPaymentRecord(row: RowDataPacket): PaymentRecord {
  return {
    id:                   row.id as string,
    date:                 row.rec_date as string,
    period:               row.period as string,
    plannedRent:          Number(row.planned_rent),
    actualRent:           Number(row.actual_rent),
    rentPaymentDate:      row.rent_payment_date as string,
    rentPaymentType:      row.rent_payment_type as PaymentType,
    plannedUtilities:     Number(row.planned_utilities),
    actualUtilities:      Number(row.actual_utilities),
    utilitiesPaymentDate: row.utilities_payment_date as string,
    utilitiesPaymentType: row.utilities_payment_type as PaymentType,
    note:                 (row.note as string | null) ?? undefined,
  };
}

export function rowToDocument(row: RowDataPacket): Document {
  return {
    id:         row.id as string,
    name:       row.name as string,
    size:       row.size as number,
    type:       row.mime_type as string,
    url:        `/api/objects/${row.object_id as string}/documents/${row.id as string}/download`,
    uploadedAt: row.uploaded_at as string,
  };
}

export function rowToObject(
  row: RowDataPacket,
  payments: PaymentRecord[],
  docs: Document[],
): RealEstateObject {
  return {
    id:               row.id as string,
    categoryId:       row.category_id as string,
    street:           row.street as string,
    building:         row.building as string,
    tenantName:       row.tenant_name as string,
    tenantPhone:      row.tenant_phone as string,
    tenantTelegram:   row.tenant_telegram as string,
    contractDate:     row.contract_date as string,
    plannedRent:      Number(row.planned_rent),
    currentPayment: {
      date:                  row.cp_date as string,
      actualRent:            Number(row.cp_actual_rent),
      rentPaymentDate:       row.cp_rent_payment_date as string,
      rentPaymentType:       row.cp_rent_payment_type as PaymentType,
      plannedUtilities:      Number(row.planned_utilities),
      actualUtilities:       Number(row.cp_actual_utilities),
      utilitiesPaymentDate:  row.cp_utilities_payment_date as string,
      utilitiesPaymentType:  row.cp_utilities_payment_type as PaymentType,
      note:                  (row.cp_note as string | null) ?? undefined,
    },
    paymentHistory: payments,
    documents:      docs,
    isArchived:     Boolean(row.is_archived),
    createdAt:      row.created_at as string,
    updatedAt:      row.updated_at as string,
  };
}

export function groupByObjectId<T>(
  rows: RowDataPacket[],
  mapper: (row: RowDataPacket) => T,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const oid = row.object_id as string;
    if (!map.has(oid)) map.set(oid, []);
    map.get(oid)!.push(mapper(row));
  }
  return map;
}

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import {
  fetchCompanyLetterhead,
  fetchEmployeeById,
  fetchPayslipById,
} from '@/lib/finance/employeeQueries';
import { buildPayslipHtml } from '@/lib/finance/payslipHtml';

export async function sharePayslipPdf(payslipId: string) {
  const payslip = await fetchPayslipById(payslipId);
  if (!payslip) throw new Error('Payslip not found');
  const employee = await fetchEmployeeById(payslip.employee_id);
  if (!employee) throw new Error('Employee not found');
  const company = await fetchCompanyLetterhead();
  const html = buildPayslipHtml(employee, payslip, company);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Payslip — ${employee.full_name}`,
    UTI: 'com.adobe.pdf',
  });
}

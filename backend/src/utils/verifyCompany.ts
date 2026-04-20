import fs from 'fs';
import path from 'path';
import csvParser from 'csv-parser';
import User from '../models/User';

interface CsvRow {
  CompanyName: string;
  EmailDomain: string;
  CIN: string;
  GSTIN: string;
  EstablishedYear: string;
  IsValid: string;
}

export async function verifyCompanyBackground(userId: string) {
  try {
    const user = await User.findById(userId);
    if (!user || user.accountType !== 'company') return;
    if (user.isVerifiedCompany) return; // already verified

    const emailDomain = user.email.split('@')[1]?.toLowerCase();
    const cin = user.companyDetails?.cin?.trim().toUpperCase();
    const gstin = user.companyDetails?.gstin?.trim().toUpperCase();

    // Read the CSV asynchronously
    const results: CsvRow[] = [];
    const csvPath = path.join(__dirname, '../data/verified_companies.csv');

    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on('data', (data: any) => results.push(data))
      .on('end', async () => {
        // Validation logic
        // 1. Matches Email Domain
        // 2. OR Matches CIN
        // 3. OR Matches GSTIN
        
        let isMatch = false;

        for (const row of results) {
          if (row.IsValid.toUpperCase() !== 'TRUE') continue;
          
          if (row.EmailDomain.toLowerCase() === emailDomain || 
              (cin && row.CIN.toUpperCase() === cin) || 
              (gstin && row.GSTIN.toUpperCase() === gstin)) {
            isMatch = true;
            break;
          }
        }

        if (isMatch) {
          await User.findByIdAndUpdate(userId, { isVerifiedCompany: true });
          console.log(`[auth]: Company Verification SUCCESS for ${user.email}`);
        } else {
          console.log(`[auth]: Company Verification FAILED for ${user.email}`);
        }
      });
  } catch (err) {
    console.error('[auth]: Background company verification error:', err);
  }
}

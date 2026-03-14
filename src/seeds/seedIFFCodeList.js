/**
 * Seed data for IFF Code List reference tables
 * Based on TO.xlsx - IFF Code List sheet
 */
const seedIFFCodeListData = async (db) => {
  // ===== T5: Enterprise Categories (9 codes) =====
  const enterpriseCategories = [
    { code: '1', value: 'ອົງການຈັດຕັ້ງແຫ່ງຊາດ', value_en: 'NATIONAL ORGANIZATION' },
    { code: '2', value: 'ອົງການຈັດຕັ້ງສາກົນ (ບໍ່ຕັ້ງຢູ່ລາວ)', value_en: 'INTERNATIONAL ORGANIZATION (Non-resident)' },
    { code: '3', value: 'ລັດວິສາຫະກິດ', value_en: 'STATE OWNED ENTERPRISE' },
    { code: '4', value: 'ຮຸ້ນສ່ວນລັດ-ເອກະຊົນ', value_en: 'JOINT VENTURE ENTERPRISE' },
    { code: '5', value: 'ອົງການຈັດຕັ້ງເສດຖະກິດລວມໝູ່', value_en: 'CO-OPERATIVE ENTERPRISE' },
    { code: '6', value: 'ວິສາຫະກິດເອກະຊົນ', value_en: 'PRIVATE ENTERPRISE' },
    { code: '7', value: 'ວິສາຫະກິດຕ່າງປະເທດ', value_en: 'FOREIGN ENTERPRISE' },
    { code: '8', value: 'ວິສາຫະກິດຂອງຜູ້ມີພູມລຳເນົາຢູ່ລາວ', value_en: 'RESIDENT ENTERPRISE' },
    { code: '9', value: 'ວິສາຫະກິດຂອງຜູ້ບໍ່ມີພູມລຳເນົາ', value_en: 'NON-RESIDENT ENTERPRISE' },
  ];

  // ===== T7: Deposit Account Types (5 codes) =====
  const depositAccountTypes = [
    { code: 'S', value: 'ຝາກປະຢັດ', value_en: 'SAVINGS' },
    { code: 'F', value: 'ຝາກປະຈຳ', value_en: 'FIXED' },
    { code: 'C', value: 'ຝາກກະແສລາຍວັນ', value_en: 'CURRENT' },
    { code: 'D', value: 'ພັນທະບັດ', value_en: 'DOCUMENT' },
    { code: 'SF', value: 'ຫຼັກຊັບ(ການເງິນ)', value_en: 'SECURITY (FINANCE)' },
  ];

  // ===== T11: Land Size Units (7 codes) =====
  const landSizeUnits = [
    { code: 'MI2', value: 'ໄມລມົນທົນ', value_en: 'MILE SQUARE' },
    { code: 'HA', value: 'ເຮັກຕາ', value_en: 'HECTARE' },
    { code: 'AC', value: 'ໄລ່', value_en: 'ACRE' },
    { code: 'KM', value: 'ກິໂລແມັດ', value_en: 'KILOMETER' },
    { code: 'M', value: 'ແມັດ', value_en: 'METER' },
    { code: 'M2', value: 'ແມັດມົນທົນ', value_en: 'METER SQUARE' },
    { code: 'MI', value: 'ໄມລ', value_en: 'MILE' },
  ];

  // ===== T6: Additional Loan Purpose codes (HD/CM/TP) =====
  const additionalLoanPurpose = [
    { code: 'HD', value: 'ຫັດຖະກຳ', value_en: 'HANDICRAFT' },
    { code: 'CM', value: 'ການຄ້າ', value_en: 'COMMERCE' },
    { code: 'TP', value: 'ຂົນສົ່ງ', value_en: 'TRANSPORTATION' },
  ];

  // ===== T9: Additional MFI Loan Types (1-6) =====
  const additionalLoanTypes = [
    { code: '1', value: 'ເງິນກູ້ຂາຍຜ່ອນ', value_en: 'INSTALLMENT LOAN' },
    { code: '2', value: 'ເງິນກູ້ບຸກຄົນທົ່ວໄປ', value_en: 'GENERAL PERSONAL LOAN' },
    { code: '3', value: 'ເງິນກູ້ຕາມລະດູການ', value_en: 'SEASONAL LOAN' },
    { code: '4', value: 'ເງິນກູ້ດຳເນີນງານລວມ', value_en: 'GENERAL OPERATION LOAN' },
    { code: '5', value: 'ເງິນກູ້ນຳເຂົ້າ', value_en: 'IMPORT LOAN' },
    { code: '6', value: 'ເງິນກູ້ຄັງເງິນອື່ນ', value_en: 'OTHER TREASURY LOAN' },
  ];

  try {
    // Seed enterprise_categories
    for (const item of enterpriseCategories) {
      await db.enterprise_categories.findOrCreate({
        where: { code: item.code },
        defaults: item,
      });
    }
    console.log('✅ Seeded enterprise_categories (9 codes)');

    // Seed deposit_account_types
    for (const item of depositAccountTypes) {
      await db.deposit_account_types.findOrCreate({
        where: { code: item.code },
        defaults: item,
      });
    }
    console.log('✅ Seeded deposit_account_types (5 codes)');

    // Seed land_size_units
    for (const item of landSizeUnits) {
      await db.land_size_units.findOrCreate({
        where: { code: item.code },
        defaults: item,
      });
    }
    console.log('✅ Seeded land_size_units (7 codes)');

    // Seed additional loan_purpose
    for (const item of additionalLoanPurpose) {
      await db.loan_purpose.findOrCreate({
        where: { code: item.code },
        defaults: item,
      });
    }
    console.log('✅ Seeded additional loan_purpose (HD/CM/TP)');

    // Seed additional loan_types
    for (const item of additionalLoanTypes) {
      await db.loan_types.findOrCreate({
        where: { code: item.code },
        defaults: item,
      });
    }
    console.log('✅ Seeded additional loan_types (1-6 MFI)');

  } catch (error) {
    console.error('❌ Error seeding IFF data:', error.message);
  }
};

module.exports = { seedIFFCodeListData };

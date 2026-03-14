/**
 * auditFields.js — Auto-inject created_by/updated_by from JWT
 * ═══════════════════════════════════════════════════════════
 * AML/CFT ມາດຕາ 22: ທຸກ transaction ຕ້ອງ trace ໃຜເຮັດ
 * 
 * Place AFTER auth middleware so req.user is available.
 * Works for both POST (create) and PUT/PATCH (update).
 */
module.exports = (req, res, next) => {
  if (!req.user?.id) return next();

  const userId = req.user.id;

  if (req.method === 'POST') {
    // CREATE — set created_by (don't override if already set)
    if (!req.body.created_by) {
      req.body.created_by = userId;
    }
    req.body.updated_by = userId;
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    // UPDATE — always set updated_by
    req.body.updated_by = userId;
  }

  next();
};

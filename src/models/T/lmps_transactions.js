/**
 * lmps_transactions — ບັນທຶກທຸກ LMPS transactions (inquiry + transfer)
 * ✅ ຕາມ LMPS v8.7.4 spec
 */
module.exports = (sequelize, DataTypes) => {
    return sequelize.define('lmps_transactions', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

        // ═══ LMPS Core Fields ═══
        direction: { type: DataTypes.STRING(10), allowNull: false },         // OUTGOING / INCOMING
        command_type: { type: DataTypes.STRING(20), allowNull: false },      // INQUIRY / TRANSFER / NOTIFY
        lapnet_transaction_id: { type: DataTypes.STRING(64) },               // X-LAPNET-Transaction-ID

        // ═══ Source (From) ═══
        from_member: { type: DataTypes.STRING(16), allowNull: false },       // BCEL, JDB, APB, LVI...
        from_user: { type: DataTypes.STRING(64) },
        from_user_fullname: { type: DataTypes.STRING(256) },
        from_account: { type: DataTypes.STRING(32) },
        from_account_type: { type: DataTypes.STRING(64) },                   // PERSONAL / CORPORATE

        // ═══ Destination (To) ═══
        to_type: { type: DataTypes.STRING(16) },                             // ACCOUNT / CARD / QR
        to_account: { type: DataTypes.TEXT },                                 // QR data can be 2048+
        to_member: { type: DataTypes.STRING(16) },

        // ═══ Transaction ═══
        reference: { type: DataTypes.STRING(64), allowNull: false },         // 20-char alphanumeric
        amount: { type: DataTypes.DECIMAL(24, 2) },
        fee: { type: DataTypes.DECIMAL(24, 2) },
        ccy: { type: DataTypes.STRING(3) },                                  // LAK, USD, THB
        purpose: { type: DataTypes.STRING(512) },
        request_time: { type: DataTypes.STRING(25) },                        // LMPS format time

        // ═══ Response ═══
        result: { type: DataTypes.STRING(64) },                              // OK, ACCOUNT_BLOCKED, etc.
        receipt: { type: DataTypes.STRING(64) },                             // LMPS-generated receipt
        should_revert: { type: DataTypes.INTEGER },                          // 0 or 1
        response_time: { type: DataTypes.STRING(25) },

        // ═══ Inquiry Response (Incoming) ═══
        account_name: { type: DataTypes.STRING(128) },
        account_ccy: { type: DataTypes.STRING(16) },
        fee_list: { type: DataTypes.TEXT },                                  // JSON feelist

        // ═══ Signatures (for reconciliation) ═══
        source_signature: { type: DataTypes.TEXT },
        lapnet_request_signature: { type: DataTypes.TEXT },
        destination_signature: { type: DataTypes.TEXT },
        lapnet_response_signature: { type: DataTypes.TEXT },

        // ═══ Internal linking ═══
        contract_id: { type: DataTypes.INTEGER },                            // FK → loan_contracts
        installment_no: { type: DataTypes.INTEGER },
        branch_id: { type: DataTypes.STRING(50) },                           // FK → mfi_branches_info
        deposit_account_id: { type: DataTypes.INTEGER },                     // FK → deposit_accounts

        // ═══ Cross-border (future) ═══
        exchange_rate: { type: DataTypes.DECIMAL(24, 2) },
        dst_amount: { type: DataTypes.DECIMAL(24, 2) },
        dst_ccy: { type: DataTypes.STRING(3) },
        src_amount: { type: DataTypes.DECIMAL(24, 2) },
        src_ccy: { type: DataTypes.STRING(3) },

        // ═══ Meta ═══
        raw_request: { type: DataTypes.TEXT },                               // Full JSON request
        raw_response: { type: DataTypes.TEXT },                              // Full JSON response
        retry_count: { type: DataTypes.INTEGER, defaultValue: 0 },
        status: { type: DataTypes.STRING(20), defaultValue: 'PENDING' },     // PENDING/SUCCESS/FAILED
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'lmps_transactions', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};

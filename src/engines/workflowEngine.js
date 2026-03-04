/**
 * workflowEngine.js — State Machine for Loan/Approval Workflows
 *
 * ✅ Configurable levels (user-managed via approval_configs)
 * ✅ Reject with reason → back to DRAFT
 * ✅ In-app notifications
 * ✅ Amount-based approval routing
 */
const db = require('../models');
const { createJournalEntry } = require('./accountingEngine');

// ============================================================
// WORKFLOW STATES & TRANSITIONS
// ============================================================
const STATES = {
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',
    UNDER_REVIEW: 'UNDER_REVIEW',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    DISBURSED: 'DISBURSED',
    ACTIVE: 'ACTIVE',
    CLOSED: 'CLOSED',
    WRITE_OFF: 'WRITE_OFF',
};

// ກຳນົດ transition ທີ່ອະນຸຍາດ
const TRANSITIONS = {
    [STATES.DRAFT]: [STATES.SUBMITTED],
    [STATES.SUBMITTED]: [STATES.UNDER_REVIEW, STATES.REJECTED],
    [STATES.UNDER_REVIEW]: [STATES.APPROVED, STATES.REJECTED],
    [STATES.APPROVED]: [STATES.DISBURSED, STATES.REJECTED],
    [STATES.REJECTED]: [STATES.DRAFT],  // reject → ກັບໄປ DRAFT
    [STATES.DISBURSED]: [STATES.ACTIVE],
    [STATES.ACTIVE]: [STATES.CLOSED, STATES.WRITE_OFF],
    [STATES.CLOSED]: [],
    [STATES.WRITE_OFF]: [],
};

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * ກວດສອບວ່າ transition ທີ່ຮ້ອງຂໍ ອະນຸຍາດ ຫຼື ບໍ່
 */
function canTransition(currentState, targetState) {
    const allowed = TRANSITIONS[currentState];
    return allowed && allowed.includes(targetState);
}

/**
 * ດຶງ approval config ສຳລັບ entity type + amount
 * @param {string} entityType - e.g. 'loan_application'
 * @param {number} amount - ຈຳນວນເງິນ
 * @returns {Array} ລະດັບການອະນຸມັດ ຮຽງຕາມ level
 */
async function getApprovalLevels(entityType, amount = 0) {
    const ApprovalConfig = db['approval_configs'];
    if (!ApprovalConfig) return [];

    const configs = await ApprovalConfig.findAll({
        where: {
            entity_type: entityType,
            is_active: true,
        },
        order: [['level', 'ASC']],
    });

    // ກັ່ນຕອງຕາມຈຳນວນເງິນ
    return configs.filter(c => {
        const min = parseFloat(c.min_amount) || 0;
        const max = parseFloat(c.max_amount) || Infinity;
        return amount >= min && amount <= max;
    });
}

/**
 * ດຳເນີນ transition
 * @param {object} params
 * @param {string} params.entityType - ປະເພດ entity (e.g. 'loan_application')
 * @param {number} params.entityId - ID ຂອງ record
 * @param {string} params.targetState - ສະຖານະເປົ້າໝາຍ
 * @param {number} params.userId - ຜູ້ດຳເນີນການ
 * @param {string} params.reason - ເຫດຜົນ (ບັງຄັບ ເມື່ອ reject)
 * @param {number} params.amount - ຈຳນວນເງິນ (ສຳລັບ approval routing)
 */
async function executeTransition({
    entityType, entityId, targetState, userId, reason = '', amount = 0,
}) {
    // 1. ດຶງ model ຕາມ entityType
    const Model = db[entityType];
    if (!Model) throw new Error(`Model '${entityType}' not found`);

    // 2. ດຶງ record ປັດຈຸບັນ
    const record = await Model.findByPk(entityId);
    if (!record) throw new Error(`Record #${entityId} not found`);

    const currentState = record.status;

    // 3. ກວດ transition
    if (!canTransition(currentState, targetState)) {
        throw new Error(`ບໍ່ສາມາດປ່ຽນຈາກ '${currentState}' ໄປ '${targetState}'`);
    }

    // 4. ຖ້າ REJECTED → ບັງຄັບໃຫ້ມີເຫດຜົນ
    if (targetState === STATES.REJECTED && !reason) {
        throw new Error('ກະລຸນາລະບຸເຫດຜົນໃນການປະຕິເສດ');
    }

    // 5. ກວດ approval level (ຖ້າ transition ໄປ APPROVED)
    if (targetState === STATES.APPROVED) {
        const levels = await getApprovalLevels(entityType, amount);
        if (levels.length > 0) {
            // Check if all approval levels have been satisfied
            const ApprovalHistory = db['approval_histories'];
            if (ApprovalHistory) {
                const approvals = await ApprovalHistory.findAll({
                    where: {
                        entity_type: entityType,
                        entity_id: entityId,
                        status: 'APPROVED',
                    },
                });
                const approvedLevels = new Set(approvals.map(a => a.level));
                const pendingLevels = levels.filter(l => !approvedLevels.has(l.level));

                if (pendingLevels.length > 0) {
                    // ບັນທຶກ approval ສຳລັບ level ປັດຈຸບັນ
                    const currentLevel = pendingLevels[0];
                    await ApprovalHistory.create({
                        entity_type: entityType,
                        entity_id: entityId,
                        level: currentLevel.level,
                        status: 'APPROVED',
                        approved_by: userId,
                        comments: reason,
                    });

                    // ຍັງບໍ່ approving ທຸກ level → ຢູ່ UNDER_REVIEW
                    if (pendingLevels.length > 1) {
                        return {
                            success: true,
                            message: `ອະນຸມັດລະດັບ ${currentLevel.level} ສຳເລັດ. ລໍຖ້າລະດັບ ${pendingLevels[1].level}`,
                            newState: STATES.UNDER_REVIEW,
                            pendingLevels: pendingLevels.length - 1,
                        };
                    }
                }
            }
        }
    }

    // 6. ອັບເດດ status
    await Model.update({ status: targetState }, { where: { id: entityId } });

    // 6.1 ===== AUTO-JOURNAL: ສ້າງ JE ອັດຕະໂນມັດ ເມື່ອ ປ່ອຍ ເງິນ ກູ້ =====
    if (targetState === STATES.DISBURSED) {
        try {
            const record2 = await Model.findByPk(entityId, { raw: true });
            const disbursementAmount = parseFloat(record2.approved_balance) || parseFloat(amount) || 0;

            if (disbursementAmount > 0) {
                const journalResult = await createJournalEntry({
                    templateName: 'LOAN_DISBURSEMENT',
                    amounts: disbursementAmount,
                    referenceNo: `LOAN-DIS-${entityId}-${Date.now()}`,
                    userId,
                    description: `ປ່ອຍ ເງິນ ກູ້ #${entityId} ຈຳນວນ ${disbursementAmount.toLocaleString()} ₭`,
                });
                console.log(`✅ Auto-journal for disbursement: ${JSON.stringify(journalResult)}`);
            }
        } catch (jeError) {
            console.error(`⚠️ Auto-journal failed (non-blocking):`, jeError.message);
            // ບໍ່ block workflow — journal ສາມາດ ສ້າງ ທີຫຼັງ ໄດ້
        }
    }

    // 7. ບັນທຶກ history
    const ApprovalHistory = db['approval_histories'];
    if (ApprovalHistory) {
        await ApprovalHistory.create({
            entity_type: entityType,
            entity_id: entityId,
            level: 0,
            status: targetState,
            approved_by: userId,
            comments: reason || `Transition to ${targetState}`,
        });
    }

    // 8. ສ້າງ in-app notification
    await createNotification({
        entityType,
        entityId,
        action: targetState,
        userId,
        reason,
    });

    return {
        success: true,
        message: `ປ່ຽນສະຖານະເປັນ '${targetState}' ສຳເລັດ`,
        previousState: currentState,
        newState: targetState,
    };
}

/**
 * ສ້າງ in-app notification
 */
async function createNotification({ entityType, entityId, action, userId, reason }) {
    const Notification = db['notifications'];
    if (!Notification) return;

    const messages = {
        [STATES.SUBMITTED]: `ມີ ${entityType} #${entityId} ສົ່ງຂໍອະນຸມັດ`,
        [STATES.UNDER_REVIEW]: `${entityType} #${entityId} ກຳລັງກວດສອບ`,
        [STATES.APPROVED]: `${entityType} #${entityId} ອະນຸມັດແລ້ວ`,
        [STATES.REJECTED]: `${entityType} #${entityId} ຖືກປະຕິເສດ: ${reason}`,
        [STATES.DISBURSED]: `${entityType} #${entityId} ຈ່າຍແລ້ວ`,
    };

    try {
        await Notification.create({
            type: 'workflow',
            title: `Workflow: ${action}`,
            message: messages[action] || `${entityType} #${entityId} → ${action}`,
            entity_type: entityType,
            entity_id: entityId,
            user_id: userId,
            is_read: false,
        });
    } catch (err) {
        console.error('⚠️ Notification error:', err.message);
    }
}

/**
 * ດຶງ actions ທີ່ valid ສຳລັບ state ປັດຈຸບັນ
 */
function getAvailableActions(currentState) {
    return (TRANSITIONS[currentState] || []).map(state => ({
        targetState: state,
        label: getActionLabel(state),
        requiresReason: state === STATES.REJECTED,
        color: getActionColor(state),
    }));
}

function getActionLabel(state) {
    const labels = {
        [STATES.SUBMITTED]: 'ສົ່ງອະນຸມັດ',
        [STATES.UNDER_REVIEW]: 'ກວດສອບ',
        [STATES.APPROVED]: 'ອະນຸມັດ',
        [STATES.REJECTED]: 'ປະຕິເສດ',
        [STATES.DISBURSED]: 'ຈ່າຍ',
        [STATES.ACTIVE]: 'ເປີດນຳໃຊ້',
        [STATES.CLOSED]: 'ປິດ',
        [STATES.WRITE_OFF]: 'ຕັດໜີ້ສູນ',
        [STATES.DRAFT]: 'ກັບເປັນ Draft',
    };
    return labels[state] || state;
}

function getActionColor(state) {
    const colors = {
        [STATES.SUBMITTED]: 'primary',
        [STATES.APPROVED]: 'success',
        [STATES.REJECTED]: 'error',
        [STATES.DISBURSED]: 'info',
        [STATES.CLOSED]: 'default',
        [STATES.WRITE_OFF]: 'warning',
    };
    return colors[state] || 'default';
}

module.exports = {
    STATES,
    TRANSITIONS,
    canTransition,
    getApprovalLevels,
    executeTransition,
    getAvailableActions,
    createNotification,
};

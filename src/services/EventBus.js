/**
 * EventBus — Domain Event System (Phase 15)
 * ═══════════════════════════════════════════
 * Simple in-process event bus for domain events.
 * Can be replaced with Kafka/RabbitMQ in production.
 *
 * Domain Events:
 *   - LoanApproved, LoanDisbursed, LoanOverdue
 *   - PaymentReceived, LargeDeposit
 *   - AccountFrozen, AccountUnfrozen
 *   - CustomerBlacklisted, KYCVerified
 *
 * Usage:
 *   const eventBus = require('./EventBus');
 *   eventBus.emit('LoanDisbursed', { contractId, amount, userId });
 *   eventBus.on('LoanDisbursed', async (data) => { ... });
 */
const EventEmitter = require('events');
const logger = require('../config/logger');

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50); // Support many handlers
        this._eventLog = []; // In-memory event log (last 1000)
    }

    /**
     * Emit domain event with logging + audit
     */
    emitEvent(eventName, data) {
        const event = {
            name: eventName,
            data,
            timestamp: new Date().toISOString(),
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        };

        // Log to structured logger
        logger.info(`DomainEvent: ${eventName}`, {
            eventId: event.id,
            eventName,
            data: this._sanitize(data),
        });

        // Keep last 1000 events in memory
        this._eventLog.push(event);
        if (this._eventLog.length > 1000) {
            this._eventLog.shift();
        }

        // Emit to all listeners
        try {
            this.emit(eventName, data);
        } catch (err) {
            logger.error(`EventBus handler error: ${eventName}`, {
                error: err.message,
                eventId: event.id,
            });
        }

        return event;
    }

    /**
     * Get recent events (for monitoring dashboard)
     */
    getRecentEvents(limit = 50) {
        return this._eventLog.slice(-limit).reverse();
    }

    /**
     * Sanitize data for logging (remove sensitive fields)
     */
    _sanitize(data) {
        if (!data || typeof data !== 'object') return data;
        const sanitized = { ...data };
        const sensitiveKeys = ['password', 'secret', 'token', 'pin', 'otp'];
        for (const key of Object.keys(sanitized)) {
            if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
                sanitized[key] = '[REDACTED]';
            }
        }
        return sanitized;
    }
}

// Singleton instance
const eventBus = new EventBus();

// ═══ Register Core Domain Event Handlers ═══

// Loan events → Notification
eventBus.on('LoanDisbursed', (data) => {
    logger.info('📋 LoanDisbursed handler: queue notification', { contractId: data.contractId });
    // TODO: Queue SMS/Email notification to customer
});

// Large deposit → CTR check
eventBus.on('LargeDeposit', (data) => {
    logger.info('🏦 LargeDeposit handler: CTR check triggered', { amount: data.amount });
    // CTR is handled directly in DepositService for now
});

// Account freeze → Audit + notification
eventBus.on('AccountFrozen', (data) => {
    logger.audit('ACCOUNT_FROZEN_EVENT', {
        accountId: data.accountId,
        reason: data.reason,
        userId: data.userId,
    });
});

// Blacklist → Alert
eventBus.on('CustomerBlacklisted', (data) => {
    logger.audit('CUSTOMER_BLACKLISTED_EVENT', {
        customerId: data.customerId,
        reason: data.reason,
    });
});

module.exports = eventBus;

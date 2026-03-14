module.exports = (sequelize, DataTypes) => {
    return sequelize.define('currencies', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        code: { type: DataTypes.STRING(3), allowNull: false, unique: true },
        name: { type: DataTypes.STRING(100) },
        symbol: { type: DataTypes.STRING(10) },
        // ═══ Audit Fields (AML/CFT ມ.20) ═══
        created_at: { type: DataTypes.DATE },
        updated_at: { type: DataTypes.DATE },
    // ═══ Audit Trail (AML/CFT ມ.22) ═══
    created_by: { type: DataTypes.INTEGER },
    updated_by: { type: DataTypes.INTEGER },
    // ═══ Soft Delete (AML/CFT ມ.20) ═══
    deleted_at: { type: DataTypes.DATE },
    }, { tableName: 'currencies', createdAt: 'created_at', updatedAt: 'updated_at', paranoid: true, deletedAt: 'deleted_at' });
};

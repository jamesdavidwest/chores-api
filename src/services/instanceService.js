// src/services/InstanceService.js
const { DatabaseService } = require('./DatabaseService');
const transactionManager = require('../utils/TransactionManager');
const AppError = require('../utils/AppError');

class InstanceService {
    constructor() {
        this.db = DatabaseService.getInstance();
        this.tableName = 'instances';
    }

    /**
     * List instances with pagination and filters
     */
    async list(page, limit, filters = {}) {
        const offset = (page - 1) * limit;
        
        const query = this.db.knex(this.tableName)
            .select('*')
            .whereNull('archived_at');

        // Apply filters
        if (filters.type) {
            query.where('type', filters.type);
        }
        if (filters.status) {
            query.where('status', filters.status);
        }
        if (filters.createdBy) {
            query.where('created_by', filters.createdBy);
        }
        if (filters.tags) {
            query.whereRaw('tags && ?::text[]', [filters.tags]);
        }

        // Get total count for pagination
        const [{ count }] = await query.clone().count();

        // Get paginated results
        const data = await query
            .orderBy('created_at', 'desc')
            .offset(offset)
            .limit(limit);

        return {
            data,
            pagination: {
                page,
                limit,
                total: parseInt(count),
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    /**
     * Get instance by ID
     */
    async getById(id) {
        return this.db.knex(this.tableName)
            .where('id', id)
            .first();
    }

    /**
     * Create new instance with transaction
     */
    async create(instanceData) {
        return transactionManager.executeTransaction(async (trx) => {
            // Create main instance
            const [instance] = await trx(this.tableName)
                .insert({
                    ...instanceData,
                    created_at: this.db.knex.fn.now(),
                    updated_at: this.db.knex.fn.now()
                })
                .returning('*');

            // If this is a child instance, update parent's metadata
            if (instanceData.parentId) {
                await trx(this.tableName)
                    .where('id', instanceData.parentId)
                    .update({
                        updated_at: this.db.knex.fn.now(),
                        metadata: this.db.knex.raw(`
                            jsonb_set(
                                metadata,
                                '{childInstances}',
                                COALESCE(metadata->'childInstances', '[]'::jsonb) || ?::jsonb
                            )
                        `, [JSON.stringify([instance.id])])
                    });
            }

            return instance;
        });
    }

    /**
     * Update instance with transaction
     */
    async update(id, instanceData) {
        return transactionManager.executeTransaction(async (trx) => {
            // Get current instance data
            const currentInstance = await trx(this.tableName)
                .where('id', id)
                .first();

            if (!currentInstance) {
                throw new AppError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
            }

            // Handle parent ID changes
            if (instanceData.parentId !== currentInstance.parentId) {
                // Remove from old parent's metadata if it had one
                if (currentInstance.parentId) {
                    await trx(this.tableName)
                        .where('id', currentInstance.parentId)
                        .update({
                            updated_at: this.db.knex.fn.now(),
                            metadata: this.db.knex.raw(`
                                jsonb_set(
                                    metadata,
                                    '{childInstances}',
                                    (metadata->'childInstances') - ?
                                )
                            `, [currentInstance.id])
                        });
                }

                // Add to new parent's metadata if it has one
                if (instanceData.parentId) {
                    await trx(this.tableName)
                        .where('id', instanceData.parentId)
                        .update({
                            updated_at: this.db.knex.fn.now(),
                            metadata: this.db.knex.raw(`
                                jsonb_set(
                                    metadata,
                                    '{childInstances}',
                                    COALESCE(metadata->'childInstances', '[]'::jsonb) || ?::jsonb
                                )
                            `, [JSON.stringify([currentInstance.id])])
                        });
                }
            }

            // Update instance
            const [updatedInstance] = await trx(this.tableName)
                .where('id', id)
                .update({
                    ...instanceData,
                    updated_at: this.db.knex.fn.now()
                })
                .returning('*');

            return updatedInstance;
        });
    }

    /**
     * Delete instance with transaction
     */
    async delete(id) {
        return transactionManager.executeTransaction(async (trx) => {
            const instance = await trx(this.tableName)
                .where('id', id)
                .first();

            if (!instance) {
                throw new AppError(404, 'INSTANCE_NOT_FOUND', 'Instance not found');
            }

            // Remove from parent's metadata if it has a parent
            if (instance.parentId) {
                await trx(this.tableName)
                    .where('id', instance.parentId)
                    .update({
                        updated_at: this.db.knex.fn.now(),
                        metadata: this.db.knex.raw(`
                            jsonb_set(
                                metadata,
                                '{childInstances}',
                                (metadata->'childInstances') - ?
                            )
                        `, [id])
                    });
            }

            // Delete the instance
            await trx(this.tableName)
                .where('id', id)
                .del();

            return true;
        });
    }

    /**
     * Archive instance with transaction
     */
    async archive(id) {
        return transactionManager.executeTransaction(async (trx) => {
            const [instance] = await trx(this.tableName)
                .where('id', id)
                .update({
                    status: 'archived',
                    archived_at: this.db.knex.fn.now(),
                    updated_at: this.db.knex.fn.now()
                })
                .returning('*');

            return instance;
        });
    }

    /**
     * Restore archived instance with transaction
     */
    async restore(id) {
        return transactionManager.executeTransaction(async (trx) => {
            const [instance] = await trx(this.tableName)
                .where('id', id)
                .update({
                    status: 'active',
                    archived_at: null,
                    updated_at: this.db.knex.fn.now()
                })
                .returning('*');

            return instance;
        });
    }
}

module.exports = InstanceService;
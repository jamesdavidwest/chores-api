const databaseService = require('./DatabaseService');
const transactionManager = require('../utils/TransactionManager');
const AppError = require('../utils/AppError');
const { ErrorTypes } = require('../utils/errorTypes');

class InstanceService {
    constructor() {
        this.db = databaseService.getKnex();
        this.tableName = 'instances';
        this.serviceName = 'InstanceService';
    }

    /**
     * List instances with pagination and filters
     */
    async list(page, limit, filters = {}) {
        try {
            const offset = (page - 1) * limit;
            
            const query = this.db(this.tableName)
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
        } catch (error) {
            throw this._handleError(error, 'list', { page, limit, filters });
        }
    }

    /**
     * Get instance by ID
     */
    async getById(id) {
        try {
            const instance = await this.db(this.tableName)
                .where('id', id)
                .first();

            if (!instance) {
                throw new AppError(
                    ErrorTypes.NOT_FOUND,
                    this.serviceName,
                    'getById',
                    {
                        resource: 'Instance',
                        id: id
                    }
                );
            }

            return instance;
        } catch (error) {
            throw this._handleError(error, 'getById', { id });
        }
    }

    /**
     * Create new instance with transaction
     */
    async create(instanceData) {
        try {
            return await transactionManager.executeTransaction(async (trx) => {
                // Create main instance
                const [instance] = await trx(this.tableName)
                    .insert({
                        ...instanceData,
                        created_at: this.db.fn.now(),
                        updated_at: this.db.fn.now()
                    })
                    .returning('*');

                // If this is a child instance, update parent's metadata
                if (instanceData.parentId) {
                    const parent = await trx(this.tableName)
                        .where('id', instanceData.parentId)
                        .first();

                    if (!parent) {
                        throw new AppError(
                            ErrorTypes.NOT_FOUND,
                            this.serviceName,
                            'create',
                            {
                                resource: 'Parent Instance',
                                id: instanceData.parentId,
                                childId: instance.id,
                                action: 'creating child instance'
                            }
                        );
                    }

                    await trx(this.tableName)
                        .where('id', instanceData.parentId)
                        .update({
                            updated_at: this.db.fn.now(),
                            metadata: this.db.raw(`
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
        } catch (error) {
            throw this._handleError(error, 'create', { 
                instanceType: instanceData.type,
                parentId: instanceData.parentId,
                metadata: instanceData.metadata 
            });
        }
    }

    /**
     * Update instance with transaction
     */
    async update(id, instanceData) {
        try {
            return await transactionManager.executeTransaction(async (trx) => {
                // Get current instance data
                const currentInstance = await trx(this.tableName)
                    .where('id', id)
                    .first();

                if (!currentInstance) {
                    throw new AppError(
                        ErrorTypes.NOT_FOUND,
                        this.serviceName,
                        'update',
                        {
                            resource: 'Instance',
                            id: id,
                            updateAttempted: true,
                            updateFields: Object.keys(instanceData)
                        }
                    );
                }

                // Handle parent ID changes
                if (instanceData.parentId !== currentInstance.parentId) {
                    // Remove from old parent's metadata if it had one
                    if (currentInstance.parentId) {
                        const oldParent = await trx(this.tableName)
                            .where('id', currentInstance.parentId)
                            .first();

                        if (!oldParent) {
                            throw new AppError(
                                ErrorTypes.NOT_FOUND,
                                this.serviceName,
                                'update',
                                {
                                    resource: 'Old Parent Instance',
                                    id: currentInstance.parentId,
                                    childId: id,
                                    action: 'removing child reference'
                                }
                            );
                        }

                        await trx(this.tableName)
                            .where('id', currentInstance.parentId)
                            .update({
                                updated_at: this.db.fn.now(),
                                metadata: this.db.raw(`
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
                        const newParent = await trx(this.tableName)
                            .where('id', instanceData.parentId)
                            .first();

                        if (!newParent) {
                            throw new AppError(
                                ErrorTypes.NOT_FOUND,
                                this.serviceName,
                                'update',
                                {
                                    resource: 'New Parent Instance',
                                    id: instanceData.parentId,
                                    childId: id,
                                    action: 'adding child reference'
                                }
                            );
                        }

                        await trx(this.tableName)
                            .where('id', instanceData.parentId)
                            .update({
                                updated_at: this.db.fn.now(),
                                metadata: this.db.raw(`
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
                        updated_at: this.db.fn.now()
                    })
                    .returning('*');

                return updatedInstance;
            });
        } catch (error) {
            throw this._handleError(error, 'update', { 
                id, 
                updateFields: Object.keys(instanceData),
                parentIdChanged: instanceData.parentId !== undefined
            });
        }
    }

    /**
     * Delete instance with transaction
     */
    async delete(id) {
        try {
            return await transactionManager.executeTransaction(async (trx) => {
                const instance = await trx(this.tableName)
                    .where('id', id)
                    .first();

                if (!instance) {
                    throw new AppError(
                        ErrorTypes.NOT_FOUND,
                        this.serviceName,
                        'delete',
                        {
                            resource: 'Instance',
                            id: id,
                            deleteAttempted: true
                        }
                    );
                }

                // Remove from parent's metadata if it has a parent
                if (instance.parentId) {
                    const parent = await trx(this.tableName)
                        .where('id', instance.parentId)
                        .first();

                    if (!parent) {
                        throw new AppError(
                            ErrorTypes.NOT_FOUND,
                            this.serviceName,
                            'delete',
                            {
                                resource: 'Parent Instance',
                                id: instance.parentId,
                                childId: id,
                                action: 'removing child reference during deletion'
                            }
                        );
                    }

                    await trx(this.tableName)
                        .where('id', instance.parentId)
                        .update({
                            updated_at: this.db.fn.now(),
                            metadata: this.db.raw(`
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
        } catch (error) {
            throw this._handleError(error, 'delete', { id });
        }
    }

    /**
     * Archive instance with transaction
     */
    async archive(id) {
        try {
            return await transactionManager.executeTransaction(async (trx) => {
                const instance = await trx(this.tableName)
                    .where('id', id)
                    .first();

                if (!instance) {
                    throw new AppError(
                        ErrorTypes.NOT_FOUND,
                        this.serviceName,
                        'archive',
                        {
                            resource: 'Instance',
                            id: id,
                            action: 'archiving'
                        }
                    );
                }

                const [archivedInstance] = await trx(this.tableName)
                    .where('id', id)
                    .update({
                        status: 'archived',
                        archived_at: this.db.fn.now(),
                        updated_at: this.db.fn.now()
                    })
                    .returning('*');

                return archivedInstance;
            });
        } catch (error) {
            throw this._handleError(error, 'archive', { id });
        }
    }

    /**
     * Restore archived instance with transaction
     */
    async restore(id) {
        try {
            return await transactionManager.executeTransaction(async (trx) => {
                const instance = await trx(this.tableName)
                    .where('id', id)
                    .first();

                if (!instance) {
                    throw new AppError(
                        ErrorTypes.NOT_FOUND,
                        this.serviceName,
                        'restore',
                        {
                            resource: 'Instance',
                            id: id,
                            action: 'restoring'
                        }
                    );
                }

                if (!instance.archived_at) {
                    throw new AppError(
                        ErrorTypes.VALIDATION_ERROR,
                        this.serviceName,
                        'restore',
                        {
                            message: 'Instance is not archived',
                            id: id,
                            currentStatus: instance.status
                        }
                    );
                }

                const [restoredInstance] = await trx(this.tableName)
                    .where('id', id)
                    .update({
                        status: 'active',
                        archived_at: null,
                        updated_at: this.db.fn.now()
                    })
                    .returning('*');

                return restoredInstance;
            });
        } catch (error) {
            throw this._handleError(error, 'restore', { id });
        }
    }

    /**
     * Handle database errors with specific context
     * @private
     * @param {Error} error 
     * @param {string} method 
     * @param {Object} details
     * @returns {AppError}
     */
    _handleError(error, method, details = {}) {
        // If it's already an AppError, just pass it through
        if (error instanceof AppError) {
            return error;
        }

        // Handle specific database errors
        if (error.code === '23505') {
            return new AppError(
                ErrorTypes.DUPLICATE_ENTRY,
                this.serviceName,
                method,
                {
                    error: error.detail,
                    constraint: error.constraint,
                    ...details
                }
            );
        }

        if (error.code === '23503') {
            return new AppError(
                ErrorTypes.VALIDATION_ERROR,
                this.serviceName,
                method,
                {
                    message: 'Referenced record does not exist',
                    error: error.detail,
                    constraint: error.constraint,
                    ...details
                }
            );
        }

        // Handle JSON/JSONB errors
        if (error.code === '22P02') {
            return new AppError(
                ErrorTypes.VALIDATION_ERROR,
                this.serviceName,
                method,
                {
                    message: 'Invalid JSON data',
                    error: error.message,
                    ...details
                }
            );
        }

        // Handle transaction errors
        if (error.code === '40P01') {
            return new AppError(
                ErrorTypes.TRANSACTION_ERROR,
                this.serviceName,
                method,
                {
                    message: 'Deadlock detected',
                    error: error.message,
                    ...details
                }
            );
        }

        // Handle general database errors
        return new AppError(
            ErrorTypes.DB_ERROR,
            this.serviceName,
            method,
            {
                message: error.message,
                code: error.code,
                ...details
            }
        );
    }
}

module.exports = InstanceService;
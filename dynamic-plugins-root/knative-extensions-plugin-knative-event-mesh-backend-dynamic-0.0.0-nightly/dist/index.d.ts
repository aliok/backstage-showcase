import { TaskScheduleDefinition, TaskRunner, PluginTaskScheduler } from '@backstage/backend-tasks';
import { ApiEntity, ComponentEntity, Entity } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import { EntityProvider, EntityProviderConnection, CatalogProcessor, CatalogProcessorEmit, CatalogProcessorCache } from '@backstage/plugin-catalog-node';
import { Logger } from 'winston';
import { CatalogClient } from '@backstage/catalog-client';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import { BackendDynamicPluginInstaller } from '@backstage/backend-dynamic-feature-service';

type KnativeEventMeshProviderConfig = {
    id: string;
    baseUrl: string;
    schedule?: TaskScheduleDefinition;
};

type EventType = {
    name: string;
    namespace: string;
    type: string;
    uid: string;
    description?: string;
    schemaData?: string;
    schemaURL?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    consumedBy?: string[];
};
type Broker = {
    name: string;
    namespace: string;
    uid: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    providedEventTypes?: string[];
};
declare class KnativeEventMeshProvider implements EntityProvider {
    private readonly env;
    private readonly baseUrl;
    private readonly logger;
    private readonly scheduleFn;
    private connection?;
    static fromConfig(configRoot: Config, options: {
        logger: Logger;
        schedule?: TaskRunner;
        scheduler?: PluginTaskScheduler;
    }): KnativeEventMeshProvider[];
    constructor(config: KnativeEventMeshProviderConfig, logger: Logger, taskRunner: TaskRunner);
    private createScheduleFn;
    getProviderName(): string;
    connect(connection: EntityProviderConnection): Promise<void>;
    run(): Promise<void>;
    private buildEntities;
    buildEventTypeEntity(eventType: EventType): ApiEntity;
    buildBrokerEntity(broker: Broker): ComponentEntity;
}

declare class KnativeEventMeshProcessor implements CatalogProcessor {
    private readonly catalogApi;
    private readonly logger;
    private readonly queryEntityPageLimit;
    constructor(catalogApi: CatalogClient, logger: Logger, queryEntityPageLimit?: number);
    getProcessorName(): string;
    preProcessEntity(entity: Entity, _location: LocationSpec, emit: CatalogProcessorEmit, _originLocation: LocationSpec, _cache: CatalogProcessorCache): Promise<Entity>;
    private findComponentsByBackstageId;
}

declare const dynamicPluginInstaller: BackendDynamicPluginInstaller;

export { KnativeEventMeshProcessor, KnativeEventMeshProvider, dynamicPluginInstaller };

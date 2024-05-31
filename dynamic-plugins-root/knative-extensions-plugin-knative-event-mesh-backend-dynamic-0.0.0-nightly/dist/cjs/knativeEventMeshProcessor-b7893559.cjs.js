'use strict';

var catalogModel = require('@backstage/catalog-model');
var backendTasks = require('@backstage/backend-tasks');

function readKnativeEventMeshProviderConfigs(config) {
  const providerConfigs = config.getOptionalConfig(
    "catalog.providers.knativeEventMesh"
  );
  if (!providerConfigs) {
    return [];
  }
  return providerConfigs.keys().map(
    (id) => readKnativeEventMeshProviderConfig(id, providerConfigs.getConfig(id))
  );
}
function readKnativeEventMeshProviderConfig(id, config) {
  const baseUrl = config.getString("baseUrl");
  const schedule = config.has("schedule") ? backendTasks.readTaskScheduleDefinitionFromConfig(config.getConfig("schedule")) : void 0;
  return {
    id,
    baseUrl,
    schedule
  };
}

const TypeKnativeEvent = "eventType";
const TypeKnativeBroker = "broker";
const SystemKnative = "knative-event-mesh";
const OwnerKnative = "knative";

var __defProp$1 = Object.defineProperty;
var __defNormalProp$1 = (obj, key, value) => key in obj ? __defProp$1(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField$1 = (obj, key, value) => {
  __defNormalProp$1(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
async function getEventMesh(baseUrl) {
  const response = await fetch(`${baseUrl}`);
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return await response.json();
}
class KnativeEventMeshProvider {
  constructor(config, logger, taskRunner) {
    __publicField$1(this, "env");
    __publicField$1(this, "baseUrl");
    __publicField$1(this, "logger");
    __publicField$1(this, "scheduleFn");
    __publicField$1(this, "connection");
    this.env = config.id;
    this.baseUrl = config.baseUrl;
    this.logger = logger.child({
      target: this.getProviderName()
    });
    this.scheduleFn = this.createScheduleFn(taskRunner);
  }
  static fromConfig(configRoot, options) {
    const providerConfigs = readKnativeEventMeshProviderConfigs(configRoot);
    if (!options.schedule && !options.scheduler) {
      throw new Error("Either schedule or scheduler must be provided.");
    }
    const logger = options.logger.child({ plugin: "knative-event-mesh-backend" });
    logger.info(`Found ${providerConfigs.length} knative event mesh provider configs with ids: ${providerConfigs.map((providerConfig) => providerConfig.id).join(", ")}`);
    return providerConfigs.map((providerConfig) => {
      if (!options.schedule && !providerConfig.schedule) {
        throw new Error(`No schedule provided neither via code nor config for KnativeEventMesh entity provider:${providerConfig.id}.`);
      }
      let taskRunner;
      if (options.scheduler && providerConfig.schedule) {
        taskRunner = options.scheduler.createScheduledTaskRunner(providerConfig.schedule);
      } else if (options.schedule) {
        taskRunner = options.schedule;
      } else {
        throw new Error("Neither schedule nor scheduler is provided.");
      }
      return new KnativeEventMeshProvider(
        providerConfig,
        options.logger,
        taskRunner
      );
    });
  }
  createScheduleFn(taskRunner) {
    return async () => {
      const taskId = `${this.getProviderName()}:run`;
      return taskRunner.run({
        id: taskId,
        fn: async () => {
          var _a;
          try {
            await this.run();
          } catch (error) {
            this.logger.error(
              `Error while fetching Knative Event Mesh from ${this.baseUrl}`,
              {
                // Default Error properties:
                name: error.name,
                message: error.message,
                stack: error.stack,
                // Additional status code if available:
                status: (_a = error.response) == null ? void 0 : _a.status
              }
            );
          }
        }
      });
    };
  }
  getProviderName() {
    return `knative-event-mesh-provider-${this.env}`;
  }
  async connect(connection) {
    this.connection = connection;
    await this.scheduleFn();
  }
  async run() {
    if (!this.connection) {
      throw new Error("Not initialized");
    }
    const url = this.baseUrl;
    const eventMesh = await getEventMesh(url);
    const entities = this.buildEntities(eventMesh);
    await this.connection.applyMutation({
      type: "full",
      entities: entities.map((entity) => ({
        entity,
        locationKey: this.getProviderName()
      }))
    });
  }
  buildEntities(eventMesh) {
    const entities = [];
    for (const eventType of eventMesh.eventTypes) {
      const entity = this.buildEventTypeEntity(eventType);
      entities.push(entity);
    }
    for (const broker of eventMesh.brokers) {
      const entity = this.buildBrokerEntity(broker);
      entities.push(entity);
    }
    return entities;
  }
  buildEventTypeEntity(eventType) {
    var _a, _b;
    const annotations = (_a = eventType.annotations) != null ? _a : {};
    annotations[catalogModel.ANNOTATION_ORIGIN_LOCATION] = annotations[catalogModel.ANNOTATION_LOCATION] = `url:${this.baseUrl}`;
    const links = [];
    if (eventType.schemaURL) {
      links.push({
        title: "View external schema",
        icon: "scaffolder",
        url: eventType.schemaURL
      });
    }
    return {
      apiVersion: "backstage.io/v1alpha1",
      kind: "API",
      metadata: {
        name: eventType.name,
        namespace: eventType.namespace,
        description: eventType.description,
        labels: eventType.labels || {},
        annotations,
        // we don't use tags
        tags: [],
        links,
        title: `${eventType.type} - (${eventType.namespace}/${eventType.name})`,
        // custom field, stored
        // see https://backstage.io/docs/features/software-catalog/extending-the-model#adding-new-fields-to-the-metadata-object
        // can't make it type safe as the Metadata type is not exported
        consumedBy: (_b = eventType.consumedBy) != null ? _b : []
      },
      spec: {
        type: TypeKnativeEvent,
        lifecycle: this.env,
        system: SystemKnative,
        owner: OwnerKnative,
        definition: eventType.schemaData || "{}"
      }
    };
  }
  buildBrokerEntity(broker) {
    var _a;
    const annotations = (_a = broker.annotations) != null ? _a : {};
    annotations[catalogModel.ANNOTATION_ORIGIN_LOCATION] = annotations[catalogModel.ANNOTATION_LOCATION] = `url:${this.baseUrl}`;
    return {
      apiVersion: "backstage.io/v1alpha1",
      kind: "Component",
      metadata: {
        name: broker.name,
        namespace: broker.namespace,
        labels: broker.labels || {},
        annotations,
        // we don't use tags
        tags: []
      },
      spec: {
        type: TypeKnativeBroker,
        lifecycle: this.env,
        system: SystemKnative,
        owner: OwnerKnative,
        providesApis: !broker.providedEventTypes ? [] : broker.providedEventTypes.map((eventType) => `api:${eventType}`)
      }
    };
  }
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class KnativeEventMeshProcessor {
  constructor(catalogApi, logger, queryEntityPageLimit) {
    __publicField(this, "catalogApi");
    __publicField(this, "logger");
    __publicField(this, "queryEntityPageLimit");
    this.catalogApi = catalogApi;
    this.queryEntityPageLimit = queryEntityPageLimit != null ? queryEntityPageLimit : 1e4;
    this.logger = logger.child({
      target: this.getProcessorName()
    });
  }
  getProcessorName() {
    return "knative-event-mesh-processor";
  }
  async preProcessEntity(entity, _location, emit, _originLocation, _cache) {
    var _a;
    if (entity.kind === "API" && ((_a = entity.spec) == null ? void 0 : _a.type) === TypeKnativeEvent) {
      this.logger.debug(`Processing KnativeEventType entity ${entity.metadata.namespace}/${entity.metadata.name}`);
      if (!entity.metadata.consumedBy) {
        this.logger.debug(`No consumers defined for KnativeEventType entity ${entity.metadata.namespace}/${entity.metadata.name}`);
        return entity;
      }
      const consumers = entity.metadata.consumedBy;
      this.logger.debug(`Consumers defined for KnativeEventType entity ${entity.metadata.namespace}/${entity.metadata.name}: ${consumers.join(", ")}`);
      for (const consumedBy of consumers) {
        this.logger.debug(`Building relations for KnativeEventType entity ${entity.metadata.namespace}/${entity.metadata.name} to consumer ${consumedBy}`);
        const consumerComponents = await this.findComponentsByBackstageId(entity.metadata.namespace, consumedBy);
        this.logger.debug(`Found ${consumerComponents.length} components for KnativeEventType entity ${entity.metadata.namespace}/${entity.metadata.name} to consumer ${consumedBy}`);
        for (const component of consumerComponents) {
          this.logger.debug(`Emitting relations for KnativeEventType entity ${entity.metadata.namespace}/${entity.metadata.name} for consumer ${consumedBy} via component ${component.metadata.namespace}/${component.metadata.name}`);
          const apiToComponentRelation = {
            type: "relation",
            relation: {
              type: "apiConsumedBy",
              source: {
                kind: "API",
                namespace: entity.metadata.namespace,
                name: entity.metadata.name
              },
              target: {
                kind: "Component",
                namespace: component.metadata.namespace,
                name: component.metadata.name
              }
            }
          };
          emit(apiToComponentRelation);
          const componentToApiRelation = {
            type: "relation",
            relation: {
              type: "consumesApi",
              source: {
                kind: "Component",
                namespace: component.metadata.namespace,
                name: component.metadata.name
              },
              target: {
                kind: "API",
                namespace: entity.metadata.namespace,
                name: entity.metadata.name
              }
            }
          };
          emit(componentToApiRelation);
        }
      }
    }
    return entity;
  }
  async findComponentsByBackstageId(namespace, componentId) {
    let catalogApiCursor;
    let entities = [];
    try {
      do {
        const response = await this.catalogApi.queryEntities({
          filter: {
            kind: "component",
            "metadata.namespace": namespace,
            "metadata.annotations.backstage.io/kubernetes-id": componentId
          },
          cursor: catalogApiCursor,
          limit: this.queryEntityPageLimit
        });
        catalogApiCursor = response.pageInfo.nextCursor;
        entities = entities.concat(response.items);
      } while (catalogApiCursor);
      return entities;
    } catch (e) {
      this.logger.error(`Failed to find components by backstage id ${namespace}/${componentId}: ${e}`);
      return [];
    }
  }
}

exports.KnativeEventMeshProcessor = KnativeEventMeshProcessor;
exports.KnativeEventMeshProvider = KnativeEventMeshProvider;
//# sourceMappingURL=knativeEventMeshProcessor-b7893559.cjs.js.map
